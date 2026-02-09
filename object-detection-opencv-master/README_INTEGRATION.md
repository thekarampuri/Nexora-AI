# Object Detection Integration Guide

This folder contains a standalone YOLOv3 object detection implementation using OpenCV. It serves as a reference implementation and comparison point for the main NEXORA vision system.

## What's in This Folder

- `yolo_opencv.py` - Python script for object detection on static images
- `yolov3.cfg` - YOLOv3 model configuration
- `yolov3.txt` - List of 80 detectable object classes
- `dog.jpg` - Sample test image
- `object-detection.jpg` - Example output with detections
- `LICENSE` - MIT License
- `README.md` - Original documentation

## How This Relates to NEXORA

NEXORA's main vision system uses **YOLOv8** (located in `python_server/`), which is newer and more accurate. This YOLOv3 implementation is kept for:

1. **Reference**: Understanding YOLO fundamentals
2. **Comparison**: Benchmarking YOLOv3 vs YOLOv8 performance
3. **Standalone Testing**: Quick CLI-based object detection

## YOLOv3 vs YOLOv8 Comparison

| Aspect | YOLOv3 (This Folder) | YOLOv8 (NEXORA Active) |
|--------|---------------------|------------------------|
| **Framework** | OpenCV DNN | Ultralytics |
| **Model File** | yolov3.weights (237 MB) | yolov8m.pt (52 MB) |
| **Interface** | Command-line | REST API |
| **Use Case** | Static images | Real-time video |
| **Speed** | Slower | Faster |
| **Accuracy** | Good | Better |
| **Integration** | Standalone | Integrated with NEXORA |

## Setup (YOLOv3)

### 1. Install Dependencies

```bash
pip install numpy opencv-python
```

### 2. Download Weights

The YOLOv3 weights file is **not included** due to its size (237 MB). Download it:

```bash
# Windows (PowerShell)
Invoke-WebRequest -Uri "https://pjreddie.com/media/files/yolov3.weights" -OutFile "yolov3.weights"

# Linux/Mac
wget https://pjreddie.com/media/files/yolov3.weights
```

### 3. Run Detection

```bash
python yolo_opencv.py --image dog.jpg --config yolov3.cfg --weights yolov3.weights --classes yolov3.txt
```

**Expected Output:**
- Console: Detection results with confidence scores
- File: `object-detection.jpg` with bounding boxes

## Using NEXORA's YOLOv8 Instead

For better performance and integration, use NEXORA's main vision system:

```bash
# Start the Python server
cd ../python_server
python app.py

# Test detection
python test_detection.py
```

See [OBJECT_DETECTION_GUIDE.md](../OBJECT_DETECTION_GUIDE.md) for complete documentation.

## Example Usage

### Basic Detection
```bash
python yolo_opencv.py --image dog.jpg --config yolov3.cfg --weights yolov3.weights --classes yolov3.txt
```

### With Custom Image
```bash
python yolo_opencv.py --image /path/to/your/image.jpg --config yolov3.cfg --weights yolov3.weights --classes yolov3.txt
```

## Detected Classes

This implementation can detect 80 object types from the COCO dataset (same as YOLOv8):
- People, animals, vehicles
- Household items, furniture
- Food, sports equipment
- And more (see `yolov3.txt` for full list)

## Troubleshooting

### "yolov3.weights not found"
Download the weights file as shown in Setup step 2.

### "Failed to read image"
Ensure the image path is correct and the file exists.

### "OpenCV not installed"
Run: `pip install opencv-python`

## Migration to YOLOv8

If you want to migrate this code to use YOLOv8:

```python
from ultralytics import YOLO

# Load model
model = YOLO('yolov8m.pt')

# Run inference
results = model('dog.jpg')

# Process results
for r in results:
    boxes = r.boxes
    for box in boxes:
        print(f"{model.names[int(box.cls[0])]}: {float(box.conf[0]):.2f}")
```

## Credits

Original YOLOv3 implementation by Arun Ponnusamy
- Website: http://www.arunponnusamy.com
- Blog: http://www.arunponnusamy.com/yolo-object-detection-opencv-python.html

## License

MIT License (see LICENSE file)

## Additional Resources

- [YOLOv3 Paper](https://arxiv.org/abs/1804.02767)
- [YOLO Official Website](https://pjreddie.com/darknet/yolo/)
- [OpenCV DNN Module](https://docs.opencv.org/master/d2/d58/tutorial_table_of_content_dnn.html)
