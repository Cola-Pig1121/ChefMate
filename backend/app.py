import asyncio
import json
import logging
import os
import queue
import re
import threading
import time
import uuid
from datetime import datetime, timedelta
from typing import Optional

import edge_tts
import numpy as np
import pyaudio
from dotenv import load_dotenv
from faster_whisper import WhisperModel
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from openai import OpenAI

load_dotenv()
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

BASE_URL_ENV = os.getenv("BASE_URL")
API_KEY_ENV = os.getenv("API_KEY")
MODEL_NAME_ENV = os.getenv("MODEL_NAME", "Qwen/Qwen3-32B")
WHISPER_MODEL_SIZE = os.getenv("WHISPER_MODEL", "base")
WHISPER_DEVICE_TYPE = os.getenv("WHISPER_DEVICE", "cpu")
SAMPLE_RATE = int(os.getenv("SAMPLE_RATE", 16000))
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", 1024))
VOLUME_THRESHOLD = int(os.getenv("VOLUME_THRESHOLD", 500))
SILENCE_DURATION = 2.0
MIN_AUDIO_LENGTH = 1.0

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WEBSITE_ROOT = os.path.join(BASE_DIR, '..')
RECIPES_DIR = os.path.join(WEBSITE_ROOT, 'recipes')
AUDIO_FOLDER = os.path.join(BASE_DIR, 'audio')
os.makedirs(AUDIO_FOLDER, exist_ok=True)
os.makedirs(RECIPES_DIR, exist_ok=True)

AUDIO_CLEANUP_INTERVAL = 300
AUDIO_MAX_AGE = 3600

class AudioFileManager:
    def __init__(self):
        self.session_files = {}
        self.file_timestamps = {}
        self.running = True
        self.cleanup_thread = threading.Thread(target=self._cleanup_loop, daemon=True)
        self.cleanup_thread.start()

    def _cleanup_loop(self):
        while self.running:
            time.sleep(AUDIO_CLEANUP_INTERVAL)
            self.cleanup_old_files()

    def register_file(self, filename: str, session_id: str):
        if session_id not in self.session_files:
            self.session_files[session_id] = set()
        self.session_files[session_id].add(filename)
        self.file_timestamps[filename] = datetime.now()

    def cleanup_session(self, session_id: str):
        files_to_delete = self.session_files.pop(session_id, set())
        deleted_count = sum(1 for f in files_to_delete if self.delete_file(f))
        if deleted_count > 0:
            logger.info(f"会话 {session_id} 结束，清理了 {deleted_count} 个音频文件。")

    def delete_file(self, filename: str) -> bool:
        try:
            audio_path = os.path.join(AUDIO_FOLDER, filename)
            if os.path.exists(audio_path):
                os.remove(audio_path)
                self.file_timestamps.pop(filename, None)
                for session_id in self.session_files:
                    self.session_files[session_id].discard(filename)
                return True
        except Exception as e:
            logger.error(f"删除文件 {filename} 失败: {e}")
        return False

    def cleanup_old_files(self):
        now = datetime.now()
        expired_files = [
            f for f, ts in self.file_timestamps.items()
            if now - ts > timedelta(seconds=AUDIO_MAX_AGE)
        ]
        deleted_count = sum(1 for f in expired_files if self.delete_file(f))
        if deleted_count > 0:
            logger.info(f"后台任务清理了 {deleted_count} 个过期音频文件。")

    def stop(self):
        self.running = False
        if self.cleanup_thread:
            self.cleanup_thread.join(timeout=5)

class SimpleVAD:
    def __init__(self, threshold: int = VOLUME_THRESHOLD):
        self.threshold = threshold

    def is_speech(self, audio_data: bytes) -> bool:
        audio_np = np.frombuffer(audio_data, dtype=np.int16)
        rms = np.sqrt(np.mean(audio_np.astype(float) ** 2))
        return rms > self.threshold

