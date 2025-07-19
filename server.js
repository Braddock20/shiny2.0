const express = require("express");
const { spawn } = require("child_process");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static("public")); // for frontend

// GET streaming link via yt-dlp -g
app.get("/api/get-url", (req, res) => {
  const videoURL = req.query.url;
  const format = req.query.format === "mp3" ? "bestaudio[ext=m4a]" : "best[ext=mp4]";

  if (!videoURL) return res.status(400).json({ error: "URL is required" });

  const ytdlp = spawn("yt-dlp", ["-f", format, "-g", videoURL]);

  let output = "";
  ytdlp.stdout.on("data", data => output += data.toString());

  ytdlp.stderr.on("data", data => console.error("yt-dlp error:", data.toString()));

  ytdlp.on("close", code => {
    if (code === 0) {
      res.json({ url: output.trim() });
    } else {
      res.status(500).json({ error: "Failed to retrieve media link" });
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
