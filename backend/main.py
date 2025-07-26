import asyncio
import json
import logging
import os
import queue
import threading
import time
import uuid
import wave
from typing import Optional, List, Set
from datetime import datetime, timedelta

import numpy as np
import pyaudio
from faster_whisper import WhisperModel
from openai import OpenAI
import edge_tts
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from dotenv import load_dotenv
import re

# 加载环境变量
load_dotenv()

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 音频配置
SAMPLE_RATE = 16000
CHUNK_SIZE = 1024
CHANNELS = 1
FORMAT = pyaudio.paInt16

# 音量检测配置
VOLUME_THRESHOLD = 500  # 音量阈值，可调整
SILENCE_DURATION = 2.0  # 静音持续时间（秒）
MIN_AUDIO_LENGTH = 1.0  # 最小音频长度（秒）

# 目录设置
AUDIO_FOLDER = "audio"
os.makedirs(AUDIO_FOLDER, exist_ok=True)

# 音频清理配置
AUDIO_CLEANUP_INTERVAL = 300  # 5分钟清理一次
AUDIO_MAX_AGE = 3600  # 音频文件最大保存1小时


class AudioFileManager:
    """音频文件管理器 - 负责跟踪和清理音频文件"""
    
    def __init__(self):
        self.session_files = {}  # session_id -> set of filenames
        self.file_timestamps = {}  # filename -> creation_time
        self.cleanup_thread = None
        self.running = True
        self.start_cleanup_thread()
    
    def start_cleanup_thread(self):
        """启动清理线程"""
        self.cleanup_thread = threading.Thread(target=self._cleanup_loop, daemon=True)
        self.cleanup_thread.start()
        logger.info("音频清理线程已启动")
    
    def _cleanup_loop(self):
        """清理循环"""
        while self.running:
            try:
                self.cleanup_old_files()
                time.sleep(AUDIO_CLEANUP_INTERVAL)
            except Exception as e:
                logger.error(f"音频清理错误: {e}")
                time.sleep(60)  # 出错时等待1分钟再试
    
    def register_file(self, filename: str, session_id: str = "default"):
        """注册音频文件"""
        if session_id not in self.session_files:
            self.session_files[session_id] = set()
        
        self.session_files[session_id].add(filename)
        self.file_timestamps[filename] = datetime.now()
        logger.debug(f"注册音频文件: {filename} (会话: {session_id})")
    
    def cleanup_session(self, session_id: str):
        """清理指定会话的所有音频文件"""
        if session_id not in self.session_files:
            return
        
        files_to_delete = self.session_files[session_id].copy()
        deleted_count = 0
        
        for filename in files_to_delete:
            if self.delete_file(filename):
                deleted_count += 1
        
        # 清理会话记录
        del self.session_files[session_id]
        logger.info(f"会话 {session_id} 结束，删除了 {deleted_count} 个音频文件")
    
    def delete_file(self, filename: str) -> bool:
        """删除单个音频文件"""
        try:
            audio_path = os.path.join(AUDIO_FOLDER, filename)
            if os.path.exists(audio_path):
                os.remove(audio_path)
                
                # 从记录中移除
                if filename in self.file_timestamps:
                    del self.file_timestamps[filename]
                
                # 从所有会话中移除
                for session_files in self.session_files.values():
                    session_files.discard(filename)
                
                logger.debug(f"删除音频文件: {filename}")
                return True
            return False
        except Exception as e:
            logger.error(f"删除音频文件失败 {filename}: {e}")
            return False
    
    def cleanup_old_files(self):
        """清理过期的音频文件"""
        current_time = datetime.now()
        files_to_delete = []
        
        for filename, timestamp in self.file_timestamps.items():
            if current_time - timestamp > timedelta(seconds=AUDIO_MAX_AGE):
                files_to_delete.append(filename)
        
        deleted_count = 0
        for filename in files_to_delete:
            if self.delete_file(filename):
                deleted_count += 1
        
        if deleted_count > 0:
            logger.info(f"清理了 {deleted_count} 个过期音频文件")
    
    def get_session_file_count(self, session_id: str) -> int:
        """获取会话的音频文件数量"""
        return len(self.session_files.get(session_id, set()))
    
    def stop(self):
        """停止管理器"""
        self.running = False
        if self.cleanup_thread:
            self.cleanup_thread.join(timeout=5)


