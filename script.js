/**
 * HumanERS - Improved Multi-Sensory Survival Communication System
 * With enhanced error handling and fallback mechanisms
 */

// Global State Management
class SurvivalSystem {
    constructor() {
        this.initialized = false;
        this.permissions = {
            camera: false,
            microphone: false,
            motion: false
        };
        
        // AI Models with loading status
        this.models = {
            faceApi: { loaded: false, model: null, error: null },
            handpose: { loaded: false, model: null, error: null },
            webgazer: { loaded: false, model: null, error: null }
        };
        
        // Sensor Data
        this.threatLevel = 0.2;
        this.emotionScore = 0.2;
        this.gestureScore = 0.2;
        this.eyeScore = 0.2;
        this.motionScore = 0.2;
        
        // System state
        this.fallbackMode = false;
        this.debugMode = false;
        this.modelLoadTimeout = 15000; // 15 seconds timeout
        
        // Audio System
        this.audioContext = null;
        this.oscillators = [];
        this.gainNode = null;
        this.analyser = null;
        this.microphone = null;
        
        // Visual System
        this.backgroundCanvas = null;
        this.backgroundCtx = null;
        this.touchCanvas = null;
        this.touchCtx = null;
        this.particles = [];
        this.touchPoints = [];
        
        // Device Motion
        this.motionData = { x: 0, y: 0, z: 0 };
        this.lastMotion = Date.now();
        
        // Threat Symbols and States
        this.threatSymbols = {
            safe: ['✨', '🏔️', '😊', '💤'],
            low: ['🌊', '🏔️', '👁️'],
            moderate: ['👁️', '🌀', '⭕'],
            high: ['⚠️', '🌊', '🔥'],
            danger: ['💀', '👁️', '⚠️', '🌪️']
        };
        
        this.threatColors = {
            safe: ['#00ff88', '#ffffff', '#88ffaa'],
            low: ['#0088ff', '#00ff88', '#44aaff'],
            moderate: ['#ffff00', '#ff8800', '#ffaa44'],
            high: ['#ff8800', '#ff0000', '#ff6600'],
            danger: ['#ff0000', '#000000', '#660000']
        };

        // User feedback system
        this.statusMessages = [];
    }
    
    async initialize() {
        if (this.initialized) return;
        
        this.log('🚀 Initializing HumanERS components...');
        
        try {
            this.setupEventListeners();
            this.setupCanvas();
            this.setupAudioContext();
            this.showUserMessage('System ready! Click the start button to begin.', 'info');
            
            // Start the main loop
            this.startMainLoop();
            this.initialized = true;
            
            this.log('✅ HumanERS initialization complete');
        } catch (error) {
            this.log('❌ Initialization error:', error);
            this.showUserMessage('System started in limited mode. Some features may not work.', 'warning');
            // Continue with minimal functionality
            this.fallbackMode = true;
            this.initialized = true;
        }
    }

