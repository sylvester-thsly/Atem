const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const { spawn } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

// ... rest of imports


const fs = require('fs');
const { Atem } = require('atem-connection');

const app = express();
const PORT = 3000;

// --- CONFIG MANAGEMENT ---
const CONFIG_FILE = path.join(__dirname, 'config.json');
let config = { atemIp: '192.168.1.50' };

try {
    if (fs.existsSync(CONFIG_FILE)) {
        config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
} catch (e) {
    console.error("Could not load config:", e);
}

// --- ATEM CONNECTION ---
const myAtem = new Atem();
let atemState = {
    preview: 0,
    program: 0,
    recording: false,
    streaming: false,
    inputs: {}
};
let atemConnected = false;

myAtem.on('connected', () => {
    atemConnected = true;
    console.log('✅ ATEM Connected!');

    // Populate initial inputs
    const inputs = myAtem.state.inputs;
    for (const id in inputs) {
        atemState.inputs[id] = inputs[id].shortName || `Cam ${id}`;
    }

    // Check initial status
    if (myAtem.state.recording) atemState.recording = myAtem.state.recording.status.state === 2; // 2 = Recording? Check docs or assume active
    if (myAtem.state.streaming) atemState.streaming = myAtem.state.streaming.status.state === 2;

    broadcastAtemState();
});

myAtem.on('disconnected', () => {
    atemConnected = false;
    console.log('❌ ATEM Disconnected');
});

myAtem.on('stateChanged', (state, pathToChange) => {
    let changed = false;

    // 1. Mix Effects (Cuts/Auto)
    const me = state.video.mixEffects[0];
    if (me) {
        if (atemState.preview !== me.previewInput) { atemState.preview = me.previewInput; changed = true; }
        if (atemState.program !== me.programInput) { atemState.program = me.programInput; changed = true; }
    }

    // 2. Input Names (Renaming)
    // simplistic check: if paths contain 'inputs'
    if (pathToChange.some(p => p.includes('inputs'))) {
        const inputs = state.inputs;
        for (const id in inputs) {
            const name = inputs[id].shortName;
            if (atemState.inputs[id] !== name) {
                atemState.inputs[id] = name;
                changed = true;
            }
        }
    }

    // 3. Recording/Streaming Status
    // Enum: 1=Idle, 2=Active (usually)
    if (state.recording && state.recording.status) {
        const isRec = state.recording.status.state === (1 << 1); // Often bitmask or enum. Let's assume > 0 or specific enum. 
        // Actually commonly: 0=Idle, 1=Booting, 2=Recording
        const isActive = state.recording.status.state === 2;
        if (atemState.recording !== isActive) { atemState.recording = isActive; changed = true; }
    }

    if (state.streaming && state.streaming.status) {
        const isActive = state.streaming.status.state === 2; // 2 = Streaming
        if (atemState.streaming !== isActive) { atemState.streaming = isActive; changed = true; }
    }

    if (changed) broadcastAtemState();
});

function connectAtem() {
    if (!config.atemIp) return;
    console.log(`Connecting to ATEM at ${config.atemIp}...`);
    myAtem.connect(config.atemIp).catch(e => {
        console.log("ATEM Connect Error (check IP in settings):", e.message);
    });
}

// Connect on startup
connectAtem();

// --- API ---
app.use(express.json());

// Get Settings
app.get('/api/settings', (req, res) => {
    res.json(config);
});

// Update Settings
app.post('/api/settings', (req, res) => {
    const newConfig = req.body;

    // Check if IP changed
    const ipChanged = newConfig.atemIp !== config.atemIp;

    config = { ...config, ...newConfig };

    // Save to file
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));

    if (ipChanged) {
        console.log("IP Changed, reconnecting ATEM...");
        myAtem.disconnect().then(() => {
            connectAtem();
        }).catch(() => connectAtem());
    }

    res.json({ success: true, config });
    console.log("Settings updated:", config);
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Create HTTP server for WebSocket
const server = http.createServer(app);
const wss = new WebSocket.Server({ server: server });

// Store connected clients
let videoClients = new Set();
let dataClients = new Set();
// Store ffmpeg process reference
let ffmpegProcess = null;

wss.on('connection', (ws, req) => {
    // Check which "Lane" the client wants to use
    if (req.url === '/data') {
        console.log('Client connected to DATA channel (Tally)');
        dataClients.add(ws);

        // Send initial state immediately
        ws.send(JSON.stringify({
            type: 'atem_state',
            data: atemState
        }));

        // Listen for Control Commands
        ws.on('message', (message) => {
            try {
                const cmd = JSON.parse(message);
                if (!atemConnected) return;

                if (cmd.type === 'change_preview') {
                    console.log(`Command: Preview ID ${cmd.input}`);
                    myAtem.changePreviewInput(cmd.input).catch(e => console.log(e));
                }
                else if (cmd.type === 'perform_cut') {
                    console.log('Command: CUT');
                    myAtem.cut().catch(e => console.log(e));
                }
                else if (cmd.type === 'perform_auto') {
                    console.log('Command: AUTO');
                    myAtem.autoTransition().catch(e => console.log(e));
                }
            } catch (e) { console.error(e); }
        });

        ws.on('close', () => dataClients.delete(ws));
    } else {
        console.log('Client connected to VIDEO channel');
        videoClients.add(ws);
        // Video clients just listen for binary data from ffmpeg
        ws.on('close', () => videoClients.delete(ws));
    }
});

server.listen(PORT, () => {
    console.log(`Web Interface running at http://localhost:${PORT}`);
    startStream();
});

// Function to find video device
function findVideoDevice() {
    return new Promise((resolve, reject) => {
        // Use ffmpeg to list devices
        // Command: ffmpeg -list_devices true -f dshow -i dummy
        const cmd = spawn(ffmpegPath, ['-list_devices', 'true', '-f', 'dshow', '-i', 'dummy']);
        let output = '';

        cmd.stderr.on('data', (data) => {
            output += data.toString();
        });

        cmd.on('close', (code) => {
            // Parse stderr for devices
            const lines = output.split('\n');
            let videoDevices = [];
            let isVideoSection = false;

            for (const line of lines) {
                if (line.includes('DirectShow video devices')) {
                    isVideoSection = true;
                    continue;
                }
                if (line.includes('DirectShow audio devices')) {
                    isVideoSection = false;
                    continue;
                }

                if (isVideoSection) {
                    if (line.includes('Alternative name')) continue;
                    const match = line.match(/"([^"]+)"/);
                    if (match) {
                        videoDevices.push(match[1]);
                    }
                }
            }

            console.log('Found video devices:', videoDevices);

            // Logic to pick the best device
            // Prioritize "USB Video" or "HDMI" or "Capture"
            const priorityTerms = ['USB', 'HDMI', 'Capture', 'Video'];

            // Filter out default webcams if possible? (Optional refinement)
            // For now, if we see "USB Video" (common generic name for capture cards), take it.
            const target = videoDevices.find(name =>
                priorityTerms.some(term => name.includes(term))
            );

            if (target) {
                resolve(target);
            } else if (videoDevices.length > 0) {
                // Fallback to first device
                resolve(videoDevices[0]);
            } else {
                reject(new Error('No video devices found'));
            }
        });

        cmd.on('error', (err) => {
            console.error('Error running ffmpeg. Is it installed?', err);
            reject(err);
        });
    });
}

