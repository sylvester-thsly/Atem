# ATEM Multiview Monitor (Web)

This application captures video from a USB HDMI capture card and streams it to a web browser on your local network.

## Prerequisites

### 1. Install Node.js
If you haven't already, install Node.js from [nodejs.org](https://nodejs.org/).

### 2. Install FFmpeg
**Automatic**: I have included a portable version of FFmpeg in the project, so you do **NOT** need to install it manually anymore! The app will automatically use the included version.

## Setup

1.  Open this folder in your terminal (PowerShell or Command Prompt).
2.  Install dependencies:
    ```bash
    npm install
    ```

## Usage

1.  Connect your USB HDMI Capture Card.
2.  Run the server:
    ```bash
    npm start
    ```
    *   The app will attempt to automatically find your USB video device.
    *   Watch the console output. If it sees your device, it will say "Selected video device: ...".
3.  Open your browser and go to:
    *   [http://localhost:3000](http://localhost:3000)

## Troubleshooting

*   **No video found?**
    Check the terminal output. It lists all available video devices. If your device has a specific name not containing "USB", "HDMI", or "Capture", you may need to edit `server.js` manually to set `deviceName` to the exact name shown in the detected list.
*   **Latency?**
    The system is optimized for low latency (<500ms). If it lags, try connecting via Ethernet instead of Wi-Fi.
