/**
 * HumanERS Frontend - Connects to Python Flask Backend for AI Processing
 */

class HumanERSClient {
    constructor() {
        this.backendUrl = 'http://localhost:5000';
        this.canvas = null;
        this.ctx = null;
        this.video = null;
        this.stream = null;
        
        // State
        this.isProcessing = false;
        this.lastAnalysis = {
            emotions: { neutral: 1.0 },
            gestures: { gesture_intensity: 0.0 },
            breathing: { breathing_rate: 60 }
        };
        
        // Visual elements
        this.particles = [];
        this.threatLevel = 0.2;
        
        this.init();
    }
    
    async init() {
        console.log('Initializing HumanERS Client...');
        
        try {
            // Check backend health
            await this.checkBackendHealth();
            
            // Setup UI
            this.setupCanvas();
            this.setupVideo();
            this.setupUI();
            
            // Start main loop
            this.startMainLoop();
            
            console.log('HumanERS Client initialized successfully!');
        } catch (error) {
            console.error('Initialization failed:', error);
            this.showError('Failed to connect to AI backend. Make sure Flask server is running.');
        }
    }
    
    async checkBackendHealth() {
        try {
            const response = await fetch(`${this.backendUrl}/api/health`);
            const data = await response.json();
            
            if (data.status === 'healthy') {
                console.log('Backend AI models loaded:', data.ai_models);
                this.updateStatus('Backend Connected ✅');
            } else {
                throw new Error('Backend not healthy');
            }
        } catch (error) {
            throw new Error(`Backend connection failed: ${error.message}`);
        }
    }
    
    setupCanvas() {
        this.canvas = document.getElementById('mainCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        if (!this.canvas) {
            console.error('Canvas not found');
            return;
        }
        
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    async setupVideo() {
        try {
            this.video = document.getElementById('video');
            if (!this.video) {
                console.error('Video element not found');
                return;
            }
            
            // Get camera stream
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480 },
                audio: true
            });
            
            this.video.srcObject = this.stream;
            this.video.play();
            
            this.updateStatus('Camera Connected ✅');
            
