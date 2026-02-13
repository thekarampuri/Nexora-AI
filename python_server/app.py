
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from ultralytics import YOLO
import cv2
import numpy as np
import base64
import os

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Load YOLOv8 model (using nano version for speed)
# It will download 'yolov8n.pt' automatically on first run
model = YOLO('yolov8n.pt')

@socketio.on('connect')
def handle_connect():
    print('Client connected')

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

@socketio.on('detect_frame')
def handle_frame(data):
    try:
        if 'image' not in data:
            return

        # Decode base64 image
        image_data = data['image'].split(',')[1]
        nparr = np.frombuffer(base64.b64decode(image_data), np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            return

        # Run inference with tracking
        # persist=True keeps track of object IDs across frames
        results = model.track(img, persist=True, verbose=False)
        
        detections = []
        for r in results:
            boxes = r.boxes
            for box in boxes:
                # Bounding box coordinates
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                
                # Confidence
                conf = float(box.conf[0])
                
                # Class Name
                cls = int(box.cls[0])
                label = model.names[cls]
                
                # Track ID (if available)
                track_id = int(box.id[0]) if box.id is not None else -1

                detections.append({
                    "bbox": [x1, y1, x2, y2],
                    "confidence": conf,
                    "label": label,
                    "id": track_id
                })

        emit('detection_result', {"detections": detections})

    except Exception as e:
        print(f"Error processing frame: {e}")

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "active", "model": "yolov8n", "mode": "socketio"})

@app.route('/model-info', methods=['GET'])
def model_info():
    """Get detailed information about the loaded model"""
    try:
        return jsonify({
            "model_name": "YOLOv8 Nano",
            "model_file": "yolov8n.pt",
            "framework": "Ultralytics YOLO",
            "num_classes": len(model.names),
            "class_names": list(model.names.values()),
            "input_size": "640x640",
            "status": "loaded"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    print(f"🚀 NEXORA Vision Core Starting on port {port}")
    print(f"📦 Model: YOLOv8 Nano (yolov8n.pt)")
    print(f"⚡ Protocol: WebSockets (SocketIO)")
    print(f"✅ Ready for real-time detection")
    socketio.run(app, host='0.0.0.0', port=port, debug=True, allow_unsafe_werkzeug=True)
