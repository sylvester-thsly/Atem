const app = {
    state: {
        mode: null, // 'local', 'host', 'client'
        player: null,
        stream: null
    },

    elements: {
        startup: document.getElementById('startup-screen'),
        clientInput: document.getElementById('client-input'),
        videoContainer: document.getElementById('video-container'),
        localVideo: document.getElementById('local-video'),
        remoteCanvas: document.getElementById('remote-canvas'),
        hud: document.getElementById('hud-overlay'),
        modeBadge: document.getElementById('mode-badge'),
        timeDisplay: document.getElementById('time-display')
    },

    init: () => {
        // Start clock
        setInterval(app.updateTime, 1000);
        app.updateTime();

        // Check URL params for auto-connect (e.g. ?mode=client&ip=...)
        const params = new URLSearchParams(window.location.search);
        if (params.get('mode') === 'client') {
            document.getElementById('host-ip').value = params.get('ip') || window.location.hostname;
            app.startClientMode();
        }
    },

    updateTime: () => {
        const now = new Date();
        app.elements.timeDisplay.innerText = now.toLocaleTimeString();
    },

    // --- MODE 1: LOCAL CAPTURE (WebRTC) ---
    startLocalMode: async () => {
        try {
            console.log("Requesting Local Video...");
            const constraints = {
                video: {
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    frameRate: { ideal: 60 }
                },
                audio: false // Capture audio separately if needed
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            app.state.stream = stream;

            app.elements.localVideo.srcObject = stream;
            app.elements.localVideo.style.display = 'block';
            app.elements.localVideo.play();

            app.enterMode('local', 'Local Capture');

        } catch (err) {
            console.error("Local capture failed:", err);
            alert("Could not access capture card. Ensure no other apps are using it.\nError: " + err.message);
        }
    },

    // --- MODE 2: HOST MODE ---
    startHostMode: () => {
        // In Host Mode, this browser is just a client for its own local server
        // The server is ALREADY running if npm start was run.
        // So effectively, Host Mode == Client Mode connecting to localhost
        document.getElementById('host-ip').value = 'localhost';
        app.startClientMode('host');
    },

    // --- MODE 3: CLIENT MODE ---
    toggleClientInput: () => {
        const el = app.elements.clientInput;
        el.style.display = el.style.display === 'flex' ? 'none' : 'flex';
    },

    startClientMode: (variant = 'client') => {
        const ip = document.getElementById('host-ip').value || 'localhost';
        const url = `ws://${ip}:3001`; // Port is usually WebPort + 1 or defined in server

        console.log(`Connecting to WebSocket stream at ${url}...`);

        if (app.state.player) {
            app.state.player.destroy();
        }

        // Initialize JSMpeg
        // Note: The websocket port in server.js is the HTTP port (upgrade). 
        // Based on our server.js, the WS is on the SAME port as HTTP server? 
        // Let's check server.js logic. (Standard is one port upgrade).
        // Wait, standard server.js I wrote uses `ws` attached to `http` server.
        // So ws://<host>:3000/

        const wsUrl = `ws://${ip}:3000/`;

        app.state.player = new JSMpeg.Player(wsUrl, {
            canvas: app.elements.remoteCanvas,
            autoplay: true,
            audio: false,
            onSourceEstablished: () => {
                console.log("Stream connected!");
            }
        });

        app.elements.remoteCanvas.style.display = 'block';
        app.enterMode(variant, variant === 'host' ? 'Host Mode' : 'Network Client');
    },

    // --- UTILITIES ---
    enterMode: (modeKey, label) => {
        app.state.mode = modeKey;
        app.elements.startup.classList.add('hidden');
        app.elements.hud.classList.remove('hidden');

        app.elements.modeBadge.innerText = label;
        app.elements.modeBadge.className = `badge ${modeKey}`;

        // Auto hide cursor
        let timeout;
        document.body.addEventListener('mousemove', () => {
            document.body.style.cursor = 'default';
            app.elements.hud.style.opacity = '1';
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                document.body.style.cursor = 'none';
                app.elements.hud.style.opacity = '0';
            }, 3000);
        });
    },

    exitToMenu: () => {
        // Stop streams
        if (app.state.stream) {
            app.state.stream.getTracks().forEach(track => track.stop());
            app.state.stream = null;
        }
        if (app.state.player) {
            app.state.player.destroy();
            app.state.player = null;
        }

        // Hide video elements
        app.elements.localVideo.style.display = 'none';
        app.elements.remoteCanvas.style.display = 'none';

        // Show menu
        app.elements.startup.classList.remove('hidden');
        app.elements.hud.classList.add('hidden');
        document.body.style.cursor = 'default';
    },

    toggleFullscreen: () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(e => console.log(e));
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }
};

// Initialize
window.addEventListener('load', app.init);
