const fs = require("fs");
const PredictionApi = require("@azure/cognitiveservices-customvision-prediction");
const msRest = require("@azure/ms-rest-js");

// Import Dotenv
require("dotenv").config();

// Retrieve environment variables for prediction only
const predictionKey = process.env["VISION_PREDICTION_KEY"];
const predictionEndpoint = process.env["VISION_PREDICTION_ENDPOINT"];

// Configuration
const projectId = process.env["VISION_PROJECT_ID"]; // You'll need to add this to your .env file
const publishIterationName = "mission1tonkatommy";

// Instantiate prediction client only
const predictor_credentials = new msRest.ApiKeyCredentials({
  inHeader: { "Prediction-key": predictionKey },
});
const predictor = new PredictionApi.PredictionAPIClient(predictor_credentials, predictionEndpoint);

// Function to classify an image
async function classifyImage(imagePath) {
  try {
    console.log(`Analyzing image: ${imagePath}`);

    // Read the image file
    const testFile = fs.readFileSync(imagePath);

    // Send image to prediction endpoint
    const results = await predictor.classifyImage(projectId, publishIterationName, testFile);

    // Show results
    console.log("Prediction Results:");
    console.log("==================");

    if (results.predictions && results.predictions.length > 0) {
      results.predictions.forEach((prediction) => {
        const confidence = (prediction.probability * 100.0).toFixed(2);
        console.log(`${prediction.tagName}: ${confidence}%`);
      });
    } else {
      console.log("No predictions returned.");
    }

    return results;
  } catch (error) {
    console.error("Error making prediction:", error.message);
    throw error;
  }
}

// Main execution
(async () => {
  try {
    const imagePath = `D:/.MISSIONREADYHQ/2025 Aug - L5ADV/Missions/MRHQ-L5-Mission-1/training/images/pexels-d-ng-nhan-324384-18207330.jpg`;

    // Check if image file exists
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found: ${imagePath}`);
    }

    await classifyImage(imagePath);
  } catch (error) {
    console.error("Application error:", error.message);
  }
})();
