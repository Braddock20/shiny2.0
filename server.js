const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static('public'));

app.get('/api/download', (req, res) => {
  const { url, format } = req.query;
  if (!url || !format) return res.status(400).json({ error: 'Missing URL or format' });

  const ext = format === 'mp3' ? 'mp3' : 'mp4';
  const cmd = `yt-dlp -f bestaudio[ext=m4a]+bestvideo[ext=mp4]/best --extract-audio --audio-format ${ext} -o - "${url}"`;

  const stream = exec(cmd, { maxBuffer: 1024 * 5000 });

  res.setHeader('Content-Disposition', `attachment; filename="video.${ext}"`);
  res.setHeader('Content-Type', format === 'mp3' ? 'audio/mpeg' : 'video/mp4');

  stream.stdout.pipe(res);
  stream.stderr.on('data', data => console.error('yt-dlp error:', data.toString()));
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
