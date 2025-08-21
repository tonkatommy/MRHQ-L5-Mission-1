const util = require("util");
const fs = require("fs");
const TrainingApi = require("@azure/cognitiveservices-customvision-training");
const PredictionApi = require("@azure/cognitiveservices-customvision-prediction");
const msRest = require("@azure/ms-rest-js");

// Import Dotenv
require("dotenv").config();

// retrieve environment variables
const trainingKey = process.env["VISION_TRAINING_KEY"];
const trainingEndpoint = process.env["VISION_TRAINING_ENDPOINT"];

const predictionKey = process.env["VISION_PREDICTION_KEY"];
const predictionResourceId = process.env["VISION_PREDICTION_RESOURCE_ID"];
const predictionEndpoint = process.env["VISION_PREDICTION_ENDPOINT"];

const publishIterationName = "mission1tommy";
const setTimeoutPromise = util.promisify(setTimeout);

// Instantiate client object

const credentials = new msRest.ApiKeyCredentials({ inHeader: { "Training-key": trainingKey } });
const trainer = new TrainingApi.TrainingAPIClient(credentials, trainingEndpoint);

const predictor_credentials = new msRest.ApiKeyCredentials({
  inHeader: { "Prediction-key": predictionKey },
});
const predictor = new PredictionApi.PredictionAPIClient(predictor_credentials, predictionEndpoint);

(async () => {
  console.log("Creating project...");
  // Create new Custom Vision project
  const mission1Project = await trainer.createProject("Mission 1 Project");

  // send an image to the prediction endpoint and retrieve the prediction
  const testFile = fs.readFileSync(
    `D:/.MISSIONREADYHQ/2025 Aug - L5ADV/Missions/MRHQ-L5-Mission-1/backend/training/images/pexels-d-ng-nhan-324384-18207330.jpg`
  );

  const results = await predictor.classifyImage(mission1Project.id, publishIterationName, testFile);

  // Show results
  console.log("Results:");
  results.predictions.forEach((predictedResult) => {
    console.log(
      `\t ${predictedResult.tagName}: ${(predictedResult.probability * 100.0).toFixed(2)}%`
    );
  });
})();