class SimpleVAD:
    """简单的音量检测VAD"""

    def __init__(self, threshold: int = VOLUME_THRESHOLD):
        self.threshold = threshold

    def is_speech(self, audio_data: bytes) -> bool:
        """基于音量检测是否有语音"""
        # 将字节转换为numpy数组
        audio_np = np.frombuffer(audio_data, dtype=np.int16)
        # 计算RMS音量
        rms = np.sqrt(np.mean(audio_np**2))
        return rms > self.threshold


class AudioRecorder:
    """音频录制器"""

    def __init__(self):
        self.audio = pyaudio.PyAudio()
        self.vad = SimpleVAD()
        self.recording = False
        self.stream = None
        self.audio_queue = queue.Queue()
        self.is_recording_allowed = True

    def start_recording(self):
        """开始录音"""
        if self.recording:
            return

        self.recording = True
        try:
            self.stream = self.audio.open(
                format=FORMAT,
                channels=CHANNELS,
                rate=SAMPLE_RATE,
                input=True,
                frames_per_buffer=CHUNK_SIZE,
                stream_callback=self._audio_callback,
            )
            self.stream.start_stream()
            logger.info("开始录音")
        except Exception as e:
            logger.error(f"录音启动失败: {e}")
            self.recording = False

    def stop_recording(self):
        """停止录音"""
        if not self.recording:
            return

        self.recording = False
        if self.stream:
            self.stream.stop_stream()
            self.stream.close()
            self.stream = None
        logger.info("停止录音")

    def _audio_callback(self, in_data, frame_count, time_info, status):
        """音频流回调"""
        if self.is_recording_allowed and self.recording:
            self.audio_queue.put(in_data)
        return (None, pyaudio.paContinue)

    def get_audio_data(self) -> Optional[bytes]:
        """获取音频数据"""
        try:
            return self.audio_queue.get_nowait()
        except queue.Empty:
            return None

    def set_recording_allowed(self, allowed: bool):
        """设置是否允许录音"""
        self.is_recording_allowed = allowed
        logger.info(f"录音{'启用' if allowed else '禁用'}")

    def cleanup(self):
        """清理资源"""
        self.stop_recording()
        self.audio.terminate()


class WhisperTranscriber:
    """Whisper语音识别器"""

    def __init__(self, model_size: str = "base", device: str = "cpu"):
        logger.info(f"加载Whisper模型: {model_size} 在 {device}")
        try:
            self.model = WhisperModel(
                model_size,
                device=device,
                compute_type="int8" if device == "cpu" else "float16",
            )
            logger.info("Whisper模型加载成功")
        except Exception as e:
            logger.error(f"Whisper模型加载失败: {e}")
            raise

    def transcribe_audio(self, audio_data: bytes) -> Optional[str]:
        """转录音频为文字"""
        try:
            # 转换为numpy数组
            audio_np = (
                np.frombuffer(audio_data, dtype=np.int16).astype(np.float32) / 32768.0
            )

            # 检查音频长度
            if len(audio_np) < SAMPLE_RATE * 0.5:  # 少于0.5秒
                return None

            # 使用Whisper转录
            segments, info = self.model.transcribe(
                audio_np,
                language="zh",  # 中文
                vad_filter=True,  # 使用内置VAD
                vad_parameters=dict(min_silence_duration_ms=500, speech_pad_ms=400),
            )

            # 合并所有片段
            text = " ".join([segment.text.strip() for segment in segments])

            if text.strip():
                logger.info(f"识别结果: {text}")
                return text.strip()
            return None

        except Exception as e:
            logger.error(f"语音识别错误: {e}")
            return None


