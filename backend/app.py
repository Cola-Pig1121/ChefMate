import asyncio
import collections
import json
import logging
import os
import re
import threading
import time
import uuid
from datetime import datetime, timedelta
from typing import Optional, AsyncGenerator

import edge_tts
import numpy as np
import webrtcvad
from dotenv import load_dotenv
from faster_whisper import WhisperModel
from quart import Quart, jsonify, request, send_from_directory, Response, websocket
from quart_cors import cors
from openai import AsyncOpenAI

# --- 环境和配置 ---
load_dotenv()
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

BASE_URL_ENV = os.getenv("BASE_URL")
API_KEY_ENV = os.getenv("API_KEY")
MODEL_NAME_ENV = os.getenv("MODEL_NAME", "Qwen/Qwen3-32B")
WHISPER_MODEL_SIZE = os.getenv("WHISPER_MODEL", "base")
WHISPER_DEVICE_TYPE = os.getenv("WHISPER_DEVICE", "cpu")
SAMPLE_RATE = int(os.getenv("SAMPLE_RATE", 16000))
VAD_MODE = int(os.getenv("VAD_MODE", 3)) # 最高攻击性模式，对静音更敏感
VAD_FRAME_DURATION_MS = int(os.getenv("VAD_FRAME_DURATION_MS", 30))
VAD_PADDING_DURATION_MS = int(os.getenv("VAD_PADDING_DURATION_MS", 300))
STREAM_CHUNK_SIZE = int(os.getenv("STREAM_CHUNK_SIZE", 20))
STREAM_PUNCTUATION = "。！？；"

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WEBSITE_ROOT = os.path.join(BASE_DIR, '..')
RECIPES_DIR = os.path.join(WEBSITE_ROOT, 'recipes')
AUDIO_FOLDER = os.path.join(BASE_DIR, 'audio')
os.makedirs(AUDIO_FOLDER, exist_ok=True)
os.makedirs(RECIPES_DIR, exist_ok=True)

AUDIO_CLEANUP_INTERVAL = 300
AUDIO_MAX_AGE = 3600

# --- 类定义 ---

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

class WebRTCVAD:
    def __init__(self, mode: int = VAD_MODE, frame_duration_ms: int = VAD_FRAME_DURATION_MS,
                 padding_duration_ms: int = VAD_PADDING_DURATION_MS, sample_rate: int = SAMPLE_RATE):
        self.mode = mode
        self.frame_duration_ms = frame_duration_ms
        self.sample_rate = sample_rate
        self.vad = webrtcvad.Vad(self.mode)
        self.frame_bytes = int(2 * self.sample_rate * self.frame_duration_ms / 1000)
        num_padding_frames = int(padding_duration_ms / frame_duration_ms)
        self.ring_buffer = collections.deque(maxlen=num_padding_frames)
        self.triggered = False
        self.voiced_frames = []

    def process_frame(self, frame: bytes) -> Optional[bytes]:
        try:
            is_speech = self.vad.is_speech(frame, self.sample_rate)
        except Exception:
            return None

        if not self.triggered:
            self.ring_buffer.append((frame, is_speech))
            num_voiced = len([f for f, speech in self.ring_buffer if speech])
            if num_voiced > 0.9 * self.ring_buffer.maxlen:
                self.triggered = True
                for f, s in self.ring_buffer:
                    if s: self.voiced_frames.append(f)
                self.ring_buffer.clear()
        else:
            self.voiced_frames.append(frame)
            self.ring_buffer.append((frame, is_speech))
            num_unvoiced = len([f for f, speech in self.ring_buffer if not speech])
            if num_unvoiced > 0.9 * self.ring_buffer.maxlen:
                self.triggered = False
                voiced_audio = b''.join(self.voiced_frames)
                self.ring_buffer.clear()
                self.voiced_frames = []
                return voiced_audio
        return None

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
            if len(audio_np) < SAMPLE_RATE * 0.5: return None
            segments, _ = self.model.transcribe(audio_np, language="zh", vad_filter=True)
            return " ".join(s.text.strip() for s in segments)
        except Exception as e:
            logger.error(f"语音识别出错: {e}")
        return None

class StreamingConversationManager:
    def __init__(self):
        self.client = AsyncOpenAI(base_url=BASE_URL_ENV, api_key=API_KEY_ENV)
        self.conversation_history = []

    async def get_streaming_response(self, user_text: str, system_prompt: str) -> AsyncGenerator[str, None]:
        try:
            self.conversation_history.append({"role": "user", "content": user_text})
            if len(self.conversation_history) > 10: self.conversation_history = self.conversation_history[-8:]
            messages = [{"role": "system", "content": system_prompt}] + self.conversation_history
            stream = await self.client.chat.completions.create(
                model=MODEL_NAME_ENV, messages=messages, temperature=0.7, max_tokens=150, stream=True
            )
            full_response = ""
            async for chunk in stream:
                if chunk.choices[0].delta.content is not None:
                    content = chunk.choices[0].delta.content
                    full_response += content
                    yield content
            self.conversation_history.append({"role": "assistant", "content": full_response})
        except Exception as e:
            logger.error(f"获取流式AI回复出错: {e}")
            yield "抱歉，我现在遇到一点问题。"

