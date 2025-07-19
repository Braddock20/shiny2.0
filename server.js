const express = require("express");
const cors = require("cors");
const { exec } = require("child_process");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

app.get("/api/download", (req, res) => {
  const videoUrl = req.query.url;
  const format = req.query.format || "mp3";

  if (!videoUrl) return res.status(400).json({ error: "URL is required" });

  const isAudio = format === "mp3";
  const ytCommand = `yt-dlp ${isAudio ? "--extract-audio --audio-format mp3" : ""} -o - "${videoUrl}"`;

  res.setHeader("Content-Disposition", `inline; filename="stream.${isAudio ? "mp3" : "mp4"}"`);
  res.setHeader("Content-Type", isAudio ? "audio/mpeg" : "video/mp4");

  const process = exec(ytCommand);
  process.stdout.pipe(res);
  process.stderr.on("data", (data) => console.error(data.toString()));
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});