class ConversationManager:
    """对话管理器"""

    def __init__(self):
        self.client = OpenAI(
            base_url=os.getenv("BASE_URL"), api_key=os.getenv("API_KEY")
        )
        self.conversation_history = []
        self.system_prompt = """你是一个友好的AI助手。
请用简洁、自然的中文回答，就像日常聊天一样。
回答要简短但有用，不要太正式。"""

    def get_response(self, user_text: str) -> str:
        """获取AI回复"""
        try:
            # 添加用户消息
            self.conversation_history.append({"role": "user", "content": user_text})

            # 保持对话历史在合理范围内
            if len(self.conversation_history) > 10:
                self.conversation_history = self.conversation_history[-8:]
            messages = [
                {"role": "system", "content": self.system_prompt}
            ] + self.conversation_history

            response = self.client.chat.completions.create(
                model="Qwen/Qwen3-Coder-480B-A35B-Instruct",
                messages=messages,
                temperature=0.7,
                max_tokens=150,
            )

            answer = response.choices[0].message.content.strip()

            # 添加AI回复到历史
            self.conversation_history.append({"role": "assistant", "content": answer})

            logger.info(f"AI回复: {answer}")
            return answer

        except Exception as e:
            logger.error(f"对话错误: {e}")
            return "抱歉，我现在无法回答您的问题。"


class TTSManager:
    """语音合成管理器"""

    def __init__(self, audio_manager: AudioFileManager):
        self.voice = "zh-CN-XiaoxiaoNeural"  # 中文女声
        self.audio_manager = audio_manager

    async def text_to_speech(self, text: str, session_id: str = "default") -> Optional[str]:
        """文字转语音"""
        try:
            audio_filename = f"{uuid.uuid4().hex}.mp3"
            audio_path = os.path.join(AUDIO_FOLDER, audio_filename)

            # 使用edge-tts生成语音
            tts = edge_tts.Communicate(
                text=text, voice=self.voice, rate="+10%", volume="+0%"  # 稍快一点
            )
            await tts.save(audio_path)

            if os.path.exists(audio_path) and os.path.getsize(audio_path) > 0:
                # 注册到音频管理器
                self.audio_manager.register_file(audio_filename, session_id)
                logger.info(f"语音合成完成: {audio_filename}")
                return audio_filename
            return None

        except Exception as e:
            logger.error(f"语音合成错误: {e}")
            return None


