
from flask import Flask, request, jsonify
from flask_cors import CORS
from ultralytics import YOLO
import cv2
import numpy as np
import base64
import os

app = Flask(__name__)
CORS(app)

# Load YOLOv8 model (using a lightweight version for speed)
# It will download 'yolov8n.pt' automatically on first run
model = YOLO('yolov8n.pt')

@app.route('/detect', methods=['POST'])
def detect():
    try:
        data = request.json
        if 'image' not in data:
            return jsonify({"error": "No image provided"}), 400

        # Decode base64 image
        image_data = data['image'].split(',')[1]
        nparr = np.frombuffer(base64.b64decode(image_data), np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        # Run inference
        results = model(img)
        
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

                detections.append({
                    "bbox": [x1, y1, x2, y2],
                    "confidence": conf,
                    "label": label
                })

        return jsonify({"detections": detections})

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "active", "model": "yolov8n"})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=True)