class AudioRecorder:
    def __init__(self):
        self.audio = pyaudio.PyAudio()
        self.vad = SimpleVAD()
        self.stream = None
        self.audio_queue = queue.Queue()
        self.is_recording_allowed = True
        self._is_running = False

    def start(self):
        if self._is_running:
            return
        self._is_running = True
        try:
            self.stream = self.audio.open(
                format=pyaudio.paInt16,
                channels=1,
                rate=SAMPLE_RATE,
                input=True,
                frames_per_buffer=CHUNK_SIZE,
                stream_callback=self._audio_callback,
            )
            self.stream.start_stream()
        except Exception as e:
            logger.error(f"无法打开麦克风: {e}")
            self._is_running = False

    def stop(self):
        if not self._is_running:
            return
        self._is_running = False
        if self.stream:
            self.stream.stop_stream()
            self.stream.close()
            self.stream = None

    def _audio_callback(self, in_data, frame_count, time_info, status):
        if self.is_recording_allowed and self._is_running:
            self.audio_queue.put(in_data)
        return (None, pyaudio.paContinue)

    def get_data(self) -> Optional[bytes]:
        try:
            return self.audio_queue.get_nowait()
        except queue.Empty:
            return None

    def set_recording_allowed(self, allowed: bool):
        self.is_recording_allowed = allowed

    def cleanup(self):
        self.stop()
        self.audio.terminate()

class WhisperTranscriber:
    def __init__(self, model_size: str, device: str):
        logger.info(f"正在加载 Whisper 模型: {model_size} (设备: {device})")
        try:
            compute_type = "int8" if device == "cpu" else "float16"
            self.model = WhisperModel(model_size, device=device, compute_type=compute_type)
        except Exception as e:
            logger.error(f"Whisper 模型加载失败: {e}")
            raise

    def transcribe(self, audio_data: bytes) -> Optional[str]:
        try:
            audio_np = np.frombuffer(audio_data, dtype=np.int16).astype(np.float32) / 32768.0
            if len(audio_np) < SAMPLE_RATE * 0.5:
                return None

            segments, _ = self.model.transcribe(audio_np, language="zh", vad_filter=True)
            text = " ".join(s.text.strip() for s in segments)
            return text
        except Exception as e:
            logger.error(f"语音识别出错: {e}")
        return None

class ConversationManager:
    def __init__(self):
        self.client = OpenAI(base_url=BASE_URL_ENV, api_key=API_KEY_ENV)
        self.conversation_history = []

    def get_response(self, user_text: str, system_prompt: str) -> str:
        try:
            self.conversation_history.append({"role": "user", "content": user_text})
            if len(self.conversation_history) > 10:
                self.conversation_history = self.conversation_history[-8:]

            messages = [{"role": "system", "content": system_prompt}] + self.conversation_history

            extra_body = {"enable_thinking": False}

            response = self.client.chat.completions.create(
                model=MODEL_NAME_ENV,
                messages=messages,
                temperature=0.7,
                max_tokens=150,
                extra_body=extra_body
            )
            answer = response.choices[0].message.content.strip()
            self.conversation_history.append({"role": "assistant", "content": answer})
            return answer
        except Exception as e:
            logger.error(f"获取AI回复出错: {e}")
            return "抱歉，我现在遇到一点问题，稍后再试吧。"

class TTSManager:
    def __init__(self, audio_manager: AudioFileManager):
        self.voice = "zh-CN-XiaoxiaoNeural"
        self.audio_manager = audio_manager

    async def speak(self, text: str, session_id: str) -> Optional[str]:
        try:
            filename = f"{uuid.uuid4().hex}.mp3"
            path = os.path.join(AUDIO_FOLDER, filename)
            communicate = edge_tts.Communicate(text, self.voice, rate="+10%")
            await communicate.save(path)

            if os.path.exists(path) and os.path.getsize(path) > 0:
                self.audio_manager.register_file(filename, session_id)
                return filename
        except Exception as e:
            logger.error(f"TTS合成出错: {e}")
        return None

app = Flask(__name__)
app.config["JSON_AS_ASCII"] = False
CORS(app)

audio_manager = AudioFileManager()