class VoiceConversationSystem:
    """语音对话系统主类"""

    def __init__(self, audio_manager: AudioFileManager):
        self.recorder = AudioRecorder()
        self.transcriber = WhisperTranscriber()
        self.conversation = ConversationManager()
        self.tts = TTSManager(audio_manager)
        self.audio_manager = audio_manager
        self.socketio = None

        # 状态管理
        self.is_listening = False
        self.is_ai_speaking = False
        self.current_session_id = None

    def set_socketio(self, socketio):
        """设置SocketIO实例"""
        self.socketio = socketio

    def start_listening(self):
        """开始监听"""
        if self.is_listening:
            return

        self.is_listening = True
        # 创建新的会话ID
        self.current_session_id = f"voice_session_{uuid.uuid4().hex[:8]}"
        self.recorder.start_recording()

        # 启动音频处理线程
        threading.Thread(target=self._audio_processing_loop, daemon=True).start()

        if self.socketio:
            self.socketio.emit("status", {"listening": True, "session_id": self.current_session_id})
        logger.info(f"开始语音对话 (会话: {self.current_session_id})")

    def stop_listening(self):
        """停止监听"""
        self.is_listening = False
        self.recorder.stop_recording()

        # 清理当前会话的音频文件
        if self.current_session_id:
            self.audio_manager.cleanup_session(self.current_session_id)
            session_id = self.current_session_id
            self.current_session_id = None
        else:
            session_id = "unknown"

        if self.socketio:
            self.socketio.emit("status", {"listening": False})
        logger.info(f"停止语音对话 (会话: {session_id})")

    def _audio_processing_loop(self):
        """音频处理循环"""
        speech_frames = []
        silence_count = 0
        speech_detected = False
        max_silence = int(SILENCE_DURATION * SAMPLE_RATE / CHUNK_SIZE)

        while self.is_listening:
            audio_data = self.recorder.get_audio_data()
            if not audio_data:
                time.sleep(0.01)
                continue

            # 检测是否有语音
            is_speech = self.recorder.vad.is_speech(audio_data)

            if is_speech:
                speech_frames.append(audio_data)
                silence_count = 0
                if not speech_detected:
                    speech_detected = True
                    if self.socketio:
                        self.socketio.emit("speech_start")
                    logger.info("检测到语音")
            else:
                silence_count += 1
                if speech_detected:
                    speech_frames.append(audio_data)  # 包含一些静音

            # 处理累积的语音
            if speech_detected and silence_count > max_silence:
                min_frames = int(MIN_AUDIO_LENGTH * SAMPLE_RATE / CHUNK_SIZE)
                if len(speech_frames) > min_frames:
                    audio_buffer = b"".join(speech_frames)
                    # 异步处理语音
                    threading.Thread(
                        target=self._process_speech, args=(audio_buffer,), daemon=True
                    ).start()

                # 重置状态
                speech_frames = []
                silence_count = 0
                speech_detected = False
                if self.socketio:
                    self.socketio.emit("speech_end")

    def _process_speech(self, audio_data: bytes):
        """处理语音数据"""
        try:
            # 语音转文字
            text = self.transcriber.transcribe_audio(audio_data)
            if not text:
                return

            if self.socketio:
                self.socketio.emit("transcription", {"text": text})

            # 获取AI回复
            response = self.conversation.get_response(text)
            if self.socketio:
                self.socketio.emit("ai_response", {"text": response})

            # 转换为语音并播放
            asyncio.run(self._handle_ai_speech(response))

        except Exception as e:
            logger.error(f"语音处理错误: {e}")

    async def _handle_ai_speech(self, text: str):
        """处理AI语音播放"""
        try:
            # AI说话前1秒禁用录音
            self.recorder.set_recording_allowed(False)
            await asyncio.sleep(1.0)

            self.is_ai_speaking = True
            if self.socketio:
                self.socketio.emit("ai_speaking", {"speaking": True})

            # 生成语音
            audio_filename = await self.tts.text_to_speech(text, self.current_session_id or "default")
            if audio_filename:
                if self.socketio:
                    self.socketio.emit("play_audio", {"filename": audio_filename})

                # 估算播放时间
                speech_duration = len(text) * 0.08  # 大约每字80ms
                await asyncio.sleep(max(speech_duration, 2.0))

            self.is_ai_speaking = False
            if self.socketio:
                self.socketio.emit("ai_speaking", {"speaking": False})

            # AI说话后1秒恢复录音
            await asyncio.sleep(1.0)
            self.recorder.set_recording_allowed(True)

        except Exception as e:
            logger.error(f"AI语音处理错误: {e}")
            self.is_ai_speaking = False
            self.recorder.set_recording_allowed(True)

    def cleanup(self):
        """清理资源"""
        self.stop_listening()
        self.recorder.cleanup()


# Flask应用设置
app = Flask(__name__)
app.config["SECRET_KEY"] = "voice-chat-secret-key"
app.config["JSON_AS_ASCII"] = False
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# 全局实例
audio_manager = AudioFileManager()
voice_system = VoiceConversationSystem(audio_manager)
voice_system.set_socketio(socketio)


@app.route("/")
def index():
    return jsonify({"status": "ok", "message": "语音对话API运行中"})


@app.route("/api/ask", methods=["POST"])
def ask():
    """兼容原有的文本对话接口"""
    try:
        data = request.json
        user_text = data.get("userText")
        system_content = data.get("systemContent")
        is_initial = data.get("is_initial", False)

        if not user_text or (not is_initial and not system_content):
            return jsonify({"error": "Missing required parameters"}), 400

        if is_initial:
            answer = user_text
        else:
            # 使用对话管理器获取回复
            temp_conversation = ConversationManager()
            temp_conversation.system_prompt = system_content
            answer = temp_conversation.get_response(user_text)

        # 清理文本（移除特殊字符）
        import re

        answer = re.sub(
            r"[^\u4e00-\u9fa5a-zA-Z0-9\s，。！？、；：" "''（）【】《》\-]", "", answer
        )

        # 生成语音文件
        audio_filename = f"{uuid.uuid4().hex}.mp3"
        audio_path = os.path.join(AUDIO_FOLDER, audio_filename)

        # 使用TTS管理器生成语音
        session_id = f"api_session_{uuid.uuid4().hex[:8]}"
        tts_manager = TTSManager(audio_manager)
        tts_success = asyncio.run(tts_manager.text_to_speech(answer, session_id))

        if tts_success:
            audio_url = f"/audio/{tts_success}"
        else:
            audio_url = None
            logger.warning("TTS生成失败，返回纯文本响应")

        return jsonify({"answer": answer, "audio_url": audio_url})

    except Exception as e:
        logger.error(f"API错误: {e}")
        import traceback

        traceback.print_exc()
        return jsonify({"error": f"内部服务器错误: {str(e)}"}), 500


