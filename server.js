require("dotenv").config();  // Load .env at the very top

const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");
const cors = require("cors");

const app = express();
app.use(cors());

// Multer config (with safe file size limit)
if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");
const upload = multer({ dest: "uploads/", limits: { fileSize: 5 * 1024 * 1024 } });

// Roboflow config from .env
const ROBOFLOW_API_KEY = process.env.ROBOFLOW_API_KEY;
const ROBOFLOW_API_URL = process.env.ROBOFLOW_API_URL;

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Server running" });
});
// /detect endpoint
app.post("/detect", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    const imagePath = req.file.path;

    const form = new FormData();
    form.append("file", fs.createReadStream(imagePath));

    const response = await axios.post(
      `${ROBOFLOW_API_URL}?api_key=${ROBOFLOW_API_KEY}`,
      form,
      { headers: form.getHeaders() }
    );

    // Clean up temp file asynchronously
    fs.unlink(imagePath, err => {
      if (err) console.error("Failed to delete temp file:", err);
    });

    const predictions = response.data.predictions || [];
    const detectedClasses = predictions.map(pred => pred.class || pred.label || "unknown");

    res.json({
      status: "success",
      message: "Detection completed successfully",
      classes: detectedClasses,
      data: response.data
    });

  } catch (err) {
    console.error("🔴 Detection error:", err.message);
    res.status(500).json({
      status: "error",
      error: "Detection failed",
      details: err.message
    });
  }
});

// Start server (no hardcoded IP)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
