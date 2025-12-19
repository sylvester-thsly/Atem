# 📺 Open Multiview Monitor

**Turn any computer into a professional broadcast multiviewer for Blackmagic ATEM Switchers.**

Open Multiview is a lightweight, browser-based solution that captures your ATEM's video output and streams it to any device on your local network (iPads, Laptops, Phones) with **Live Smart Tally Lights**.

![Open Source](https://img.shields.io/badge/Open%20Source-Yes-green) ![ATEM](https://img.shields.io/badge/Works%20With-ATEM%20Mini%20%2F%20Extreme%20%2F%20Constellation-blue)

## ✨ Features

*   **🤑 Zero Cost Hardware**: Replaces expensive Smartview monitors ($500+) with a cheap USB Capture Card.
*   **📡 Team Wireless**: Stream the multiview to the Producer, Audio Engineer, or Stage Manager via Wi-Fi.
*   **🔴 Live Tally Lights**: Syncs directly with your ATEM Switcher. Borders turn **Red (Program)** and **Green (Preview)** instantly when you cut.
*   **⚡ Low Latency**: Uses FFmpeg > MPEG-TS > JSMpeg for fast local streaming.
*   **📱 Cross Platform**: Works on any device with a modern browser (iOS, Android, Windows, Mac).
*   **⚙️ Easy Config**: Built-in Settings UI to connect to your specific ATEM IP address.

## 🛠️ Hardware Requirements

1.  **Host Computer** (Windows/Mac/Linux) running this software.
2.  **USB HDMI Capture Card** (standard "Cam Link" or generic $15 cards).
3.  **HDMI Cable** from ATEM "Multiview Out" → Capture Card.

## 🚀 Quick Start

### 1. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/[YOUR_USERNAME]/open-multiview-monitor.git
cd open-multiview-monitor
npm install
```

### 2. Run
Connect your capture card and start the server:
```bash
npm start
```
*The app will automatically detect your USB capture device.*

### 3. Connect
*   **Local Host**: Open `http://localhost:3000`
*   **Network**: Open `http://[YOUR_COMPUTER_IP]:3000` on any device.

### 4. Configure Tally
Click the **Gear Icon (⚙)** in the bottom right corner and enter your ATEM Switcher's IP Address (e.g., `192.168.10.50`).

## 🔧 Roadmap
*   [ ] Audio Level Meters (VU)
*   [ ] Click-to-Cut (Remote Switching)
*   [ ] Custom Layouts (2x2, Pip)

## 📄 License
MIT License. Free to use for Churches, Schools, and Broadcasters.
