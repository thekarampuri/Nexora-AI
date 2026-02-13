
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from ultralytics import YOLO
import cv2
import numpy as np
import base64
import os
import mediapipe as mp

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Load YOLOv8 model (using nano version for speed)
# It will download 'yolov8n.pt' automatically on first run
model = YOLO('yolov8n.pt')

# Initialize MediaPipe Face Detection
mp_face_detection = mp.solutions.face_detection
face_detection = mp_face_detection.FaceDetection(min_detection_confidence=0.5)

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
        
        height, width, _ = img.shape
        detections = []

        # --- 1. YOLO Object Detection ---
        # Run inference with tracking
        results = model.track(img, persist=True, verbose=False)
        
        for r in results:
            boxes = r.boxes
            for box in boxes:
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                conf = float(box.conf[0])
                cls = int(box.cls[0])
                label = model.names[cls]
                track_id = int(box.id[0]) if box.id is not None else -1

                # Filter out 'person' from YOLO since we want to focus on 'face'
                # but you can keep it if you want both body and face boxes
                if label != 'person':
                    detections.append({
                        "bbox": [x1, y1, x2, y2],
                        "confidence": conf,
                        "label": label,
                        "id": track_id,
                        "type": "object"
                    })

        # --- 2. MediaPipe Face Detection ---
        # Convert to RGB for MediaPipe
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        face_results = face_detection.process(img_rgb)

        if face_results.detections:
            for i, detection in enumerate(face_results.detections):
                bboxC = detection.location_data.relative_bounding_box
                x1 = int(bboxC.xmin * width)
                y1 = int(bboxC.ymin * height)
                w = int(bboxC.width * width)
                h = int(bboxC.height * height)
                x2 = x1 + w
                y2 = y1 + h
                
                conf = detection.score[0]

                detections.append({
                    "bbox": [x1, y1, x2, y2],
                    "confidence": conf,
                    "label": "face",
                    "id": i + 100, # Mock ID for faces (100+) to distinguish from objects
                    "type": "face"
                })

        emit('detection_result', {"detections": detections})

    except Exception as e:
        print(f"Error processing frame: {e}")

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "active", 
        "model_object": "yolov8n", 
        "model_face": "mediapipe",
        "mode": "socketio"
    })

@app.route('/model-info', methods=['GET'])
def model_info():
    """Get detailed information about the loaded model"""
    try:
        return jsonify({
            "model_name": "YOLOv8 Nano + MediaPipe",
            "model_file": "yolov8n.pt",
            "framework": "Ultralytics YOLO + Google MediaPipe",
            "num_classes": len(model.names) + 1,
            "status": "loaded"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    print(f"🚀 NEXORA Vision Core Starting on port {port}")
    print(f"📦 Model: YOLOv8 Nano (yolov8n.pt) + MediaPipe Face")
    print(f"⚡ Protocol: WebSockets (SocketIO)")
    print(f"✅ Ready for real-time detected")
    socketio.run(app, host='0.0.0.0', port=port, debug=True, allow_unsafe_werkzeug=True)
