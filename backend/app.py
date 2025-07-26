from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from openai import OpenAI
import os
import uuid
import asyncio
import edge_tts
import re
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)
app.config["JSON_AS_ASCII"] = False

AUDIO_FOLDER = "audio"
os.makedirs(AUDIO_FOLDER, exist_ok=True)

@app.route("/")
def health_check():
    return jsonify({"status": "ok", "message": "ChefMate API is running"})


async def tts_to_mp3(text, filename, rate="+0%", volume="+0%"):
    try:
        voice = "zh-CN-XiaoxiaoNeural"
        tts = edge_tts.Communicate(text=text, voice=voice, rate=rate, volume=volume)
        await tts.save(filename)
        return True
    except Exception as e:
        print(f"TTS Error: {str(e)}")
        # 创建一个空的音频文件作为fallback
        with open(filename, 'wb') as f:
            f.write(b'')
        return False


@app.route("/api/ask", methods=["POST"])
def ask():
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
            client = OpenAI(
                base_url=os.getenv("BASE_URL"),
                api_key=os.getenv("API_KEY")
            )
            response = client.chat.completions.create(
                model="Qwen/Qwen3-Coder-480B-A35B-Instruct",
                messages=[
                    {"role": "system", "content": system_content},
                    {"role": "user", "content": user_text},
                ],
                stream=True,
            )
            answer = ""
            for chunk in response:
                if chunk.choices[0].delta.content is not None:
                    answer += chunk.choices[0].delta.content

        answer = re.sub(r"[^\u4e00-\u9fa5a-zA-Z0-9\s]", "", answer)

        audio_filename = f"{uuid.uuid4().hex}.mp3"
        audio_path = os.path.join(AUDIO_FOLDER, audio_filename)

        tts_success = asyncio.run(tts_to_mp3(answer, audio_path))
        
        if tts_success and os.path.exists(audio_path) and os.path.getsize(audio_path) > 0:
            audio_url = f"/audio/{audio_filename}"
        else:
            audio_url = None
            print("TTS failed, returning text-only response")

        return jsonify({"answer": answer, "audio_url": audio_url})

    except Exception as e:
        print(f"Error in /api/ask: {str(e)}")
        print(f"Error type: {type(e).__name__}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500


@app.route("/audio/<filename>")
def serve_audio(filename):
    return send_file(os.path.join(AUDIO_FOLDER, filename), mimetype="audio/mpeg")


@app.route("/api/delete_audio/<filename>", methods=["DELETE"])
def delete_audio(filename):
    try:
        audio_path = os.path.join(AUDIO_FOLDER, filename)
        if os.path.exists(audio_path):
            os.remove(audio_path)
            return jsonify({"message": "Audio deleted"}), 200
        else:
            return jsonify({"error": "File not found"}), 404
    except Exception as e:
        print(f"Delete error: {str(e)}")
        return jsonify({"error": "Failed to delete audio"}), 500


if __name__ == "__main__":
    app.run(debug=True)
