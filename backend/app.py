from flask import Flask, request, jsonify
from flask_cors import CORS
from openai import OpenAI
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)
app.config["JSON_AS_ASCII"] = False


def query(payload):
    response = requests.post(API_URL, headers=headers, json=payload)
    return response.json()


@app.route("/api/ask", methods=["POST"])
def ask():
    try:
        client = OpenAI(
            base_url=os.getenv("BASE_URL"),
            api_key=os.getenv("API_KEY"),
        )
        data = request.json
        user_text = data.get("userText")
        system_content = data.get("systemContent")

        if not user_text or not system_content:
            return jsonify({"error": "Missing required parameters"}), 400

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

        return jsonify({"answer": answer})

    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500


if __name__ == "__main__":
    app.run(debug=True)