class StreamingTTSManager:
    def __init__(self, audio_manager: AudioFileManager):
        self.voice = "zh-CN-XiaoxiaoNeural"
        self.audio_manager = audio_manager
        self.text_buffer = ""
        
    def _find_split_point(self, text: str) -> int:
        for punct in STREAM_PUNCTUATION:
            pos = text.find(punct)
            if pos != -1: return pos + 1
        if len(text) > STREAM_CHUNK_SIZE:
            for delimiter in ["，", " ", "\n"]:
                pos = text.rfind(delimiter, 0, STREAM_CHUNK_SIZE)
                if pos != -1: return pos + 1
            return STREAM_CHUNK_SIZE
        return -1

    async def stream_speak(self, text_stream: AsyncGenerator[str, None], session_id: str) -> AsyncGenerator[dict, None]:
        chunk_index = 0
        async for text_chunk in text_stream:
            self.text_buffer += text_chunk
            while True:
                split_point = self._find_split_point(self.text_buffer)
                if split_point == -1: break
                text_to_speak = self.text_buffer[:split_point].strip()
                self.text_buffer = self.text_buffer[split_point:].strip()
                if not text_to_speak: continue
                text_cleaned = re.sub(r'[^\u4e00-\u9fa5a-zA-Z0-9\s，。！？、；："\'（）【】《》-]', '', text_to_speak)
                if text_cleaned:
                    try:
                        filename = f"{session_id}_{chunk_index}.mp3"
                        path = os.path.join(AUDIO_FOLDER, filename)
                        communicate = edge_tts.Communicate(text_cleaned, self.voice, rate="+10%")
                        await communicate.save(path)
                        if os.path.exists(path) and os.path.getsize(path) > 0:
                            self.audio_manager.register_file(filename, session_id)
                            yield {"type": "audio", "text": text_to_speak, "audio_url": f"/audio/{filename}"}
                            chunk_index += 1
                    except Exception as e:
                        logger.error(f"流式TTS合成出错: {e}")
        if self.text_buffer.strip():
            text_cleaned = re.sub(r'[^\u4e00-\u9fa5a-zA-Z0-9\s，。！？、；："\'（）【】《》-]', '', self.text_buffer)
            if text_cleaned:
                try:
                    filename = f"{session_id}_{chunk_index}.mp3"
                    path = os.path.join(AUDIO_FOLDER, filename)
                    communicate = edge_tts.Communicate(text_cleaned, self.voice, rate="+10%")
                    await communicate.save(path)
                    if os.path.exists(path) and os.path.getsize(path) > 0:
                        self.audio_manager.register_file(filename, session_id)
                        yield {"type": "audio", "text": self.text_buffer, "audio_url": f"/audio/{filename}"}
                except Exception as e:
                    logger.error(f"流式TTS合成出错: {e}")

# --- Quart App 初始化 ---
app = Quart(__name__)
app.config["JSON_AS_ASCII"] = False
app = cors(app, allow_origin="*")

audio_manager = AudioFileManager()
transcriber = WhisperTranscriber(model_size=WHISPER_MODEL_SIZE, device=WHISPER_DEVICE_TYPE)

# --- 辅助函数：生成AI回复和TTS音频的可取消任务 ---
async def generate_ai_response_task(user_text, system_prompt):
    try:
        conversation = StreamingConversationManager()
        text_stream = conversation.get_streaming_response(user_text, system_prompt)
        
        tts_manager = StreamingTTSManager(audio_manager)
        session_id = f"stream_session_{uuid.uuid4().hex[:8]}"
        
        async for audio_chunk in tts_manager.stream_speak(text_stream, session_id):
            await websocket.send(json.dumps(audio_chunk, ensure_ascii=False))
        
        await websocket.send(json.dumps({"type": "end_of_response"}, ensure_ascii=False))
    except asyncio.CancelledError:
        logger.info("AI 响应任务被用户打断。")
    except Exception as e:
        logger.error(f"生成AI响应时出错: {e}")
        await websocket.send(json.dumps({"type": "error", "message": "AI is a little tired."}, ensure_ascii=False))