async function startStream() {
    try {
        let deviceName = 'USB Video'; // Default fallback
        try {
            deviceName = await findVideoDevice();
            console.log(`Selected video device: "${deviceName}"`);
        } catch (e) {
            console.warn('No video device found. Waiting for device (retrying in 5s)...');
            setTimeout(startStream, 5000);
            return;
        }

        // Arguments for Real Capture
        const ffmpegArgs = [
            '-f', 'dshow',
            '-rtbufsize', '100M',
            '-i', `video=${deviceName}`,
            '-f', 'mpegts',
            '-codec:v', 'mpeg1video',
            '-s', '1920x1080',
            '-b:v', '4000k',
            '-bf', '0',
            '-r', '30',
            '-' // Output to stdout
        ];

        console.log(`Starting FFmpeg with args: ${ffmpegArgs.join(' ')}`);

        ffmpegProcess = spawn(ffmpegPath, ffmpegArgs);
        attachProcessEvents();

    } catch (err) {
        console.error('Failed to start stream:', err);
    }
}

function attachProcessEvents() {
    if (!ffmpegProcess) return;

    ffmpegProcess.stdout.on('data', (data) => {
        // Broadcast VIDEO data only to VIDEO clients
        for (const client of videoClients) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(data);
            }
        }
    });

    ffmpegProcess.stderr.on('data', (data) => {
        // Uncomment for debugging ffmpeg noise
        // console.log(`FFmpeg: ${data}`); 
    });

    ffmpegProcess.on('close', (code) => {
        console.log(`FFmpeg process exited with code ${code}`);
        // Auto restart after 5 seconds
        setTimeout(startStream, 5000);
    });
}

function broadcastAtemState() {
    const msg = JSON.stringify({
        type: 'atem_state',
        data: atemState
    });
    // Broadcast DATA messages only to DATA clients
    for (const client of dataClients) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(msg);
        }
    }
}

// placeholder to match brace structure manually if needed, but I'm replacing the block.
// To be safe I will just comment out the old spawn logic since I moved it to attachProcessEvents


// End of helper functions
