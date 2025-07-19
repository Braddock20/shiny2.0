// server.js
const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const YT_API_KEY = process.env.YT_API_KEY;

// Enable CORS
app.use(cors());

// Utility: Extract ID from full URL
function getVideoId(url) {
  const match = url.match(/(?:v=|\/videos\/|embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function getPlaylistId(url) {
  const match = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

// 📺 Get Video Details
app.get('/api/video', async (req, res) => {
  const input = req.query.url || req.query.id;
  const videoId = input.length === 11 ? input : getVideoId(input);

  if (!videoId) return res.status(400).json({ error: 'Invalid video ID or URL' });

  const url = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,statistics,contentDetails&key=${YT_API_KEY}`;
  try {
    const response = await axios.get(url);
    const video = response.data.items[0];
    res.json({
      id: videoId,
      title: video.snippet.title,
      description: video.snippet.description,
      channelTitle: video.snippet.channelTitle,
      channelId: video.snippet.channelId,
      publishedAt: video.snippet.publishedAt,
      thumbnails: video.snippet.thumbnails,
      duration: video.contentDetails.duration,
      views: video.statistics.viewCount,
      likes: video.statistics.likeCount
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch video data', details: err.message });
  }
});

// 🎥 Search YouTube
app.get('/api/search', async (req, res) => {
  const { q, maxResults = 10, regionCode = 'US', order = 'relevance', type = 'video', pageToken = '' } = req.query;
  if (!q) return res.status(400).json({ error: 'Missing search query' });

  const url = `https://www.googleapis.com/youtube/v3/search?key=${YT_API_KEY}&part=snippet&q=${encodeURIComponent(q)}&type=${type}&regionCode=${regionCode}&order=${order}&maxResults=${maxResults}&pageToken=${pageToken}`;

  try {
    const response = await axios.get(url);
    const results = response.data.items.map(item => ({
      id: item.id.videoId || item.id.channelId || item.id.playlistId,
      type: item.id.kind.split('#')[1],
      title: item.snippet.title,
      description: item.snippet.description,
      channelTitle: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
      thumbnails: item.snippet.thumbnails
    }));
    res.json({ results, nextPageToken: response.data.nextPageToken });
  } catch (err) {
    res.status(500).json({ error: 'Search failed', details: err.message });
  }
});

// 📂 Playlist Info
app.get('/api/playlist', async (req, res) => {
  const input = req.query.url || req.query.id;
  const playlistId = input.length > 15 ? getPlaylistId(input) : input;
  if (!playlistId) return res.status(400).json({ error: 'Invalid playlist ID or URL' });

  const url = `https://www.googleapis.com/youtube/v3/playlistItems?key=${YT_API_KEY}&playlistId=${playlistId}&part=snippet&maxResults=50`;
  try {
    const response = await axios.get(url);
    const items = response.data.items.map(item => ({
      title: item.snippet.title,
      videoId: item.snippet.resourceId.videoId,
      thumbnails: item.snippet.thumbnails,
      channelTitle: item.snippet.videoOwnerChannelTitle,
      publishedAt: item.snippet.publishedAt
    }));
    res.json({ playlistId, items });
  } catch (err) {
    res.status(500).json({ error: 'Playlist fetch failed', details: err.message });
  }
});

// 👤 Channel Info
app.get('/api/channel', async (req, res) => {
  const channelId = req.query.id;
  if (!channelId) return res.status(400).json({ error: 'Missing channel ID' });

  const url = `https://www.googleapis.com/youtube/v3/channels?key=${YT_API_KEY}&part=snippet,statistics&id=${channelId}`;
  try {
    const response = await axios.get(url);
    const info = response.data.items[0];
    res.json({
      id: info.id,
      title: info.snippet.title,
      description: info.snippet.description,
      customUrl: info.snippet.customUrl,
      thumbnails: info.snippet.thumbnails,
      subscriberCount: info.statistics.subscriberCount,
      videoCount: info.statistics.videoCount,
      country: info.snippet.country
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch channel info', details: err.message });
  }
});

// 🧪 Debug Endpoint
app.get('/api/debug', (req, res) => {
  res.json({
    status: "Online",
    apiKey: YT_API_KEY.slice(0, 10) + "...",
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => console.log(`🚀 API server running on port ${PORT}`));
