
from flask import Flask, request, jsonify
from flask_cors import CORS
from ultralytics import YOLO
import cv2
import numpy as np
import base64
import os

app = Flask(__name__)
CORS(app)

# Load YOLOv8 model (using medium version for better accuracy)
# It will download 'yolov8m.pt' automatically on first run
model = YOLO('yolov8m.pt')

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
    return jsonify({"status": "active", "model": "yolov8m"})

@app.route('/model-info', methods=['GET'])
def model_info():
    """Get detailed information about the loaded model"""
    try:
        return jsonify({
            "model_name": "YOLOv8 Medium",
            "model_file": "yolov8m.pt",
            "framework": "Ultralytics YOLO",
            "num_classes": len(model.names),
            "class_names": list(model.names.values()),
            "input_size": "640x640",
            "status": "loaded"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/test-image', methods=['POST'])
def test_image():
    """Test detection on a static image file from the server"""
    try:
        data = request.json
        if 'image_path' not in data:
            return jsonify({"error": "No image_path provided"}), 400
        
        image_path = data['image_path']
        
        # Security: Only allow images from specific directories
        allowed_dirs = ['test_images', '../object-detection-opencv-master']
        base_path = os.path.dirname(__file__)
        
        # Construct full path
        full_path = os.path.join(base_path, image_path)
        
        if not os.path.exists(full_path):
            return jsonify({"error": f"Image not found: {image_path}"}), 404
        
        # Read image
        img = cv2.imread(full_path)
        if img is None:
            return jsonify({"error": "Failed to read image"}), 400
        
        # Run inference
        results = model(img)
        
        detections = []
        for r in results:
            boxes = r.boxes
            for box in boxes:
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                conf = float(box.conf[0])
                cls = int(box.cls[0])
                label = model.names[cls]
                
                detections.append({
                    "bbox": [x1, y1, x2, y2],
                    "confidence": conf,
                    "label": label
                })
        
        return jsonify({
            "detections": detections,
            "image_path": image_path,
            "image_size": {"width": img.shape[1], "height": img.shape[0]},
            "num_detections": len(detections)
        })
    
    except Exception as e:
        print(f"Test Image Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    print(f"🚀 NEXORA Vision Core Starting on port {port}")
    print(f"📦 Model: YOLOv8 Medium (yolov8m.pt)")
    print(f"🎯 Classes: {len(model.names)} object types")
    print(f"✅ Ready for detection requests")
    app.run(host='0.0.0.0', port=port, debug=True)