    log(message, data = null) {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] ${message}`, data || '');
        
        // Also show in UI if debug mode
        if (this.debugMode) {
            this.showUserMessage(message, 'debug');
        }
    }

    showUserMessage(message, type = 'info') {
        // Create or update status message area
        let statusArea = document.getElementById('statusMessages');
        if (!statusArea) {
            statusArea = document.createElement('div');
            statusArea.id = 'statusMessages';
            statusArea.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                z-index: 10000;
                max-width: 300px;
                pointer-events: none;
            `;
            document.body.appendChild(statusArea);
        }

        const messageEl = document.createElement('div');
        messageEl.style.cssText = `
            background: ${type === 'error' ? 'rgba(255, 0, 0, 0.9)' : 
                         type === 'warning' ? 'rgba(255, 255, 0, 0.9)' : 
                         type === 'success' ? 'rgba(0, 255, 0, 0.9)' : 
                         'rgba(0, 0, 255, 0.9)'};
            color: ${type === 'warning' ? '#000' : '#fff'};
            padding: 10px;
            margin: 5px 0;
            border-radius: 5px;
            font-size: 12px;
            border: 1px solid rgba(255, 255, 255, 0.3);
            backdrop-filter: blur(10px);
            animation: slideIn 0.3s ease-out;
        `;
        messageEl.textContent = message;
        statusArea.appendChild(messageEl);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.remove();
            }
        }, 5000);
    }
    
    setupEventListeners() {
        this.log('🔧 Setting up event listeners...');
        
        // Permission modal
        const startBtn = document.getElementById('grantPermissions');
        if (startBtn) {
            startBtn.addEventListener('click', () => this.requestPermissions());
        } else {
            this.log('⚠️ Start button not found');
        }
        
        // Touch events for canvas
        this.setupTouchEvents();
        
        // Device motion
        this.setupDeviceMotion();
        
        this.log('✅ Event listeners setup complete');
    }
    
    async requestPermissions() {
        const modal = document.getElementById('permissionModal');
        const mainInterface = document.getElementById('mainInterface');
        
        this.showUserMessage('Requesting permissions and loading AI models...', 'info');
        
        try {
            // Request permissions in parallel but don't fail if one fails
            const permissionPromises = [
                this.setupCamera().catch(e => this.log('⚠️ Camera setup failed:', e.message)),
                this.setupMicrophone().catch(e => this.log('⚠️ Microphone setup failed:', e.message))
            ];
            
            await Promise.allSettled(permissionPromises);
            
            // Load AI models with timeout
            this.showUserMessage('Loading AI models... This may take a moment.', 'info');
            await this.loadAIModelsWithTimeout();
            
            // Hide modal and show main interface
            if (modal) modal.classList.add('hidden');
            if (mainInterface) mainInterface.classList.remove('hidden');
            
            // Start the system
            this.startSystem();
            
            // Show success message
            const workingFeatures = this.getWorkingFeatures();
            this.showUserMessage(`System ready! Working features: ${workingFeatures.join(', ')}`, 'success');
            
        } catch (error) {
            this.log('❌ Permission setup failed:', error);
            this.showUserMessage('System started in fallback mode. Limited functionality available.', 'warning');
            
            // Continue with fallback mode
            this.fallbackMode = true;
            if (modal) modal.classList.add('hidden');
            if (mainInterface) mainInterface.classList.remove('hidden');
            this.startSystem();
        }
    }

    getWorkingFeatures() {
        const features = [];
        if (this.permissions.camera && this.models.faceApi.loaded) features.push('Emotion Detection');
        if (this.permissions.camera && this.models.handpose.loaded) features.push('Gesture Recognition');
        if (this.permissions.microphone) features.push('Audio Analysis');
        if (this.permissions.motion) features.push('Motion Detection');
        if (this.models.webgazer.loaded) features.push('Eye Tracking');
        if (features.length === 0) features.push('Visual Effects', 'Touch Interaction');
        return features;
    }

    async loadAIModelsWithTimeout() {
        const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Model loading timeout')), this.modelLoadTimeout)
        );

        const loadingPromises = [
            this.loadFaceAPIWithFallback(),
            this.loadHandposeWithFallback(),
            this.initWebGazerWithFallback()
        ];

        try {
            await Promise.race([
                Promise.allSettled(loadingPromises),
                timeout
            ]);
        } catch (error) {
            this.log('⚠️ Model loading timeout, continuing without some AI features');
        }
    }

    async loadFaceAPIWithFallback() {
        try {
            if (typeof faceapi === 'undefined') {
                throw new Error('Face-API.js library not loaded');
            }
            
            this.log('📥 Loading Face-API models...');
            const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
            
            // Load models with individual timeouts
            await Promise.race([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                new Promise((_, reject) => setTimeout(() => reject(new Error('TinyFaceDetector timeout')), 10000))
            ]);
            
            await Promise.race([
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                new Promise((_, reject) => setTimeout(() => reject(new Error('FaceLandmark timeout')), 10000))
            ]);
            
            await Promise.race([
                faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
                new Promise((_, reject) => setTimeout(() => reject(new Error('FaceExpression timeout')), 10000))
            ]);
            
            this.models.faceApi.loaded = true;
            this.models.faceApi.model = faceapi;
            this.updateStatusIndicator('camera-status', true);
            this.log('✅ Face-API models loaded successfully');
            
        } catch (error) {
            this.models.faceApi.error = error.message;
            this.log('❌ Face-API loading failed:', error.message);
            this.updateStatusIndicator('camera-status', false);
        }
    }

    async loadHandposeWithFallback() {
        try {
            if (typeof handpose === 'undefined') {
                throw new Error('HandPose library not loaded');
            }
            
            this.log('📥 Loading HandPose model...');
            this.models.handpose.model = await Promise.race([
                handpose.load(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('HandPose timeout')), 10000))
            ]);
            
            this.models.handpose.loaded = true;
            this.updateStatusIndicator('gesture-status', true);
            this.log('✅ HandPose model loaded successfully');
            
        } catch (error) {
            this.models.handpose.error = error.message;
            this.log('❌ HandPose loading failed:', error.message);
            this.updateStatusIndicator('gesture-status', false);
        }
    }

    async initWebGazerWithFallback() {
        try {
            if (typeof webgazer === 'undefined') {
                throw new Error('WebGazer library not loaded');
            }
            
            this.log('📥 Initializing WebGazer...');
            
            await Promise.race([
                webgazer.setGazeListener((data, elapsedTime) => {
                    if (data) {
                        this.eyePosition = {
                            x: data.x / window.innerWidth,
                            y: data.y / window.innerHeight
                        };
                    }
                }).begin(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('WebGazer timeout')), 10000))
            ]);
            
            // Hide WebGazer UI
            webgazer.showVideoPreview(false).showPredictionPoints(false);
            
            this.models.webgazer.loaded = true;
            this.models.webgazer.model = webgazer;
            this.updateStatusIndicator('eye-status', true);
            this.log('✅ WebGazer initialized successfully');
            
        } catch (error) {
            this.models.webgazer.error = error.message;
            this.log('❌ WebGazer initialization failed:', error.message);
            this.updateStatusIndicator('eye-status', false);
        }
    }

    setupCanvas() {
        this.log('🎨 Setting up canvas elements...');
        
        this.backgroundCanvas = document.getElementById('backgroundCanvas');
        this.touchCanvas = document.getElementById('touchCanvas');
        
        if (!this.backgroundCanvas) {
            this.log('⚠️ Background canvas not found, creating fallback');
            this.backgroundCanvas = this.createFallbackCanvas('backgroundCanvas');
        }
        
        if (!this.touchCanvas) {
            this.log('⚠️ Touch canvas not found, creating fallback');
            this.touchCanvas = this.createFallbackCanvas('touchCanvas');
        }
        
        try {
            this.backgroundCtx = this.backgroundCanvas.getContext('2d');
            this.touchCtx = this.touchCanvas.getContext('2d');
            
            this.resizeCanvas();
            window.addEventListener('resize', () => this.resizeCanvas());
            
            this.log('✅ Canvas setup complete');
        } catch (error) {
            this.log('❌ Canvas setup failed:', error);
        }
    }

    createFallbackCanvas(id) {
        const canvas = document.createElement('canvas');
        canvas.id = id;
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.pointerEvents = id === 'touchCanvas' ? 'auto' : 'none';
        canvas.style.zIndex = id === 'touchCanvas' ? '100' : '1';
        document.body.appendChild(canvas);
        return canvas;
    }

    resizeCanvas() {
        if (this.backgroundCanvas) {
            this.backgroundCanvas.width = window.innerWidth;
            this.backgroundCanvas.height = window.innerHeight;
        }
        if (this.touchCanvas) {
            this.touchCanvas.width = window.innerWidth;
            this.touchCanvas.height = window.innerHeight;
        }
    }

    setupAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            if (this.audioContext.state === 'suspended') {
                this.log('🔊 Audio context suspended, will resume on user interaction');
                
                // Resume on any user interaction
                const resumeAudio = () => {
                    if (this.audioContext.state === 'suspended') {
                        this.audioContext.resume().then(() => {
                            this.log('🔊 Audio context resumed');
                        });
                    }
                    document.removeEventListener('click', resumeAudio);
                    document.removeEventListener('touchstart', resumeAudio);
                };
                
                document.addEventListener('click', resumeAudio);
                document.addEventListener('touchstart', resumeAudio);
            }
            
            // Create analyser for breathing detection
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            
            this.log('✅ Audio context setup complete');
        } catch (error) {
            this.log('❌ Audio context setup failed:', error);
        }
    }

    async setupCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: 640, height: 480 } 
            });
            
            const video = document.getElementById('video');
            if (video) {
                video.srcObject = stream;
                video.onloadedmetadata = () => {
                    this.permissions.camera = true;
                    this.updateStatusIndicator('camera-status', true);
                    this.log('✅ Camera setup successful');
                };
            }
        } catch (error) {
            this.log('❌ Camera setup failed:', error.message);
            throw error;
        }
    }

    async setupMicrophone() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            if (this.audioContext) {
                this.microphone = this.audioContext.createMediaStreamSource(stream);
                this.microphone.connect(this.analyser);
                this.permissions.microphone = true;
                this.updateStatusIndicator('mic-status', true);
                this.log('✅ Microphone setup successful');
            }
        } catch (error) {
            this.log('❌ Microphone setup failed:', error.message);
            throw error;
        }
    }

    setupDeviceMotion() {
        if (typeof DeviceMotionEvent !== 'undefined') {
            // iOS 13+ requires permission
            if (typeof DeviceMotionEvent.requestPermission === 'function') {
                DeviceMotionEvent.requestPermission()
                    .then(permissionState => {
                        if (permissionState === 'granted') {
                            this.enableDeviceMotion();
                        }
                    })
                    .catch(console.error);
            } else {
                this.enableDeviceMotion();
            }
        }
    }

    enableDeviceMotion() {
        window.addEventListener('devicemotion', (event) => {
            const acceleration = event.accelerationIncludingGravity;
            if (acceleration) {
                this.motionData = {
                    x: acceleration.x || 0,
                    y: acceleration.y || 0,
                    z: acceleration.z || 0
                };
                
                const totalAcceleration = Math.sqrt(
                    this.motionData.x ** 2 + 
                    this.motionData.y ** 2 + 
                    this.motionData.z ** 2
                );
                
                if (totalAcceleration > 15) {
                    this.motionScore = Math.min(1.0, totalAcceleration / 20);
                    this.lastMotion = Date.now();
                }
                
                this.permissions.motion = true;
                this.updateStatusIndicator('motion-status', true);
            }
        });
    }

    updateStatusIndicator(className, active) {
        const indicator = document.querySelector(`.${className}`);
        if (indicator) {
            if (active) {
                indicator.classList.add('active');
                indicator.classList.remove('error');
            } else {
                indicator.classList.remove('active');
                indicator.classList.add('error');
            }
        }
    }

    startSystem() {
        this.log('🎬 Starting system components...');
        
        // Start AI processing loops
        if (this.permissions.camera) {
            if (this.models.faceApi.loaded) {
                this.startFaceDetection();
            } else {
                this.log('📺 Face detection unavailable - using fallback emotion simulation');
                this.startEmotionSimulation();
            }
            
            if (this.models.handpose.loaded) {
                this.startHandDetection();
            } else {
                this.log('✋ Hand detection unavailable - using fallback gesture simulation');
                this.startGestureSimulation();
            }
        }

        // Start rendering loop
        this.startRenderLoop();
        
        // Start threat assessment
        this.startThreatAssessment();
        
        this.log('🚀 System fully operational!');
    }

    // Fallback simulation methods for when AI models fail
    startEmotionSimulation() {
        setInterval(() => {
            // Simulate emotion changes based on user interaction
            const baseEmotion = 0.2;
            const randomVariation = (Math.random() - 0.5) * 0.1;
            const interactionBoost = this.touchPoints.length > 0 ? 0.2 : 0;
            
            this.emotionScore = Math.max(0, Math.min(1, baseEmotion + randomVariation + interactionBoost));
        }, 1000);
    }

    startGestureSimulation() {
        setInterval(() => {
            // Simulate gesture intensity based on touch activity
            const touchActivity = this.touchPoints.length / 10;
            const decay = 0.95;
            
            this.gestureScore = Math.max(0.1, this.gestureScore * decay + touchActivity);
        }, 100);
    }

    startFaceDetection() {
        const video = document.getElementById('video');
        if (!video || !this.models.faceApi.loaded) return;
        
        const detectFaces = async () => {
            try {
                if (video.readyState === 4) {
                    const detections = await this.models.faceApi.model
                        .detectAllFaces(video, new this.models.faceApi.model.TinyFaceDetectorOptions())
                        .withFaceExpressions();
                    
                    if (detections.length > 0) {
                        const expressions = detections[0].expressions;
                        this.processEmotions(expressions);
                    } else {
                        // Gradually decay emotion score when no face detected
                        this.emotionScore = Math.max(0.1, this.emotionScore * 0.98);
                    }
                }
            } catch (error) {
                this.log('❌ Face detection error:', error.message);
                // Switch to simulation mode on persistent errors
                this.startEmotionSimulation();
                return;
            }
            
            setTimeout(detectFaces, 100); // 10 FPS
        };
        
        detectFaces();
    }

    startHandDetection() {
        const video = document.getElementById('video');
        if (!video || !this.models.handpose.loaded) return;
        
        const detectHands = async () => {
            try {
                if (video.readyState === 4) {
                    const predictions = await this.models.handpose.model.estimateHands(video);
                    this.processGestures(predictions);
                }
            } catch (error) {
                this.log('❌ Hand detection error:', error.message);
                // Switch to simulation mode on persistent errors
                this.startGestureSimulation();
                return;
            }
            
            setTimeout(detectHands, 100); // 10 FPS
        };
        
        detectHands();
    }

    processEmotions(expressions) {
        try {
            const fearScore = (expressions.fearful || 0) + (expressions.surprised || 0) + (expressions.angry || 0);
            const calmScore = (expressions.happy || 0) + (expressions.neutral || 0);
            
            // Fear = high danger, calm = safety
            this.emotionScore = Math.min(1.0, fearScore * 2);
            
        } catch (error) {
            this.log('❌ Emotion processing error:', error.message);
        }
    }

    processGestures(predictions) {
        try {
            if (predictions.length === 0) {
                this.gestureScore = Math.max(0.1, this.gestureScore * 0.95); // Gradual decay
                return;
            }

            const hand = predictions[0];
            const landmarks = hand.landmarks;
            
            // Calculate gesture intensity based on hand movement
            const fingerSpread = this.calculateFingerSpread(landmarks);
            const handShake = this.calculateHandShake(landmarks);
            
            // Erratic movements = danger, calm = safety
            this.gestureScore = Math.min(1.0, (handShake + fingerSpread) / 2);
            
        } catch (error) {
            this.log('❌ Gesture processing error:', error.message);
        }
    }

    calculateFingerSpread(landmarks) {
        try {
            // Calculate distances between fingertips
            const fingertips = [4, 8, 12, 16, 20];
            let totalDistance = 0;
            
            for (let i = 0; i < fingertips.length - 1; i++) {
                const p1 = landmarks[fingertips[i]];
                const p2 = landmarks[fingertips[i + 1]];
                totalDistance += Math.sqrt((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2);
            }
            
            return Math.min(1.0, totalDistance / 500);
        } catch (error) {
            return 0;
        }
    }

    calculateHandShake(landmarks) {
        try {
            const wrist = landmarks[0];
            const currentTime = Date.now();
            
            if (!this.lastWristPosition) {
                this.lastWristPosition = { x: wrist[0], y: wrist[1], time: currentTime };
                return 0;
            }
            
            const timeDiff = currentTime - this.lastWristPosition.time;
            if (timeDiff < 50) return this.lastHandShake || 0; // Too soon
            
            const distance = Math.sqrt(
                (wrist[0] - this.lastWristPosition.x) ** 2 + 
                (wrist[1] - this.lastWristPosition.y) ** 2
            );
            
            const velocity = distance / timeDiff;
            this.lastWristPosition = { x: wrist[0], y: wrist[1], time: currentTime };
            this.lastHandShake = Math.min(1.0, velocity * 10);
            
            return this.lastHandShake;
        } catch (error) {
            return 0;
        }
    }

    setupTouchEvents() {
        const canvas = this.touchCanvas;
        if (!canvas) return;

        const addTouchPoint = (x, y) => {
            this.touchPoints.push({
                x, y,
                intensity: Math.random() * 0.5 + 0.5,
                life: 1.0,
                decay: 0.02
            });
        };

        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            for (let touch of e.touches) {
                const rect = canvas.getBoundingClientRect();
                addTouchPoint(touch.clientX - rect.left, touch.clientY - rect.top);
            }
        });

        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            for (let touch of e.touches) {
                const rect = canvas.getBoundingClientRect();
                addTouchPoint(touch.clientX - rect.left, touch.clientY - rect.top);
            }
        });

        canvas.addEventListener('mousedown', (e) => {
            const rect = canvas.getBoundingClientRect();
            addTouchPoint(e.clientX - rect.left, e.clientY - rect.top);
        });

        canvas.addEventListener('mousemove', (e) => {
            if (e.buttons > 0) {
                const rect = canvas.getBoundingClientRect();
                addTouchPoint(e.clientX - rect.left, e.clientY - rect.top);
            }
        });
    }

    startMainLoop() {
        const loop = () => {
            if (!this.paused) {
                this.updateParticles();
                this.updateTouchPoints();
                this.updateThreatLevel();
                this.render();
            }
            requestAnimationFrame(loop);
        };
        loop();
    }

    startRenderLoop() {
        // This is now handled by startMainLoop()
    }

    startThreatAssessment() {
        setInterval(() => {
            if (this.paused) return;
            
            // Combine all sensor inputs with weights (redistributed after removing breathing)
            const weights = {
                emotion: 0.5,
                gesture: 0.4,
                eye: 0.05,
                motion: 0.05
            };

            this.threatLevel = Math.min(1.0, 
                this.emotionScore * weights.emotion +
                this.gestureScore * weights.gesture +
                this.eyeScore * weights.eye +
                this.motionScore * weights.motion
            );

            this.updateThreatDisplay();
        }, 100);
    }

    updateThreatLevel() {
        // Smooth threat level transitions
        const targetThreat = this.threatLevel;
        const currentThreat = this.currentThreatLevel || this.threatLevel;
        this.currentThreatLevel = currentThreat + (targetThreat - currentThreat) * 0.1;
    }

    updateThreatDisplay() {
        const display = document.getElementById('threatSymbol');
        if (!display) return;

        const level = Math.floor(this.threatLevel * 5);
        const symbols = [
            this.threatSymbols.safe,
            this.threatSymbols.low,
            this.threatSymbols.moderate,
            this.threatSymbols.high,
            this.threatSymbols.danger
        ];

        const symbolSet = symbols[Math.min(level, symbols.length - 1)];
        const symbol = symbolSet[Math.floor(Math.random() * symbolSet.length)];
        display.textContent = symbol;
    }

    updateParticles() {
        // Add new particles based on threat level
        if (Math.random() < this.threatLevel * 0.1) {
            this.particles.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 1.0,
                decay: 0.01 + Math.random() * 0.02
            });
        }

        // Update existing particles
        this.particles = this.particles.filter(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life -= particle.decay;
            return particle.life > 0;
        });

        // Limit particle count
        if (this.particles.length > 200) {
            this.particles = this.particles.slice(-200);
        }
    }

    updateTouchPoints() {
        this.touchPoints = this.touchPoints.filter(point => {
            point.life -= point.decay;
            return point.life > 0;
        });
    }

    render() {
        if (!this.backgroundCtx || !this.touchCtx) return;

        // Clear canvases
        this.backgroundCtx.clearRect(0, 0, this.backgroundCanvas.width, this.backgroundCanvas.height);
        this.touchCtx.clearRect(0, 0, this.touchCanvas.width, this.touchCanvas.height);

        // Render background gradient based on threat level
        this.renderBackground();

        // Render particles
        this.renderParticles();

        // Render touch points
        this.renderTouchPoints();
    }

    renderBackground() {
        const level = Math.floor(this.threatLevel * 5);
        const colors = [
            this.threatColors.safe,
            this.threatColors.low,
            this.threatColors.moderate,
            this.threatColors.high,
            this.threatColors.danger
        ];

        const colorSet = colors[Math.min(level, colors.length - 1)];
        const gradient = this.backgroundCtx.createRadialGradient(
            window.innerWidth / 2, window.innerHeight / 2, 0,
            window.innerWidth / 2, window.innerHeight / 2, Math.max(window.innerWidth, window.innerHeight)
        );

        gradient.addColorStop(0, colorSet[0] + '40');
        gradient.addColorStop(1, colorSet[1] + '20');

        this.backgroundCtx.fillStyle = gradient;
        this.backgroundCtx.fillRect(0, 0, this.backgroundCanvas.width, this.backgroundCanvas.height);
    }

    renderParticles() {
        this.particles.forEach(particle => {
            this.backgroundCtx.save();
            this.backgroundCtx.globalAlpha = particle.life;
            this.backgroundCtx.fillStyle = '#ffffff';
            this.backgroundCtx.beginPath();
            this.backgroundCtx.arc(particle.x, particle.y, 2, 0, Math.PI * 2);
            this.backgroundCtx.fill();
            this.backgroundCtx.restore();
        });
    }

    renderTouchPoints() {
        this.touchPoints.forEach(point => {
            this.touchCtx.save();
            this.touchCtx.globalAlpha = point.life * point.intensity;
            this.touchCtx.fillStyle = '#ffffff';
            this.touchCtx.beginPath();
            this.touchCtx.arc(point.x, point.y, 10 * point.life, 0, Math.PI * 2);
            this.touchCtx.fill();
            this.touchCtx.restore();
        });
    }
}

// Initialize the system when the page loads
let survivalSystem;

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Starting Enhanced HumanERS System...');
    
    // Add CSS for animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        .status-dot.active {
            background: #00ff00 !important;
            animation: pulse 2s infinite;
        }
        .status-dot.error {
            background: #ff0000 !important;
            animation: shake 0.5s ease-in-out;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
        }
    `;
    document.head.appendChild(style);
    
    try {
        survivalSystem = new SurvivalSystem();
        survivalSystem.initialize();
        window.survivalSystem = survivalSystem;
        console.log('✅ Enhanced HumanERS System initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize Enhanced HumanERS:', error);
        // Try to show interface anyway for demo mode
        const modal = document.getElementById('permissionModal');
        const mainInterface = document.getElementById('mainInterface');
        if (modal) modal.classList.add('hidden');
        if (mainInterface) mainInterface.classList.remove('hidden');
    }
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (survivalSystem) {
        if (document.visibilityState === 'hidden') {
            survivalSystem.paused = true;
        } else if (document.visibilityState === 'visible') {
            survivalSystem.paused = false;
        }
    }
});

// Export for debugging
if (typeof window !== 'undefined') {
    window.survivalSystem = survivalSystem;
}
