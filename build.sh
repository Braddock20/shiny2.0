#!/bin/bash

# Exit on any error
set -e

echo "🔧 Starting custom build..."

# Update system & install dependencies
apt-get update && apt-get install -y curl ffmpeg python3 python3-pip

# Install yt-dlp
pip install -U yt-dlp

# Optional: Create downloads folder
mkdir -p downloads

# Finish message
echo "✅ Build completed. yt-dlp is installed."
