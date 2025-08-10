# HumanERS with Python Flask AI Backend

This is an enhanced version of HumanERS that uses Python Flask as a backend for AI processing with MediaPipe models.

## Setup Instructions

### 1. Install Python Dependencies

First, make sure you have Python 3.8+ installed, then install the required packages:

```bash
pip install -r requirements.txt
```

### 2. Start the Flask Backend

```bash
python app.py
```

The Flask server will start on `http://localhost:5000` and load the AI models:
- MediaPipe Face Detection
- MediaPipe Face Mesh (for emotion analysis)
- MediaPipe Hands (for gesture recognition)

### 3. Open the Frontend

Open `flask-frontend.html` in your browser (you can open it directly or serve it with a simple HTTP server).

## Features

### AI Models Used:
- **MediaPipe Face Detection**: Fast and accurate face detection
- **MediaPipe Face Mesh**: 468 facial landmarks for emotion analysis
- **MediaPipe Hands**: Hand tracking with 21 landmarks per hand
- **Custom Emotion Analysis**: Analyzes facial features to detect emotions
- **Gesture Intensity Calculation**: Measures hand gesture intensity

### API Endpoints:

- `GET /api/health` - Check backend status
- `POST /api/analyze_face` - Analyze facial emotions from image
- `POST /api/analyze_hands` - Analyze hand gestures from image
- `POST /api/analyze_audio` - Analyze breathing patterns from audio

### Real-time Features:
- Live camera feed analysis
- Emotion recognition (happy, sad, angry, surprised, fearful, neutral)
- Hand gesture intensity measurement
- Threat level calculation based on multiple factors
- Dynamic background colors and particle effects

## Architecture

```
Frontend (JavaScript) → Flask Backend (Python) → MediaPipe AI Models
```

### Benefits of this approach:
1. **More Accurate AI**: MediaPipe models are more robust than browser-based solutions
2. **Better Performance**: Python handles heavy AI processing
3. **Scalable**: Can easily add more AI models
4. **Cross-platform**: Works on any device with a browser

## Troubleshooting

### Backend Issues:
- Make sure all Python packages are installed
- Check that port 5000 is not in use
- Verify camera permissions are granted

### Frontend Issues:
- Allow camera and microphone permissions
- Make sure Flask backend is running
- Check browser console for connection errors

### Common Errors:
- **"Backend connection failed"**: Flask server is not running
- **"Camera access denied"**: Grant camera permissions in browser
- **"Module not found"**: Install missing Python packages with pip

## Performance Tips

- Good lighting improves face detection accuracy
- Keep hands visible for gesture recognition
- Stable camera position works best
- Close unnecessary browser tabs for better performance

## Development

To add new AI features:
1. Add new endpoint in `app.py`
2. Update frontend in `frontend.js` 
3. Test with the health check endpoint

The system is designed to be modular and extensible for additional AI capabilities.
