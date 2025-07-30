import asyncio
import collections
import json
import logging
import os
import queue
import re
import threading
import time
import uuid
from datetime import datetime, timedelta
from typing import Optional, Generator, AsyncGenerator

import edge_tts
import numpy as np
import pyaudio
import webrtcvad
from dotenv import load_dotenv
from faster_whisper import WhisperModel
from quart import Quart, jsonify, request, send_from_directory, Response
from quart_cors import cors

# --- Environment and Configuration (Unchanged) ---
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
VAD_MODE = int(os.getenv("VAD_MODE", 2))
VAD_FRAME_DURATION_MS = int(os.getenv("VAD_FRAME_DURATION_MS", 30))
VAD_PADDING_DURATION_MS = int(os.getenv("VAD_PADDING_DURATION_MS", 300))
SILENCE_DURATION = 2.0
MIN_AUDIO_LENGTH = 1.0
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

# --- All Classes (AudioFileManager, WebRTCVAD, AudioRecorder, etc.) remain unchanged ---
# They are omitted here for brevity but should be included in your file exactly as they were.
# The following classes are included as they contain async methods relevant to the Quart migration.

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

class StreamingConversationManager:
    """支持流式响应的对话管理器"""
    def __init__(self):
        # NOTE: For Quart, it's better to use an async-native OpenAI client library if available,
        # but the standard library works fine in async contexts.
        from openai import AsyncOpenAI
        self.client = AsyncOpenAI(base_url=BASE_URL_ENV, api_key=API_KEY_ENV)
        self.conversation_history = []

    async def get_streaming_response(self, user_text: str, system_prompt: str) -> AsyncGenerator[str, None]:
        """获取流式AI响应 (Now a proper async generator)"""
        try:
            self.conversation_history.append({"role": "user", "content": user_text})
            if len(self.conversation_history) > 10:
                self.conversation_history = self.conversation_history[-8:]

            messages = [{"role": "system", "content": system_prompt}] + self.conversation_history
            extra_body = {"enable_thinking": False}

            stream = await self.client.chat.completions.create(
                model=MODEL_NAME_ENV,
                messages=messages,
                temperature=0.7,
                max_tokens=150,
                stream=True,
                extra_body=extra_body
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
            yield "抱歉，我现在遇到一点问题，稍后再试吧。"

class StreamingTTSManager:
    """支持流式语音合成的TTS管理器"""
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
        """流式转换文字为语音"""
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
                            yield {
                                "type": "audio",
                                "text": text_to_speak,
                                "audio_url": f"/audio/{filename}",
                                "chunk_index": chunk_index
                            }
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
                        yield {
                            "type": "audio",
                            "text": self.text_buffer,
                            "audio_url": f"/audio/{filename}",
                            "chunk_index": chunk_index
                        }
                except Exception as e:
                    logger.error(f"流式TTS合成出错: {e}")

class ConversationManager:
    def __init__(self):
        from openai import AsyncOpenAI
        self.client = AsyncOpenAI(base_url=BASE_URL_ENV, api_key=API_KEY_ENV)
        self.conversation_history = []

    async def get_response(self, user_text: str, system_prompt: str) -> str:
        try:
            self.conversation_history.append({"role": "user", "content": user_text})
            if len(self.conversation_history) > 10:
                self.conversation_history = self.conversation_history[-8:]

            messages = [{"role": "system", "content": system_prompt}] + self.conversation_history
            extra_body = {"enable_thinking": False}

            response = await self.client.chat.completions.create(
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

# --- Quart App Initialization ---
app = Quart(__name__)
app.config["JSON_AS_ASCII"] = False
app = cors(app, allow_origin="*") # Use quart-cors

audio_manager = AudioFileManager()

# --- API Routes (Refactored for Quart) ---

@app.route('/api/recipes')
async def get_recipes():
    if not os.path.exists(RECIPES_DIR):
        return jsonify({'error': 'Recipes directory not found'}), 404
    # ... (rest of the function is file I/O, can remain synchronous)
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
async def get_recipe(recipe_id):
    file_path = os.path.join(RECIPES_DIR, f'{recipe_id}.json')
    if not os.path.exists(file_path):
        return jsonify({'error': 'Recipe not found'}), 404
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return jsonify(json.load(f))
    except Exception as e:
        return jsonify({'error': f'读取食谱出错: {e}'}), 500

@app.route("/api/ask", methods=["POST"])
async def ask():
    try:
        data = await request.get_json()
        user_text = data.get("userText")
        if not user_text:
            return jsonify({"error": "userText is required"}), 400

        system_prompt = data.get("systemContent", "你是一个友好的AI助手。请用简洁、自然的中文回答，就像日常聊天一样。")
        temp_conversation = ConversationManager()
        answer = await temp_conversation.get_response(user_text, system_prompt)
        answer_cleaned = re.sub(r'[^\u4e00-\u9fa5a-zA-Z0-9\s，。！？、；："\'（）【】《》-]', '', answer)

        session_id = f"api_session_{uuid.uuid4().hex[:8]}"
        tts_manager = TTSManager(audio_manager)
        # FIX: Replaced asyncio.run() with await
        audio_filename = await tts_manager.speak(answer_cleaned, session_id)

        audio_url = f"/audio/{audio_filename}" if audio_filename else None
        return jsonify({"answer": answer, "audio_url": audio_url})
    except Exception as e:
        logger.error(f"API /api/ask 出错: {e}")
        return jsonify({"error": f"Internal Server Error: {str(e)}"}), 500

@app.route("/api/ask/stream", methods=["POST"])
async def ask_stream():
    """
    FIX: This is the fully corrected and simplified streaming endpoint using Quart.
    The original error is resolved by making this an async generator directly.
    """
    try:
        data = await request.get_json()
        user_text = data.get("userText")
        if not user_text:
            return jsonify({"error": "userText is required"}), 400

        system_prompt = data.get("systemContent", "你是一个友好的AI助手。请用简洁、自然的中文回答，就像日常聊天一样。")
        session_id = f"stream_session_{uuid.uuid4().hex[:8]}"
        
        async def generate():
            stream_conversation = StreamingConversationManager()
            stream_tts = StreamingTTSManager(audio_manager)
            
            text_stream = stream_conversation.get_streaming_response(user_text, system_prompt)
            
            full_text = ""
            async for item in stream_tts.stream_speak(text_stream, session_id):
                if item["type"] == "audio":
                    full_text += item["text"]
                    # Yield Server-Sent Event (SSE)
                    yield f"data: {json.dumps(item, ensure_ascii=False)}\n\n"
            
            # Yield the end signal
            yield f"data: {json.dumps({'type': 'end', 'full_text': full_text}, ensure_ascii=False)}\n\n"

        headers = {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Transfer-Encoding': 'chunked',
            'Connection': 'keep-alive',
        }
        return Response(generate(), headers=headers)

    except Exception as e:
        logger.error(f"流式API /api/ask/stream 出错: {e}")
        return jsonify({"error": f"Internal Server Error: {str(e)}"}), 500

@app.route("/audio/<filename>")
async def serve_audio_file(filename):
    return await send_from_directory(AUDIO_FOLDER, filename, mimetype="audio/mpeg")

@app.route("/api/delete_audio/<filename>", methods=["DELETE"])
async def delete_audio(filename):
    if audio_manager.delete_file(filename):
        return jsonify({"success": True})
    else:
        return jsonify({"error": "File not found"}), 404

@app.route("/api/cleanup_session/<session_id>", methods=["POST"])
async def cleanup_session(session_id):
    audio_manager.cleanup_session(session_id)
    return jsonify({"success": True})

# --- Static File Serving ---
@app.route('/')
async def serve_index():
    return await send_from_directory(WEBSITE_ROOT, 'index.html')

@app.route('/<path:path>')
async def serve_static_files(path):
    if path.startswith("backend"):
        return "Access Denied", 403
    return await send_from_directory(WEBSITE_ROOT, path)

# --- App Lifecycle ---
@app.after_serving
async def shutdown():
    logger.info("服务器正在关闭...")
    audio_manager.stop()
    logger.info("资源清理完成，服务器已关闭。")

if __name__ == '__main__':
    if not API_KEY_ENV or not BASE_URL_ENV:
        logger.warning("环境变量 API_KEY 或 BASE_URL 未设置，AI对话功能可能无法使用。")
    if not os.path.exists(os.path.join(WEBSITE_ROOT, 'index.html')):
        logger.warning(f"在 {WEBSITE_ROOT} 目录下未找到 index.html，网站可能无法访问。")

    logger.info("启动 Quart 服务器...")
    app.run(debug=True, host='0.0.0.0', port=5000, use_reloader=False)