import path from "path";
import "dotenv/config";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Executes the Python GEE Coastal Erosion script (Landsat).
 * @param {Object} regionGeoJson
 * @param {string} regionId
 * @param {string} credentialsPath
 * @param {number} [targetYear]
 * @param {number} [baselineYear]
 * @returns {Promise<Object>}
 */
export function runCoastalCheck(
  regionGeoJson,
  regionId,
  credentialsPath,
  targetYear,
  baselineYear
) {
  return new Promise((resolve, reject) => {
    
    // --- FIX START ---
    // Point explicitly to the Python executable in the venv folder
    const pythonExecutable = path.join(process.cwd(), "venv", "bin", "python3");
    // --- FIX END ---

    const scriptFilename = "landsat_coastal.py";
    const scriptPath = path.resolve(__dirname, scriptFilename);

    if (!fs.existsSync(scriptPath)) {
      return reject(
        new Error(`Python script not found at path: ${scriptPath}`)
      );
    }
    
    // Safety check: ensure the venv python exists
    if (!fs.existsSync(pythonExecutable)) {
       return reject(new Error(`Python venv executable not found at: ${pythonExecutable}`));
    }

    console.log(`Executing Coastal Check Script: ${scriptPath}`);
    console.log(`Region: ${regionId} | Years: ${baselineYear} vs ${targetYear}`);
    console.log(`Using Python Env: ${pythonExecutable}`);

    const pythonProcess = spawn(pythonExecutable, [
      scriptPath,
      credentialsPath,
    ]);

    const inputData = {
      geometry: regionGeoJson,
      region_id: regionId,
    };
    
    if (targetYear) inputData.target_year = parseInt(targetYear, 10);
    if (baselineYear) inputData.baseline_year = parseInt(baselineYear, 10);

    const inputJsonString = JSON.stringify(inputData);

    let scriptOutput = "";
    let scriptError = "";

    pythonProcess.stdout.on("data", (data) => {
      scriptOutput += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      scriptError += data.toString();
      console.error(`[Python Log]: ${data}`);
    });

    pythonProcess.on("close", (code) => {
      if (code === 0) {
        try {
          const trimmedOutput = scriptOutput.trim();
          
          if (!trimmedOutput) {
            return reject(new Error("Python script returned empty output"));
          }

          const result = JSON.parse(trimmedOutput);
          
          if (result.status === "error") {
             return reject(new Error(`GEE Script Error: ${result.message}`));
          }
          
          console.log("Successfully parsed Coastal Erosion data.");
          resolve(result);

        } catch (parseError) {
          console.error("Failed to parse JSON:", parseError);
          if (scriptError) console.error("Python Stderr:", scriptError);
          reject(new Error(`Failed to parse JSON: ${parseError.message}`));
        }
      } else {
        console.error(`Python script failed with exit code ${code}`);
        reject(new Error(`Python script failed with code ${code}. Error output: ${scriptError}`));
      }
    });

    pythonProcess.on("error", (err) => {
      console.error("Failed to start Python subprocess:", err);
      reject(new Error(`Failed to start Python process: ${err.message}`));
    });

    try {
      pythonProcess.stdin.write(inputJsonString);
      pythonProcess.stdin.end();
    } catch (stdinError) {
      console.error("Error writing to Python stdin:", stdinError);
      reject(new Error(`Error writing to Python stdin: ${stdinError.message}`));
    }
  });
}