            // Start analysis when video is ready
            this.video.addEventListener('loadedmetadata', () => {
                this.startAnalysis();
            });
            
        } catch (error) {
            console.error('Camera setup failed:', error);
            this.showError('Camera access denied. Please allow camera permissions.');
        }
    }
    
    setupUI() {
        // Create control panel
        const controlPanel = document.createElement('div');
        controlPanel.className = 'control-panel';
        controlPanel.innerHTML = `
            <div class="status-panel">
                <h3>HumanERS AI System</h3>
                <div id="status">Initializing...</div>
                <div id="threat-level">Threat Level: Safe ✨</div>
                <div id="emotions">Emotions: Neutral</div>
                <div id="gestures">Gestures: Calm</div>
                <div id="breathing">Breathing: Normal (60 BPM)</div>
            </div>
            <div class="controls">
                <button id="startBtn">Start Analysis</button>
                <button id="stopBtn">Stop Analysis</button>
                <button id="resetBtn">Reset</button>
            </div>
        `;
        
        document.body.appendChild(controlPanel);
        
        // Add event listeners
        document.getElementById('startBtn').addEventListener('click', () => this.startAnalysis());
        document.getElementById('stopBtn').addEventListener('click', () => this.stopAnalysis());
        document.getElementById('resetBtn').addEventListener('click', () => this.reset());
    }
    
    async startAnalysis() {
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        this.updateStatus('Analyzing... 🔄');
        
        // Start periodic analysis
        this.analysisInterval = setInterval(() => {
            this.analyzeFrame();
        }, 500); // Analyze every 500ms
    }
    
    stopAnalysis() {
        this.isProcessing = false;
        if (this.analysisInterval) {
            clearInterval(this.analysisInterval);
        }
        this.updateStatus('Analysis Stopped ⏹️');
    }
    
    async analyzeFrame() {
        if (!this.video || !this.isProcessing) return;
        
        try {
            // Capture frame from video
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = this.video.videoWidth;
            canvas.height = this.video.videoHeight;
            
            ctx.drawImage(this.video, 0, 0);
            const imageData = canvas.toDataURL('image/jpeg', 0.8);
            
            // Analyze face emotions
            const emotions = await this.analyzeFace(imageData);
            
            // Analyze hand gestures
            const gestures = await this.analyzeHands(imageData);
            
            // Update state
            this.lastAnalysis.emotions = emotions.emotions || { neutral: 1.0 };
            this.lastAnalysis.gestures = gestures.gesture_data || { gesture_intensity: 0.0 };
            
            // Calculate threat level
            this.updateThreatLevel();
            
            // Update UI
            this.updateDisplays();
            
        } catch (error) {
            console.error('Frame analysis error:', error);
        }
    }
    
    async analyzeFace(imageData) {
        try {
            const response = await fetch(`${this.backendUrl}/api/analyze_face`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ image: imageData })
            });
            
            return await response.json();
        } catch (error) {
            console.error('Face analysis error:', error);
            return { emotions: { neutral: 1.0 } };
        }
    }
    
    async analyzeHands(imageData) {
        try {
            const response = await fetch(`${this.backendUrl}/api/analyze_hands`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ image: imageData })
            });
            
            return await response.json();
        } catch (error) {
            console.error('Hand analysis error:', error);
            return { gesture_data: { gesture_intensity: 0.0 } };
        }
    }
    
    updateThreatLevel() {
        const emotions = this.lastAnalysis.emotions;
        const gestureIntensity = this.lastAnalysis.gestures.gesture_intensity || 0;
        
        // Calculate threat based on emotions and gestures
        const fearScore = (emotions.fearful || 0) + (emotions.angry || 0) + (emotions.surprised || 0);
        const calmScore = (emotions.happy || 0) + (emotions.neutral || 0);
        
        // Combine all factors
        this.threatLevel = Math.min(1.0, (fearScore * 0.6) + (gestureIntensity * 0.4));
    }
    
    updateDisplays() {
        // Update threat level display
        const threatSymbols = {
            0: '✨ Safe',
            1: '🏔️ Low',
            2: '👁️ Moderate', 
            3: '⚠️ High',
            4: '💀 Maximum'
        };
        
        const level = Math.floor(this.threatLevel * 5);
        const symbol = threatSymbols[Math.min(4, level)];
        
        document.getElementById('threat-level').textContent = `Threat Level: ${symbol}`;
        
        // Update emotions display
        const dominantEmotion = this.getDominantEmotion();
        document.getElementById('emotions').textContent = `Emotions: ${dominantEmotion}`;
        
        // Update gestures display
        const gestureIntensity = this.lastAnalysis.gestures.gesture_intensity || 0;
        const gestureState = gestureIntensity > 0.5 ? 'Active' : 'Calm';
        document.getElementById('gestures').textContent = `Gestures: ${gestureState}`;
        
        // Update breathing display
        const breathingRate = this.lastAnalysis.breathing.breathing_rate || 60;
        document.getElementById('breathing').textContent = `Breathing: ${Math.round(breathingRate)} BPM`;
    }
    
    getDominantEmotion() {
        const emotions = this.lastAnalysis.emotions;
        let maxEmotion = 'neutral';
        let maxValue = 0;
        
        for (const [emotion, value] of Object.entries(emotions)) {
            if (value > maxValue) {
                maxValue = value;
                maxEmotion = emotion;
            }
        }
        
        return maxEmotion.charAt(0).toUpperCase() + maxEmotion.slice(1);
    }
    
    startMainLoop() {
        const render = () => {
            this.renderBackground();
            this.updateParticles();
            this.renderParticles();
            requestAnimationFrame(render);
        };
        render();
    }
    
    renderBackground() {
        const gradient = this.ctx.createRadialGradient(
            this.canvas.width / 2, this.canvas.height / 2, 0,
            this.canvas.width / 2, this.canvas.height / 2, Math.max(this.canvas.width, this.canvas.height)
        );
        
        // Color based on threat level
        const colors = [
            ['#00ff88', '#ffffff'], // Safe: green to white
            ['#0088ff', '#00ff88'], // Low: blue to green
            ['#ffff00', '#ff8800'], // Moderate: yellow to orange
            ['#ff8800', '#ff0000'], // High: orange to red
            ['#ff0000', '#000000']  // Max: red to black
        ];
        
        const colorIndex = Math.floor(this.threatLevel * 4);
        const colorPair = colors[Math.min(4, colorIndex)];
        
        gradient.addColorStop(0, colorPair[0]);
        gradient.addColorStop(1, colorPair[1]);
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    updateParticles() {
        // Add particles based on threat level
        if (Math.random() < this.threatLevel * 0.1) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 10 + 5,
                speed: Math.random() * 3 + 1,
                opacity: 1.0,
                hue: this.threatLevel * 360
            });
        }
        
        // Update existing particles
        this.particles = this.particles.filter(particle => {
            particle.y -= particle.speed;
            particle.opacity -= 0.01;
            particle.size *= 0.99;
            
            return particle.opacity > 0 && particle.size > 0.5;
        });
    }
    
    renderParticles() {
        this.particles.forEach(particle => {
            this.ctx.save();
            this.ctx.globalAlpha = particle.opacity;
            this.ctx.fillStyle = `hsl(${particle.hue}, 100%, 50%)`;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });
    }
    
    updateStatus(message) {
        const statusElement = document.getElementById('status');
        if (statusElement) {
            statusElement.textContent = message;
        }
    }
    
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ff4444;
            color: white;
            padding: 15px;
            border-radius: 5px;
            z-index: 1000;
        `;
        
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            document.body.removeChild(errorDiv);
        }, 5000);
    }
    
    reset() {
        this.threatLevel = 0.2;
        this.particles = [];
        this.lastAnalysis = {
            emotions: { neutral: 1.0 },
            gestures: { gesture_intensity: 0.0 },
            breathing: { breathing_rate: 60 }
        };
        this.updateDisplays();
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    new HumanERSClient();
});
