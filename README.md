# NEXORA AI - Futuristic AI Assistant with Vision

NEXORA is an advanced AI assistant featuring a futuristic HUD interface, powered by Google's Gemini 3 AI and real-time object detection using YOLOv8.

## ✨ Features

- 🤖 **Gemini 3 AI Integration** - Advanced conversational AI with context awareness
- 👁️ **Real-time Object Detection** - YOLOv8-powered vision system detecting 80+ object types
- 🎤 **Voice Control** - Speech-to-text input and text-to-speech responses
- 🎨 **Futuristic HUD Interface** - Cyberpunk-inspired UI with smooth animations
- 🏠 **Smart Device Control** - Simulated IoT device management
- 📊 **Activity Logs** - Track all system interactions
- 🔐 **User Authentication** - Secure login system

## 🏗️ Architecture

```
NEXORA/
├── src/                    # React frontend
│   ├── components/
│   │   ├── HUD.jsx        # Main interface
│   │   ├── ChatInterface.jsx
│   │   ├── VisionHUD.jsx  # Object detection UI
│   │   └── ...
│   └── context/
├── server/                 # Node.js backend (Gemini API)
├── python_server/          # Flask server (YOLOv8 detection)
│   ├── app.py
│   ├── test_detection.py
│   └── yolov8m.pt
└── object-detection-opencv-master/  # YOLOv3 reference
```

## 🚀 Quick Start

### Prerequisites

- Node.js 16+
- Python 3.8+
- Webcam (for vision features)
- Google Gemini API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Nexora-AI
   ```

2. **Install Node dependencies**
   ```bash
   npm install
   ```

3. **Install Python dependencies**
   ```bash
   cd python_server
   pip install -r requirements.txt
   cd ..
   ```

4. **Configure environment**
   Create a `.env` file in the root directory:
   ```env
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   ```

### Running the Application

You need to start three servers:

**Option 1: Use the batch script (Windows)**
```bash
start_nexora.bat
```

**Option 2: Manual start (3 terminals)**

Terminal 1 - Python Vision Server:
```bash
cd python_server
python app.py
```

Terminal 2 - Node.js Backend:
```bash
npm run server
```

Terminal 3 - Frontend:
```bash
npm run dev
```

Access the application at `http://localhost:5173`

## 📸 Object Detection

NEXORA features real-time object detection powered by YOLOv8. See [OBJECT_DETECTION_GUIDE.md](OBJECT_DETECTION_GUIDE.md) for detailed documentation.

**Quick Test:**
```bash
cd python_server
python test_detection.py
```

## 🎮 Usage

1. **Login** with any username/password
2. **Chat** with NEXORA using text or voice
3. **Activate Vision Mode** by clicking the camera icon
4. **Control Devices** with voice commands:
   - "Turn on the light"
   - "Turn off the fan"
   - "System status"

## 🛠️ Tech Stack

### Frontend
- React 19
- Vite
- TailwindCSS
- Framer Motion
- Lucide Icons

### Backend
- Node.js + Express
- Google Generative AI SDK
- Flask (Python)
- Ultralytics YOLOv8

### AI/ML
- Google Gemini 3 Flash
- YOLOv8 Medium (object detection)
- Web Speech API (STT/TTS)

## 📚 Documentation

- [Object Detection Guide](OBJECT_DETECTION_GUIDE.md) - Complete vision system documentation
- [YOLOv3 Integration](object-detection-opencv-master/README_INTEGRATION.md) - Legacy implementation reference

## 🧪 Testing

### Test Object Detection
```bash
cd python_server
python test_detection.py
```

### Test Gemini API
```bash
node test-gemini3.js
```

## 🔧 Configuration

### Switch to Faster Model
For better performance, use YOLOv8 Nano:
```python
# In python_server/app.py, line 15
model = YOLO('yolov8n.pt')  # Instead of yolov8m.pt
```

### Adjust Detection Frequency
```javascript
// In src/components/VisionHUD.jsx, line 22
const interval = setInterval(captureAndDetect, 1000); // Slower detection
```

## 📝 License

MIT License

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🐛 Troubleshooting

See [OBJECT_DETECTION_GUIDE.md](OBJECT_DETECTION_GUIDE.md#troubleshooting) for common issues and solutions.

## 🌟 Features in Detail

### Voice Control
- Continuous speech recognition
- Natural language processing
- Text-to-speech responses
- Noise handling

### Object Detection
- 80+ object types (COCO dataset)
- Real-time processing (2 FPS)
- Confidence scores
- Bounding box visualization
- Voice announcements

### Smart Devices
- Classroom Light control
- Lab Fan control
- Status monitoring
- Voice-activated commands

---
Note: Need to implement AI automation. 

Built with ❤️ using React, Gemini AI, and YOLOv8