# --- WebSocket 路由 ---
@app.websocket('/ws/transcribe')
async def ws_transcribe():
    vad = WebRTCVAD(sample_rate=SAMPLE_RATE, frame_duration_ms=VAD_FRAME_DURATION_MS)
    generation_task = None
    audio_chunk_buffer = bytearray()
    system_prompt = "你是一个友好的中文烹饪助手，你的英文名为ChefMate，中文名字叫神厨助手，昵称小厨。请用简洁、自然的中文回答。" # 默认值

    try:
        while True:
            message = await websocket.receive()

            if isinstance(message, str):
                data = json.loads(message)
                if data.get("type") == "interrupt":
                    logger.info("收到客户端打断信号。")
                    if generation_task and not generation_task.done():
                        generation_task.cancel()
                        try: await generation_task
                        except asyncio.CancelledError: pass
                    generation_task = None
                elif data.get("type") == "system_prompt":
                    system_prompt = data.get("prompt", system_prompt)
                    logger.info(f"System prompt set to: {system_prompt}")
                continue

            if isinstance(message, bytes):
                audio_chunk_buffer.extend(message)
                
                # 将接收到的音频块分解成VAD需要的帧大小
                frame_size = vad.frame_bytes
                while len(audio_chunk_buffer) >= frame_size:
                    frame = audio_chunk_buffer[:frame_size]
                    audio_chunk_buffer = audio_chunk_buffer[frame_size:]
                    
                    speech_segment = vad.process_frame(frame)
                    
                    if speech_segment:
                        if generation_task and not generation_task.done():
                            logger.info("检测到新语音，打断当前AI回复。")
                            generation_task.cancel()
                            try: await generation_task
                            except asyncio.CancelledError: pass
                        
                        transcribed_text = transcriber.transcribe(speech_segment)
                        
                        if transcribed_text and transcribed_text.strip():
                            logger.info(f"Whisper 识别结果: {transcribed_text}")
                            await websocket.send(json.dumps({"type": "transcript", "text": transcribed_text}, ensure_ascii=False))
                            
                            generation_task = asyncio.create_task(
                                generate_ai_response_task(transcribed_text, system_prompt)
                            )

    except asyncio.CancelledError:
        logger.info("WebSocket 连接被客户端关闭。")
    except Exception as e:
        logger.error(f"WebSocket 处理出错: {e}")
    finally:
        if generation_task and not generation_task.done():
            generation_task.cancel()
        logger.info("客户端断开连接。")

# --- HTTP 路由 ---
@app.route('/api/recipes')
async def get_recipes():
    if not os.path.exists(RECIPES_DIR): return jsonify({'error': 'Recipes directory not found'}), 404
    recipes = []
    for filename in os.listdir(RECIPES_DIR):
        if filename.endswith('.json'):
            try:
                with open(os.path.join(RECIPES_DIR, filename), 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    recipe_name = list(data.keys())[0]
                    recipe_data = data[recipe_name]
                    recipes.append({
                        'id': os.path.splitext(filename)[0], 'name': recipe_name, 'title': recipe_data.get('title', recipe_name),
                        'category': recipe_data.get('category', ''), 'time': recipe_data.get('time', '未知'),
                        'likes': recipe_data.get('likes', 0), 'image': recipe_data.get('image', 'images/placeholder.jpg')
                    })
            except Exception as e:
                logger.error(f"读取食谱文件 {filename} 失败: {e}")
    return jsonify(recipes)

@app.route('/api/recipes/<recipe_id>')
async def get_recipe(recipe_id):
    file_path = os.path.join(RECIPES_DIR, f'{recipe_id}.json')
    if not os.path.exists(file_path): return jsonify({'error': 'Recipe not found'}), 404
    try:
        with open(file_path, 'r', encoding='utf-8') as f: return jsonify(json.load(f))
    except Exception as e:
        return jsonify({'error': f'读取食谱出错: {e}'}), 500

# --- 静态文件服务 ---
@app.route('/')
async def serve_index():
    return await send_from_directory(WEBSITE_ROOT, 'index.html')

@app.route('/<path:path>')
async def serve_static_files(path):
    if path.startswith("backend"): return "Access Denied", 403
    return await send_from_directory(WEBSITE_ROOT, path)

# --- App 生命周期 ---
@app.after_serving
async def shutdown():
    logger.info("服务器正在关闭...")
    audio_manager.stop()
    logger.info("资源清理完成。")

if __name__ == '__main__':
    if not API_KEY_ENV or not BASE_URL_ENV:
        logger.warning("环境变量 API_KEY 或 BASE_URL 未设置。")
    if not os.path.exists(os.path.join(WEBSITE_ROOT, 'index.html')):
        logger.warning(f"在 {WEBSITE_ROOT} 目录下未找到 index.html。")

    logger.info("启动 Quart 服务器...")
    app.run(host='0.0.0.0', port=5000, use_reloader=False)