@app.route('/api/recipes')
def get_recipes():
    if not os.path.exists(RECIPES_DIR):
        return jsonify({'error': 'Recipes directory not found'}), 404

    recipes = []
    for filename in os.listdir(RECIPES_DIR):
        if filename.endswith('.json'):
            try:
                with open(os.path.join(RECIPES_DIR, filename), 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    recipe_name = list(data.keys())[0]
                    recipe_data = data[recipe_name]
                    recipes.append({
                        'id': os.path.splitext(filename)[0],
                        'name': recipe_name,
                        'title': recipe_data.get('title', recipe_name),
                        'category': recipe_data.get('category', ''),
                        'time': recipe_data.get('time', '未知'),
                        'likes': recipe_data.get('likes', 0),
                        'image': recipe_data.get('image', 'images/placeholder.jpg')
                    })
            except Exception as e:
                logger.error(f"读取食谱文件 {filename} 失败: {e}")
    return jsonify(recipes)

@app.route('/api/recipes/<recipe_id>')
def get_recipe(recipe_id):
    file_path = os.path.join(RECIPES_DIR, f'{recipe_id}.json')
    if not os.path.exists(file_path):
        return jsonify({'error': 'Recipe not found'}), 404
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return jsonify(json.load(f))
    except Exception as e:
        return jsonify({'error': f'读取食谱出错: {e}'}), 500

@app.route("/api/ask", methods=["POST"])
def ask():
    try:
        data = request.json
        user_text = data.get("userText")
        if not user_text:
            return jsonify({"error": "userText is required"}), 400

        system_prompt = data.get("systemContent", "你是一个友好的AI助手。请用简洁、自然的中文回答，就像日常聊天一样。")
        temp_conversation = ConversationManager()
        answer = temp_conversation.get_response(user_text, system_prompt)
        answer_cleaned = re.sub(r'[^\u4e00-\u9fa5a-zA-Z0-9\s，。！？、；:"\'（）【】《》-]', '', answer)

        session_id = f"api_session_{uuid.uuid4().hex[:8]}"
        tts_manager = TTSManager(audio_manager)
        audio_filename = asyncio.run(tts_manager.speak(answer_cleaned, session_id))

        audio_url = f"/audio/{audio_filename}" if audio_filename else None
        return jsonify({"answer": answer, "audio_url": audio_url})
    except Exception as e:
        logger.error(f"API /api/ask 出错: {e}")
        return jsonify({"error": f"Internal Server Error: {str(e)}"}), 500

@app.route("/audio/<filename>")
def serve_audio_file(filename):
    return send_from_directory(AUDIO_FOLDER, filename, mimetype="audio/mpeg")

@app.route("/api/delete_audio/<filename>", methods=["DELETE"])
def delete_audio(filename):
    if audio_manager.delete_file(filename):
        return jsonify({"success": True})
    else:
        return jsonify({"error": "File not found"}), 404

@app.route('/')
def serve_index():
    return send_from_directory(WEBSITE_ROOT, 'index.html')

@app.route('/<path:path>')
def serve_static_files(path):
    if path.startswith("backend"):
        return "Access Denied", 403
    return send_from_directory(WEBSITE_ROOT, path)

if __name__ == '__main__':
    if not API_KEY_ENV or not BASE_URL_ENV:
        logger.warning("环境变量 API_KEY 或 BASE_URL 未设置，AI对话功能可能无法使用。")
    if not os.path.exists(os.path.join(WEBSITE_ROOT, 'index.html')):
        logger.warning(f"在 {WEBSITE_ROOT} 目录下未找到 index.html，网站可能无法访问。")

    try:
        logger.info("启动 Flask + SocketIO 服务器...")
        app.run(debug=True, host='0.0.0.0', port=5000, use_reloader=False)
    except KeyboardInterrupt:
        logger.info("服务器正在关闭...")
    except Exception as e:
        logger.error(f"服务器启动失败: {e}")
    finally:
        audio_manager.stop()
        logger.info("资源清理完成，服务器已关闭。")