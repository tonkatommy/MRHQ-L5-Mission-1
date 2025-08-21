const express = require("express");
const multer = require("multer");
const path = require("path");

const app = express();
const upload = multer({ dest: "uploads/" });

// Serve static files
app.use(express.static("public"));

// Your prediction endpoint
app.post("/api/predict", upload.single("image"), async (req, res) => {
  try {
    // Use your existing prediction code here
    const results = await classifyImage(req.file.path);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
