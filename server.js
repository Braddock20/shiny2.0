// server.js (Upgraded All-in-One Display API)
const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const YT_API_KEY = process.env.YT_API_KEY;

app.use(cors());

// 🔧 Utility: Extract video or playlist ID from URL
function getVideoId(url) {
  const match = url.match(/(?:v=|\/videos\/|embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}
function getPlaylistId(url) {
  const match = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}
function parseDuration(isoDuration) {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  const [, h, m, s] = match.map(x => parseInt(x || 0));
  return h ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` : `${m}:${s.toString().padStart(2, '0')}`;
}

// ✅ 1. Search Videos
app.get('/api/search', async (req, res) => {
  const { q, maxResults = 10, regionCode = 'US', order = 'relevance', type = 'video', pageToken = '' } = req.query;
  if (!q) return res.status(400).json({ error: 'Missing search query' });

  const url = `https://www.googleapis.com/youtube/v3/search?key=${YT_API_KEY}&part=snippet&q=${encodeURIComponent(q)}&type=${type}&regionCode=${regionCode}&order=${order}&maxResults=${maxResults}&pageToken=${pageToken}`;

  try {
    const response = await axios.get(url);
    const results = response.data.items.map(item => ({
      id: item.id.videoId,
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

// ✅ 2. Get Video Details
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

// ✅ 3. Trending Videos
app.get('/api/trending', async (req, res) => {
  const { regionCode = 'US', maxResults = 10 } = req.query;
  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&chart=mostPopular&regionCode=${regionCode}&maxResults=${maxResults}&key=${YT_API_KEY}`;
  try {
    const response = await axios.get(url);
    const videos = response.data.items.map(video => ({
      id: video.id,
      title: video.snippet.title,
      description: video.snippet.description,
      channelTitle: video.snippet.channelTitle,
      thumbnails: video.snippet.thumbnails,
      views: video.statistics.viewCount,
      duration: video.contentDetails.duration
    }));
    res.json(videos);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch trending videos', details: err.message });
  }
});

// ✅ 4. Comments
app.get('/api/video/comments', async (req, res) => {
  const videoId = req.query.id;
  if (!videoId) return res.status(400).json({ error: 'Missing video ID' });
  const url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=20&key=${YT_API_KEY}`;
  try {
    const response = await axios.get(url);
    const comments = response.data.items.map(item => ({
      author: item.snippet.topLevelComment.snippet.authorDisplayName,
      text: item.snippet.topLevelComment.snippet.textDisplay,
      likeCount: item.snippet.topLevelComment.snippet.likeCount,
      publishedAt: item.snippet.topLevelComment.snippet.publishedAt
    }));
    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch comments', details: err.message });
  }
});

// ✅ 5. Playlist Items
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

// ✅ 6. Channel Info
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

// ✅ 7. Channel Videos
app.get('/api/channel/videos', async (req, res) => {
  const channelId = req.query.id;
  if (!channelId) return res.status(400).json({ error: 'Missing channel ID' });

  const url = `https://www.googleapis.com/youtube/v3/search?key=${YT_API_KEY}&channelId=${channelId}&part=snippet,id&order=date&maxResults=12`;
  try {
    const response = await axios.get(url);
    const videos = response.data.items
      .filter(item => item.id.kind === 'youtube#video')
      .map(item => ({
        id: item.id.videoId,
        title: item.snippet.title,
        thumbnails: item.snippet.thumbnails,
        publishedAt: item.snippet.publishedAt
      }));
    res.json(videos);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch channel videos', details: err.message });
  }
});

// ✅ 8. Related Videos
app.get('/api/related', async (req, res) => {
  const videoId = req.query.id;
  if (!videoId) return res.status(400).json({ error: 'Missing video ID' });
  const url = `https://www.googleapis.com/youtube/v3/search?relatedToVideoId=${videoId}&type=video&part=snippet&maxResults=10&key=${YT_API_KEY}`;
  try {
    const response = await axios.get(url);
    const related = response.data.items.map(item => ({
      id: item.id.videoId,
      title: item.snippet.title,
      thumbnails: item.snippet.thumbnails,
      channelTitle: item.snippet.channelTitle
    }));
    res.json(related);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch related videos', details: err.message });
  }
});

// ✅ 9. Music Charts
app.get('/api/music-charts', async (req, res) => {
  const { regionCode = 'US', maxResults = 10 } = req.query;
  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&videoCategoryId=10&regionCode=${regionCode}&maxResults=${maxResults}&key=${YT_API_KEY}`;
  try {
    const response = await axios.get(url);
    const music = response.data.items.map(video => ({
      id: video.id,
      title: video.snippet.title,
      artist: video.snippet.channelTitle,
      thumbnails: video.snippet.thumbnails,
      views: video.statistics.viewCount
    }));
    res.json(music);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch music chart', details: err.message });
  }
});

// ✅ 10. Shorts
app.get('/api/shorts', async (req, res) => {
  const q = req.query.q;
  if (!q) return res.status(400).json({ error: 'Missing search term' });

  const url = `https://www.googleapis.com/youtube/v3/search?key=${YT_API_KEY}&q=${encodeURIComponent(q)}&part=snippet&type=video&maxResults=15`;
  try {
    const response = await axios.get(url);
    const shortList = response.data.items.map(item => ({
      id: item.id.videoId,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      thumbnails: item.snippet.thumbnails
    }));
    res.json(shortList);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch shorts', details: err.message });
  }
});

// ✅ 11. Random Trending Video
app.get('/api/random', async (req, res) => {
  const regionCode = req.query.regionCode || 'US';
  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=${regionCode}&maxResults=25&key=${YT_API_KEY}`;
  try {
    const response = await axios.get(url);
    const items = response.data.items;
    const random = items[Math.floor(Math.random() * items.length)];
    res.json({
      id: random.id,
      title: random.snippet.title,
      thumbnails: random.snippet.thumbnails,
      channelTitle: random.snippet.channelTitle
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch random video', details: err.message });
  }
});

// ✅ 12. Duration Parsed
app.get('/api/video/parsed-duration', async (req, res) => {
  const videoId = req.query.id;
  if (!videoId) return res.status(400).json({ error: 'Missing video ID' });

  const url = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=contentDetails&key=${YT_API_KEY}`;
  try {
    const response = await axios.get(url);
    const iso = response.data.items[0].contentDetails.duration;
    const readable = parseDuration(iso);
    res.json({ duration: readable });
  } catch (err) {
    res.status(500).json({ error: 'Failed to parse duration', details: err.message });
  }
});

// ✅ 13. Suggestions
app.get('/api/suggest', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: 'Missing search query' });
  try {
    const response = await axios.get('https://suggestqueries.google.com/complete/search', {
      params: {
        client: 'youtube',
        ds: 'yt',
        q: query
      }
    });
    res.json({ suggestions: response.data[1] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch suggestions', details: err.message });
  }
});

// ✅ Debug Route
app.get('/api/debug', (req, res) => {
  res.json({
    status: 'Online',
    apiKey: YT_API_KEY.slice(0, 10) + '...',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => console.log(`🚀 API server running on port ${PORT}`));
