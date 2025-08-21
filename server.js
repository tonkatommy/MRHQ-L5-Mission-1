const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const PredictionApi = require("@azure/cognitiveservices-customvision-prediction");
const msRest = require("@azure/ms-rest-js");

// Import Dotenv
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configure multer for file uploads
const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check if file is an image
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"), false);
    }
  },
});

// Azure Custom Vision configuration
const predictionKey = process.env.VISION_PREDICTION_KEY;
const predictionEndpoint = process.env.VISION_PREDICTION_ENDPOINT;
const projectId = process.env.VISION_PROJECT_ID;
const publishIterationName = process.env.PUBLISH_ITERATION_NAME;

// Validate environment variables
if (!predictionKey || !predictionEndpoint || !projectId) {
  console.error("Missing required environment variables:");
  console.error("VISION_PREDICTION_KEY:", !!predictionKey);
  console.error("VISION_PREDICTION_ENDPOINT:", !!predictionEndpoint);
  console.error("VISION_PROJECT_ID:", !!projectId);
  process.exit(1);
}

// Initialize Azure Custom Vision client
const predictor_credentials = new msRest.ApiKeyCredentials({
  inHeader: { "Prediction-key": predictionKey },
});
const predictor = new PredictionApi.PredictionAPIClient(predictor_credentials, predictionEndpoint);

// Serve static files (your frontend)
app.use(express.static("public"));

// Create uploads directory if it doesn't exist
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    config: {
      hasKey: !!predictionKey,
      hasEndpoint: !!predictionEndpoint,
      hasProjectId: !!projectId,
      iterationName: publishIterationName,
    },
  });
});

// Prediction endpoint
app.post("/api/predict", upload.single("image"), async (req, res) => {
  let uploadedFilePath = null;

  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        error: "No image file uploaded",
        details: "Please select an image file to upload",
      });
    }

    uploadedFilePath = req.file.path;
    console.log(`Processing image: ${req.file.originalname} (${req.file.size} bytes)`);

    // Read the uploaded file
    const imageBuffer = fs.readFileSync(uploadedFilePath);

    console.log(`Making prediction for project: ${projectId}, iteration: ${publishIterationName}`);

    // Make prediction using Azure Custom Vision
    const results = await predictor.classifyImage(projectId, publishIterationName, imageBuffer);

    console.log(`Received ${results.predictions.length} predictions`);

    // Format response
    const response = {
      success: true,
      predictions: results.predictions.map((pred) => ({
        tagName: pred.tagName,
        probability: pred.probability,
      })),
      metadata: {
        filename: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        timestamp: new Date().toISOString(),
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Prediction error:", error);

    // Determine error type and provide helpful message
    let errorMessage = "An error occurred while processing the image";
    let statusCode = 500;

    if (error.message.includes("404")) {
      errorMessage = "Model not found. Please check your project ID and iteration name.";
      statusCode = 404;
    } else if (error.message.includes("401") || error.message.includes("403")) {
      errorMessage = "Authentication failed. Please check your prediction key.";
      statusCode = 401;
    } else if (error.message.includes("InvalidImageFormat")) {
      errorMessage = "Invalid image format. Please upload a valid image file.";
      statusCode = 400;
    } else if (error.code === "ENOENT") {
      errorMessage = "Uploaded file not found";
      statusCode = 400;
    }

    res.status(statusCode).json({
      error: errorMessage,
      details: error.message,
      timestamp: new Date().toISOString(),
    });
  } finally {
    // Clean up uploaded file
    if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
      try {
        fs.unlinkSync(uploadedFilePath);
        console.log(`Cleaned up temporary file: ${uploadedFilePath}`);
      } catch (cleanupError) {
        console.warn(`Failed to clean up file ${uploadedFilePath}:`, cleanupError.message);
      }
    }
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Unhandled error:", error);

  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        error: "File too large",
        details: "Please upload an image smaller than 10MB",
      });
    }
    return res.status(400).json({
      error: "File upload error",
      details: error.message,
    });
  }

  res.status(500).json({
    error: "Internal server error",
    details: error.message,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📁 Serving static files from 'public' directory`);
  console.log(`🔍 Prediction endpoint: POST /api/predict`);
  console.log(`❤️  Health check: GET /api/health`);
  console.log("");
  console.log("Environment check:");
  console.log(`  VISION_PREDICTION_KEY: ${predictionKey ? "✅ Set" : "❌ Missing"}`);
  console.log(`  VISION_PREDICTION_ENDPOINT: ${predictionEndpoint ? "✅ Set" : "❌ Missing"}`);
  console.log(`  VISION_PROJECT_ID: ${projectId ? "✅ Set" : "❌ Missing"}`);
  console.log(
    `  PUBLISH_ITERATION_NAME: ${publishIterationName ? publishIterationName : "❌ Missing"}`
  );
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("Received SIGTERM, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("Received SIGINT, shutting down gracefully");
  process.exit(0);
});
