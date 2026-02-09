"""
Test script for NEXORA Vision Core object detection
Tests YOLOv8 detection on static images and validates API endpoints
"""

import cv2
import numpy as np
import base64
import requests
import json
import os
from pathlib import Path

# Configuration
API_URL = "http://localhost:5001"
BASE_DIR = Path(__file__).parent
TEST_IMAGES_DIR = BASE_DIR / "test_images"
OUTPUT_DIR = BASE_DIR / "test_output"

def test_health_endpoint():
    """Test the health check endpoint"""
    print("\n🔍 Testing /health endpoint...")
    try:
        response = requests.get(f"{API_URL}/health")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Health check passed: {data}")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False

def test_model_info_endpoint():
    """Test the model info endpoint"""
    print("\n🔍 Testing /model-info endpoint...")
    try:
        response = requests.get(f"{API_URL}/model-info")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Model info retrieved:")
            print(f"   Model: {data.get('model_name')}")
            print(f"   Framework: {data.get('framework')}")
            print(f"   Classes: {data.get('num_classes')}")
            return True
        else:
            print(f"❌ Model info failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Model info error: {e}")
        return False

def test_detection_with_base64(image_path):
    """Test detection using base64 encoded image"""
    print(f"\n🔍 Testing detection on: {image_path}")
    try:
        # Read and encode image
        img = cv2.imread(str(image_path))
        if img is None:
            print(f"❌ Failed to read image: {image_path}")
            return None
        
        # Encode to base64
        _, buffer = cv2.imencode('.jpg', img)
        img_base64 = base64.b64encode(buffer).decode('utf-8')
        img_data = f"data:image/jpeg;base64,{img_base64}"
        
        # Send to API
        response = requests.post(
            f"{API_URL}/detect",
            json={"image": img_data},
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            data = response.json()
            detections = data.get('detections', [])
            print(f"✅ Detection successful: {len(detections)} objects found")
            
            # Print detections
            for i, det in enumerate(detections, 1):
                print(f"   {i}. {det['label']} ({det['confidence']:.2%})")
            
            return detections
        else:
            print(f"❌ Detection failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Detection error: {e}")
        import traceback
        traceback.print_exc()
        return None

def test_static_image_endpoint(image_path):
    """Test the static image endpoint"""
    print(f"\n🔍 Testing /test-image endpoint with: {image_path}")
    try:
        response = requests.post(
            f"{API_URL}/test-image",
            json={"image_path": image_path},
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Static image test passed: {data.get('num_detections')} objects")
            for det in data.get('detections', []):
                print(f"   - {det['label']} ({det['confidence']:.2%})")
            return data
        else:
            print(f"❌ Static image test failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Static image test error: {e}")
        return None

def draw_detections(image_path, detections, output_path):
    """Draw bounding boxes on image and save"""
    img = cv2.imread(str(image_path))
    if img is None:
        return False
    
    for det in detections:
        x1, y1, x2, y2 = map(int, det['bbox'])
        label = det['label']
        conf = det['confidence']
        
        # Draw box
        cv2.rectangle(img, (x1, y1), (x2, y2), (0, 243, 255), 2)
        
        # Draw label background
        label_text = f"{label} {conf:.2%}"
        (text_width, text_height), _ = cv2.getTextSize(
            label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2
        )
        cv2.rectangle(img, (x1, y1 - text_height - 10), 
                     (x1 + text_width, y1), (0, 0, 0), -1)
        
        # Draw label text
        cv2.putText(img, label_text, (x1, y1 - 5),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 243, 255), 2)
    
    # Save annotated image
    cv2.imwrite(str(output_path), img)
    print(f"💾 Saved annotated image to: {output_path}")
    return True

def main():
    """Run all tests"""
    print("=" * 60)
    print("🚀 NEXORA Vision Core - Detection Test Suite")
    print("=" * 60)
    
    # Create output directory
    OUTPUT_DIR.mkdir(exist_ok=True)
    
    # Test 1: Health check
    if not test_health_endpoint():
        print("\n⚠️  Server not responding. Make sure Python server is running:")
        print("   cd python_server && python app.py")
        return
    
    # Test 2: Model info
    test_model_info_endpoint()
    
    # Test 3: Detection with images from object-detection-opencv-master
    opencv_dir = BASE_DIR.parent / "object-detection-opencv-master"
    test_images = []
    
    if opencv_dir.exists():
        dog_img = opencv_dir / "dog.jpg"
        if dog_img.exists():
            test_images.append(("../object-detection-opencv-master/dog.jpg", dog_img))
    
    # Test 4: Detection on available images
    if test_images:
        print("\n" + "=" * 60)
        print("📸 Testing Object Detection")
        print("=" * 60)
        
        for rel_path, full_path in test_images:
            # Test base64 detection
            detections = test_detection_with_base64(full_path)
            
            # Test static image endpoint
            test_static_image_endpoint(rel_path)
            
            # Draw and save results
            if detections:
                output_path = OUTPUT_DIR / f"annotated_{full_path.name}"
                draw_detections(full_path, detections, output_path)
    else:
        print("\n⚠️  No test images found in object-detection-opencv-master/")
    
    print("\n" + "=" * 60)
    print("✅ Test suite completed!")
    print("=" * 60)

if __name__ == "__main__":
    main()
