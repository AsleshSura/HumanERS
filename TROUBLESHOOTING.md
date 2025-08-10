# HumanERS Troubleshooting Guide

## 🚨 If the program doesn't work:

### Step 1: Check Console for Errors
1. Open browser developer tools (F12)
2. Go to Console tab
3. Look for error messages in red

### Step 2: Try Demo Mode First
1. Open `demo.html` instead of `index.html`
2. This version works without external AI libraries
3. Use the emotion buttons to test functionality

### Step 3: Check Permissions
- **Camera**: Browser may block camera access
- **Microphone**: Browser may block audio access
- **HTTPS**: Some features require HTTPS (secure connection)

### Step 4: Common Issues & Solutions

#### Issue: Black screen or no visual response
**Solution**: 
- Check if Canvas is supported in your browser
- Try refreshing the page
- Open demo.html instead

#### Issue: AI models fail to load
**Solution**:
- This is expected! The system has fallback modes
- Use demo.html for testing
- Download models manually if needed (see models/ folder)

#### Issue: WebGazer eye tracking not working
**Solution**:
- This library is often unreliable
- The system works without it
- Eye position is simulated in demo mode

### Step 5: Expected Behavior

The system should:
1. ✅ Show colored background that changes based on threat level
2. ✅ Display threat level symbol in center (✨🏔️👁️⚠️💀)
3. ✅ Create floating particles
4. ✅ Respond to touch/mouse interactions
5. ✅ Show status indicators (colored dots in top-left)

### Step 6: Debug Mode

The system logs status every 5 seconds to console:
```javascript
{
  threatLevel: 0.45,
  emotion: "neutral",
  gestureIntensity: 0.23,
  eyePosition: {x: 0.5, y: 0.4},
  isShaking: false
}
```

### Step 7: Browser Compatibility

**Recommended browsers:**
- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Safari 13+
- ✅ Edge 80+

**Required features:**
- Canvas API
- WebRTC (for camera/microphone)
- ES6 JavaScript

### Step 8: Local Server Setup

The system requires a local server due to browser security restrictions:

**Windows PowerShell:**
```powershell
cd "c:\Users\SOLID\OneDrive\Desktop\Summer Projects\HumanERS"
python -m http.server 8000
```

**Then open:** http://localhost:8000/demo.html

### Step 9: If All Else Fails

The demo mode (`demo.html`) should always work as it:
- ❌ Doesn't require camera access
- ❌ Doesn't require microphone access  
- ❌ Doesn't load external AI libraries
- ✅ Simulates all emotion detection
- ✅ Has interactive buttons for testing
- ✅ Shows all visual effects

Contact support if demo mode doesn't work - this indicates a fundamental browser compatibility issue.
