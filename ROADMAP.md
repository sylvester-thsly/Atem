# Future Roadmap & Upgrades

This project is a solid foundation. Here is how we can upgrade it to a professional "Broadcast Grade" system:

## 1. Local Network Tally Lights (Integration with ATEM)
Currently, the Red/Green borders are static.
*   **Upgrade**: Use the `atem-connection` Node.js library to connect to the ATEM switcher over the network.
*   **Result**: When you cut to Camera 1 on the actual switcher, the border on the web page turns RED in real-time. This turns every phone/tablet into a "Smart Tally" for camera operators!

## 2. Audio Monitoring (VU Meters)
We currently muted audio to keep latency low.
*   **Upgrade**: Enable AAC audio streaming in FFmpeg.
*   **Result**: Add animated green/yellow/red audio bars overlaying the Program window so you can visually check levels remotely.

## 3. Remote Camera Switching
*   **Upgrade**: Add clickable "Cut" and "Auto" buttons under each camera view.
*   **Result**: The web interface becomes a functional Control Panel. You could switch the show from an iPad in the audience!

## 4. Low-Latency WebRTC (Phase 2)
JSMpeg (current) is great (~200ms latency), but WebRTC is faster (<50ms).
*   **Upgrade**: Switch streaming backend to a `pion` or `gstreamer` based WebRTC signaling server.
*   **Result**: Near-instant video, perfect for camera operators focusing manual focus.

## 5. Cloud Relay
*   **Upgrade**: Push the stream to a simple cloud relay (RTMP).
*   **Result**: The Production Director can watch the Multiview from home, not just the local church building.
