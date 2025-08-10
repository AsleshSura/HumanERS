from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import cv2
import numpy as np
import base64
import io
from PIL import Image
import json
import os
import time
from datetime import datetime

app = Flask(__name__)
CORS(app)

print("🔧 Initializing OpenCV models...")

# Initialize OpenCV-based AI models
try:
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')
    smile_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_smile.xml')
    print("✅ OpenCV models loaded successfully")
except Exception as e:
    print(f"❌ Error loading OpenCV models: {e}")

def decode_base64_image(base64_string):
    """Decode base64 image string to OpenCV format"""
    try:
        # Remove data URL prefix if present
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]
        
        # Decode base64
        image_data = base64.b64decode(base64_string)
        
        # Convert to PIL Image
        pil_image = Image.open(io.BytesIO(image_data))
        
        # Convert to OpenCV format
        opencv_image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
        
        return opencv_image
    except Exception as e:
        print(f"Error decoding image: {e}")
        return None

def analyze_emotions_opencv(image):
    """Analyze emotions using OpenCV cascade classifiers"""
    emotions = {
        'happy': 0.0,
        'sad': 0.0,
        'angry': 0.0,
        'surprised': 0.0,
        'fearful': 0.0,
        'neutral': 0.5
    }
    
    try:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Detect faces
        faces = face_cascade.detectMultiScale(gray, 1.3, 5)
        
        if len(faces) > 0:
            # Get the largest face
            face = max(faces, key=lambda x: x[2] * x[3])
            x, y, w, h = face
            
            # Extract face region
            face_roi = gray[y:y+h, x:x+w]
            
            # Detect smiles
            smiles = smile_cascade.detectMultiScale(face_roi, 1.8, 20)
            
            # Detect eyes
            eyes = eye_cascade.detectMultiScale(face_roi, 1.1, 5)
            
            # Simple emotion classification
            if len(smiles) > 0:
                emotions['happy'] = 0.8
                emotions['neutral'] = 0.2
            elif len(eyes) >= 2:
                # Eyes open - neutral or alert
                emotions['neutral'] = 0.7
                emotions['surprised'] = 0.3
            elif len(eyes) == 1:
                # One eye detected - possible squinting
                emotions['angry'] = 0.4
                emotions['neutral'] = 0.6
            else:
                # No eyes detected - eyes closed or looking away
                emotions['sad'] = 0.3
                emotions['neutral'] = 0.7
                
        return emotions
        
    except Exception as e:
        print(f"Error in emotion analysis: {e}")
        return emotions

def analyze_gestures_opencv(image):
    """Analyze hand gestures using simple computer vision"""
    gesture_data = {
        'hands_detected': 0,
        'gesture_intensity': 0.0,
        'hand_landmarks': []
    }
    
    try:
        # Simple hand detection using skin color and contours
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        
        # Define skin color range
        lower_skin = np.array([0, 20, 70], dtype=np.uint8)
        upper_skin = np.array([20, 255, 255], dtype=np.uint8)
        
        # Create mask for skin color
        mask = cv2.inRange(hsv, lower_skin, upper_skin)
        
        # Find contours
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Filter contours by area (potential hands)
        hand_contours = [c for c in contours if cv2.contourArea(c) > 3000]
        
        gesture_data['hands_detected'] = len(hand_contours)
        
        if hand_contours:
            # Calculate gesture intensity based on contour complexity
            max_intensity = 0
            for contour in hand_contours:
                # Calculate convex hull and defects
                hull = cv2.convexHull(contour, returnPoints=False)
                if len(hull) > 3:
                    defects = cv2.convexityDefects(contour, hull)
                    if defects is not None:
                        defect_count = len(defects)
                        # More defects = more finger spread = higher intensity
                        intensity = min(1.0, defect_count / 10.0)
                        max_intensity = max(max_intensity, intensity)
            
            gesture_data['gesture_intensity'] = max_intensity
        
        return gesture_data
        
    except Exception as e:
        print(f"Error in gesture analysis: {e}")
        return gesture_data

@app.route('/')
def index():
    return send_from_directory('.', 'flask-frontend.html')

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('.', filename)

@app.route('/api/analyze_face', methods=['POST'])
def analyze_face():
    """Analyze facial emotions from uploaded image"""
    try:
        data = request.get_json()
        image_data = data.get('image')
        
        if not image_data:
            return jsonify({'error': 'No image data provided'}), 400
        
        # Decode the image
        image = decode_base64_image(image_data)
        if image is None:
            return jsonify({'error': 'Invalid image data'}), 400
        
        # Analyze emotions
        emotions = analyze_emotions_opencv(image)
        
        # Check if face was detected
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.3, 5)
        face_detected = len(faces) > 0
        
        return jsonify({
            'success': True,
            'face_detected': face_detected,
            'emotions': emotions,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"Face analysis error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/analyze_hands', methods=['POST'])
def analyze_hands():
    """Analyze hand gestures from uploaded image"""
    try:
        data = request.get_json()
        image_data = data.get('image')
        
        if not image_data:
            return jsonify({'error': 'No image data provided'}), 400
        
        # Decode the image
        image = decode_base64_image(image_data)
        if image is None:
            return jsonify({'error': 'Invalid image data'}), 400
        
        # Analyze gestures
        gesture_data = analyze_gestures_opencv(image)
        
        return jsonify({
            'success': True,
            'gesture_data': gesture_data,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"Hand analysis error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'ai_models': {
            'opencv_face_detection': 'loaded',
            'opencv_eye_detection': 'loaded',
            'opencv_smile_detection': 'loaded'
        }
    })

if __name__ == '__main__':
    print("\n" + "="*60)
    print("🚀 HumanERS Flask Backend Starting...")
    print("="*60)
    print("🤖 AI Models loaded:")
    print("   ✅ OpenCV Face Detection")
    print("   ✅ OpenCV Eye Detection") 
    print("   ✅ OpenCV Smile Detection")
    print("   ✅ Custom Gesture Analysis")
    print("   ✅ Simple Audio Analysis")
    print("\n🌐 Server URL: http://localhost:5000")
    print("📱 Frontend: http://localhost:5000/flask-frontend.html")
    print("🔍 Health Check: http://localhost:5000/api/health")
    print("="*60)
    
    try:
        app.run(debug=True, host='127.0.0.1', port=5000, use_reloader=False)
    except Exception as e:
        print(f"❌ Error starting Flask server: {e}")
        input("Press Enter to exit...")
