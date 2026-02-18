
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from ultralytics import YOLO
import cv2
import numpy as np
import base64
import os
from deepface import DeepFace
from nura_engine import NuraEngine

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Initialize NURA Engine
nura = NuraEngine()

# Load YOLOv8 model
model = YOLO('yolov8n.pt')

# ... (Existing init code) ...

# --- NURA SYSTEM ENDPOINTS ---

@app.route('/api/system/command', methods=['POST'])
def system_command():
    try:
        data = request.json
        action = data.get('action')
        
        if action in ['up', 'down', 'mute']:
            return jsonify(nura.set_volume(action))
        
        elif action in ['play', 'pause', 'next', 'prev', 'stop']:
            return jsonify(nura.media_control(action))
            
        elif action == 'battery':
            return jsonify(nura.get_system_stats())
            
        return jsonify({"error": "Invalid command"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/app/launch', methods=['POST'])
def launch_app():
    try:
        data = request.json
        app_name = data.get('app_name')
        if not app_name:
            return jsonify({"error": "App name required"}), 400
        return jsonify(nura.open_application(app_name))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/web/open', methods=['POST'])
def open_web():
    try:
        data = request.json
        url = data.get('url')
        if not url:
            return jsonify({"error": "URL required"}), 400
        return jsonify(nura.open_website(url))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/web/search', methods=['POST'])
def google_search():
    try:
        data = request.json
        query = data.get('query')
        if not query:
            return jsonify({"error": "Query required"}), 400
        return jsonify(nura.google_search(query))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/news', methods=['GET'])
def get_news():
    try:
        return jsonify(nura.get_news())
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/automation/whatsapp', methods=['POST'])
def whatsapp_automation():
    try:
        data = request.json
        return jsonify(nura.whatsapp_automation(data.get('action'), data))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/automation/instagram', methods=['POST'])
def instagram_automation():
    try:
        data = request.json
        return jsonify(nura.instagram_automation(data.get('action')))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/automation/youtube', methods=['POST'])
def youtube_automation():
    try:
        data = request.json
        return jsonify(nura.youtube_automation(data.get('action'), data.get('query')))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/system/file', methods=['POST'])
def file_automation():
    try:
        data = request.json
        return jsonify(nura.file_operations(data.get('action'), data.get('path'), data.get('content')))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/automation/editor', methods=['POST'])
def editor_automation():
    try:
        data = request.json
        return jsonify(nura.text_editor_automation(data.get('action'), data.get('text')))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    print(f"🚀 NEXORA Vision Core Starting on port {port}")
    print(f"📦 Model: YOLOv8 Nano + OpenCV Face + DeepFace")
    print(f"⚡ Protocol: WebSockets (SocketIO)")
    print(f"🤖 NURA Engine: Active (System Automation Ready)")
    print(f"✅ Ready for real-time detection & recognition")
    socketio.run(app, host='0.0.0.0', port=port, debug=True, allow_unsafe_werkzeug=True)