@app.route("/audio/<filename>")
def serve_audio(filename):
    """提供音频文件"""
    try:
        return send_file(os.path.join(AUDIO_FOLDER, filename), mimetype="audio/mpeg")
    except Exception as e:
        logger.error(f"音频文件服务错误: {e}")
        return jsonify({"error": "音频文件不存在"}), 404


@app.route("/api/delete_audio/<filename>", methods=["DELETE"])
def delete_audio(filename):
    """删除音频文件"""
    try:
        if audio_manager.delete_file(filename):
            return jsonify({"message": "音频已删除"}), 200
        else:
            return jsonify({"error": "文件不存在"}), 404
    except Exception as e:
        logger.error(f"删除音频错误: {e}")
        return jsonify({"error": "删除失败"}), 500

@app.route("/api/cleanup_session/<session_id>", methods=["POST"])
def cleanup_session(session_id):
    """清理指定会话的所有音频文件"""
    try:
        audio_manager.cleanup_session(session_id)
        return jsonify({"message": f"会话 {session_id} 的音频文件已清理"}), 200
    except Exception as e:
        logger.error(f"清理会话错误: {e}")
        return jsonify({"error": "清理失败"}), 500

@app.route("/api/audio_stats", methods=["GET"])
def audio_stats():
    """获取音频文件统计信息"""
    try:
        total_files = len(audio_manager.file_timestamps)
        sessions = len(audio_manager.session_files)
        
        # 计算总文件大小
        total_size = 0
        for filename in audio_manager.file_timestamps.keys():
            audio_path = os.path.join(AUDIO_FOLDER, filename)
            if os.path.exists(audio_path):
                total_size += os.path.getsize(audio_path)
        
        return jsonify({
            "total_files": total_files,
            "active_sessions": sessions,
            "total_size_mb": round(total_size / (1024 * 1024), 2),
            "cleanup_interval": AUDIO_CLEANUP_INTERVAL,
            "max_age_hours": AUDIO_MAX_AGE / 3600
        }), 200
    except Exception as e:
        logger.error(f"获取音频统计错误: {e}")
        return jsonify({"error": "获取统计失败"}), 500


@socketio.on("start_conversation")
def handle_start_conversation():
    """开始对话"""
    voice_system.start_listening()
    emit("status", {"listening": True})


@socketio.on("stop_conversation")
def handle_stop_conversation():
    """停止对话"""
    voice_system.stop_listening()
    emit("status", {"listening": False})


@socketio.on("connect")
def handle_connect():
    """客户端连接"""
    logger.info("客户端已连接")
    emit("status", {"connected": True})


@socketio.on("disconnect")
def handle_disconnect():
    """客户端断开"""
    logger.info("客户端已断开")
    # 客户端断开时自动停止对话并清理音频
    if voice_system.is_listening:
        voice_system.stop_listening()

@socketio.on("end_session")
def handle_end_session(data):
    """手动结束会话"""
    session_id = data.get("session_id") if data else None
    if session_id:
        audio_manager.cleanup_session(session_id)
        emit("session_ended", {"session_id": session_id})
        logger.info(f"手动结束会话: {session_id}")
    else:
        # 结束当前语音会话
        if voice_system.is_listening:
            voice_system.stop_listening()
        emit("session_ended", {"message": "当前会话已结束"})


if __name__ == "__main__":
    try:
        logger.info("启动语音对话系统...")
        # 检查环境变量
        if not os.getenv("API_KEY"):
            logger.warning("警告: 未设置API_KEY环境变量")

        socketio.run(app, debug=True, host="0.0.0.0", port=5000)
    except KeyboardInterrupt:
        logger.info("正在关闭...")
    finally:
        voice_system.cleanup()
        audio_manager.stop()
