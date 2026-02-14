
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from ultralytics import YOLO
import cv2
import numpy as np
import base64
import os
from deepface import DeepFace

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Load YOLOv8 model
model = YOLO('yolov8n.pt')

# Initialize OpenCV Face Detector (Haar Cascade)
# This is a robust fallback since MediaPipe had installation issues
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

# Recognition Cache
face_id_cache = {} # Map track_id -> name
frame_count = 0

# Ensure known_faces directory exists
if not os.path.exists('known_faces'):
    os.makedirs('known_faces')

@socketio.on('connect')
def handle_connect():
    print('Client connected')

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

@socketio.on('detect_frame')
def handle_frame(data):
    global frame_count
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
        frame_count += 1

        # --- 1. YOLO Object Detection (Disabled due to compatibility issues) ---
        # try:
        #     results = model.track(img, persist=True, verbose=False)
        #     for r in results:
        #         boxes = r.boxes
        #         for box in boxes:
        #             x1, y1, x2, y2 = box.xyxy[0].tolist()
        #             conf = float(box.conf[0])
        #             cls = int(box.cls[0])
        #             label = model.names[cls]
        #             track_id = int(box.id[0]) if box.id is not None else -1
        #             if label != 'person':
        #                 detections.append({
        #                     "bbox": [int(x1), int(y1), int(x2), int(y2)],
        #                     "confidence": conf,
        #                     "label": label,
        #                     "id": track_id,
        #                     "type": "object"
        #                 })
        # except Exception as e:
        #     print(f"YOLO Error: {e}")

        # --- 2. OpenCV Face Detection (Haar Cascade) ---
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.3, 5) # Tuned parameters

        for i, (x, y, w, h) in enumerate(faces):
            x1, y1 = int(x), int(y)
            x2, y2 = int(x + w), int(y + h)
            
            # Ensure crop coordinates are within image bounds
            x1 = max(0, x1)
            y1 = max(0, y1)
            x2 = min(width, x2)
            y2 = min(height, y2)

            face_id = int(i + 100) # Simple temporary ID
            name = "Unknown"
            
            # Run Recognition every 5 frames (approx 0.2 seconds - much faster with SFace)
            if frame_count % 5 == 0:
                try:
                    # Crop face
                    face_img = img[y1:y2, x1:x2]
                    if face_img.size > 0 and face_img.shape[0] > 10 and face_img.shape[1] > 10:
                        # Search in DB using SFace (Result is much faster)
                        dfs = DeepFace.find(img_path=face_img, 
                                          db_path="known_faces", 
                                          model_name="SFace", 
                                          detector_backend="opencv",
                                          enforce_detection=False,
                                          threshold=0.6, # Slightly higher threshold for SFace
                                          silent=True)
                        
                        if len(dfs) > 0 and not dfs[0].empty:
                            full_path = dfs[0].iloc[0]['identity']
                            filename = os.path.basename(full_path)
                            name = os.path.splitext(filename)[0]
                            face_id_cache[face_id] = name
                except Exception as e:
                    print(f"Recognition Error: {e}")
            
            # Use cached name if available
            if face_id in face_id_cache:
                name = face_id_cache[face_id]

            detections.append({
                "bbox": [x1, y1, x2, y2],
                "confidence": 0.9, # Haar doesn't give confidence, assume high if detected
                "label": "face",
                "name": name,
                "id": face_id,
                "type": "face"
            })
        
        emit('detection_result', {"detections": detections})

    except Exception as e:
        print(f"Error processing frame: {e}")

@app.route('/register-face', methods=['POST'])
def register_face():
    try:
        data = request.json
        if 'image' not in data or 'name' not in data:
            return jsonify({"error": "Missing image or name"}), 400
            
        name = data['name'].replace(" ", "_") # Sanitize name
        image_data = data['image'].split(',')[1]
        
        # Save image
        filepath = os.path.join("known_faces", f"{name}.jpg")
        with open(filepath, "wb") as f:
            f.write(base64.b64decode(image_data))
            
        # Clear representation cache if it exists so DeepFace re-scans folder
        pkl_path = os.path.join("known_faces", "representations_vgg_face.pkl")
        if os.path.exists(pkl_path):
            os.remove(pkl_path)
            
        return jsonify({"status": "success", "message": f"Registered {name}"})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "active", 
        "model_object": "yolov8n", 
        "model_face": "opencv-haar + deepface",
        "mode": "socketio"
    })

@app.route('/model-info', methods=['GET'])
def model_info():
    """Get detailed information about the loaded model"""
    try:
        return jsonify({
            "model_name": "YOLOv8 Nano + OpenCV Haar + DeepFace",
            "model_file": "yolov8n.pt",
            "framework": "Ultralytics YOLO + OpenCV + DeepFace",
            "num_classes": len(model.names) + 1,
            "status": "loaded"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    print(f"🚀 NEXORA Vision Core Starting on port {port}")
    print(f"📦 Model: YOLOv8 Nano + OpenCV Face + DeepFace")
    print(f"⚡ Protocol: WebSockets (SocketIO)")
    print(f"✅ Ready for real-time detection & recognition")
    socketio.run(app, host='0.0.0.0', port=port, debug=True, allow_unsafe_werkzeug=True)
