# 🎤 实时语音对话系统 (Real-time Voice Conversation System)

基于 Faster-Whisper 的实时语音对话系统，支持语音识别、智能对话和语音合成的完整流程。

## ✨ 特性

- 🎙️ **实时语音识别**: 使用 Faster-Whisper 进行高效的中文语音转文字
- 🧠 **智能对话**: 集成 Qwen 大语言模型进行自然对话
- 🔊 **语音合成**: 使用 Edge-TTS 生成自然的中文语音
- 🎯 **语音活动检测**: 自动检测用户说话开始和结束
- 🚫 **智能录音管理**: AI 说话时自动禁用录音，避免干扰
- 🌐 **实时通信**: 基于 WebSocket 的实时前后端通信
- 📱 **响应式界面**: 现代化的 Web 界面，支持移动端

## 🏗️ 系统架构

```
用户语音 → 麦克风录音 → VAD检测 → Faster-Whisper转录 → Qwen对话 → Edge-TTS合成 → 音频播放
```

### 核心组件

1. **AudioRecorder**: 实时音频录制和VAD检测
2. **WhisperTranscriber**: 基于Faster-Whisper的语音识别
3. **ConversationManager**: Qwen模型对话管理
4. **TTSManager**: Edge-TTS语音合成
5. **VoiceConversationSystem**: 系统协调器

## 🚀 快速开始

### 1. 环境要求

- Python 3.8+
- 麦克风和扬声器
- 网络连接 (用于API调用)

### 2. 安装依赖

```bash
# 运行自动安装脚本
python setup.py

# 或手动安装
pip install -r requirements.txt
```

### 3. 配置环境变量

编辑 `backend/.env` 文件:

```env
BASE_URL=https://api.openai.com/v1
API_KEY=your_qwen_api_key_here
WHISPER_MODEL=base
WHISPER_DEVICE=cpu
```

### 4. 启动系统

```bash
python main.py
```

### 5. 打开前端界面

在浏览器中打开 `voice-chat.html` 文件，点击"开始对话"即可开始语音聊天。

## 📋 详细配置

### Whisper 模型配置

支持的模型大小:
- `tiny`: 最快，准确率较低
- `base`: 平衡速度和准确率 (推荐)
- `small`: 更好的准确率
- `medium`: 高准确率
- `large-v3`: 最高准确率，速度较慢

### 设备配置

```python
# CPU 运行 (推荐用于开发)
WhisperTranscriber(model_size="base", device="cpu")

# GPU 运行 (需要CUDA支持)
WhisperTranscriber(model_size="base", device="cuda")
```

### VAD 参数调整

```python
# 在 VoiceActivityDetector 中调整
VAD_AGGRESSIVENESS = 2  # 0-3, 数值越高越敏感
VAD_FRAME_DURATION = 30  # 帧长度 (ms)
```

## 🎛️ 系统参数

### 音频参数
- **采样率**: 16kHz
- **声道**: 单声道
- **格式**: 16-bit PCM
- **缓冲区大小**: 1024 frames

### 对话参数
- **最小音频长度**: 1.0秒
- **静音阈值**: 2.0秒
- **AI说话前禁录时间**: 1.0秒
- **AI说话后恢复录音时间**: 1.0秒

### 音频清理参数
- **自动清理间隔**: 5分钟
- **音频文件最大保存时间**: 1小时
- **会话结束时自动清理**: 是

## 🔧 API 接口

### WebSocket 事件

#### 客户端发送
- `start_conversation`: 开始语音对话
- `stop_conversation`: 停止语音对话
- `end_session`: 手动结束会话并清理音频

#### 服务端发送
- `status`: 系统状态更新
- `speech_start`: 检测到语音开始
- `speech_end`: 语音结束
- `transcription`: 语音转录结果
- `ai_response`: AI回复文本
- `ai_speaking`: AI说话状态
- `play_audio`: 播放音频文件
- `session_ended`: 会话结束通知

### HTTP 接口

- `GET /`: 健康检查
- `POST /api/ask`: 文本对话接口
- `GET /audio/<filename>`: 获取音频文件
- `DELETE /api/delete_audio/<filename>`: 删除指定音频文件
- `POST /api/cleanup_session/<session_id>`: 清理指定会话的音频文件
- `GET /api/audio_stats`: 获取音频文件统计信息

## 🛠️ 开发指南

### 项目结构

```
├── main.py                 # 主程序入口
├── voice-chat.html         # 前端界面
├── requirements.txt        # Python依赖
├── setup.py               # 安装脚本
├── backend/
│   ├── .env               # 环境变量
│   └── app.py             # 原始Flask应用
├── audio/                 # 音频文件存储
└── README.md              # 项目文档
```

### 自定义开发

#### 添加新的语音识别语言

```python
# 在 WhisperTranscriber.transcribe_audio 中修改
segments, info = self.model.transcribe(
    audio_np,
    language="en",  # 改为其他语言代码
    vad_filter=True
)
```

#### 更换TTS语音

```python
# 在 TTSManager 中修改
self.voice = "zh-CN-YunxiNeural"  # 男声
self.voice = "en-US-AriaNeural"   # 英文女声
```

#### 调整对话模型

```python
# 在 ConversationManager 中修改
response = self.client.chat.completions.create(
    model="gpt-4",  # 更换为其他模型
    messages=messages,
    temperature=0.7,
    max_tokens=200
)
```

## 🐛 故障排除

### 常见问题

1. **麦克风无法访问**
   - 检查浏览器麦克风权限
   - 确认系统麦克风设备正常

2. **Whisper模型加载失败**
   - 检查网络连接
   - 尝试更小的模型 (如 "tiny")

3. **音频播放问题**
   - 检查扬声器设置
   - 确认音频文件生成成功

4. **API调用失败**
   - 验证 `.env` 文件中的API密钥
   - 检查网络连接和API服务状态

### 性能优化

1. **降低延迟**
   - 使用更小的Whisper模型
   - 调整VAD参数减少静音等待时间
   - 使用GPU加速 (如果可用)

2. **提高准确率**
   - 使用更大的Whisper模型
   - 改善录音环境 (减少噪音)
   - 调整VAD敏感度

## 📊 性能基准

基于 13 分钟音频的测试结果:

| 模型 | 设备 | 转录时间 | 内存使用 | 准确率 |
|------|------|----------|----------|--------|
| tiny | CPU | ~30s | 1GB | 良好 |
| base | CPU | ~1m | 2GB | 很好 |
| small | CPU | ~2m | 3GB | 优秀 |
| base | GPU | ~15s | 2GB | 很好 |

## 🤝 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [Faster-Whisper](https://github.com/SYSTRAN/faster-whisper) - 高效的Whisper实现
- [Edge-TTS](https://github.com/rany2/edge-tts) - 微软Edge TTS服务
- [WebRTC VAD](https://github.com/wiseman/py-webrtcvad) - 语音活动检测
- [Flask-SocketIO](https://flask-socketio.readthedocs.io/) - 实时通信

## 📞 支持

如有问题或建议，请提交 [Issue](https://github.com/your-repo/issues) 或联系开发者。

---

**享受与AI的语音对话吧！** 🎉