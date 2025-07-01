// creators-hub/js/utils/ai/planning/generateShotListFromScriptAI.js

/**
 * @fileoverview
 * This file contains the AI utility function for generating a shot list from an existing script.
 */

/**
 * Generates a shot list by parsing an existing script and mapping it to available footage.
 *
 * @param {object} options - The options for the AI call.
 * @param {string} options.script - The full text of the video script.
 * @param {string} options.videoTitle - The title of the video.
 * @param {string} options.videoConcept - The concept of the video.
 * @param {Array<string>} options.onCameraLocations - A list of location names where on-camera footage was shot.
 * @param {object} options.footageInventory - An object detailing available footage, keyed by location name.
 * @param {object} options.settings - The application settings.
 *
 * @returns {Promise<{shotList: Array<object>}>} A promise that resolves to an object
 * containing the structured shot list.
 */
window.aiUtils.generateShotListFromScriptAI = async ({ script, videoTitle, videoConcept, onCameraLocations, footageInventory, settings }) => {
    console.log("AI: Generating shot list from existing script.", { videoTitle });

    const styleGuidePrompt = window.aiUtils.getStyleGuidePrompt(settings);

    // Ensure onCameraLocations is an array before joining
    const onCameraNotes = Array.isArray(onCameraLocations) ? onCameraLocations.join(', ') : '';
    
    // Ensure footageInventory is an object before getting entries
    const footageNotes = typeof footageInventory === 'object' && footageInventory !== null 
        ? Object.entries(footageInventory)
            .map(([location, details]) => {
                // Defensive check for details object and its properties
                const footageList = details && Array.isArray(details.footage) ? details.footage.join(', ') : 'N/A';
                const onCameraStatus = details ? (details.onCamera ? 'Yes' : 'No') : 'N/A';
                return `
- **${location}:**
  - Available Footage: ${footageList}
  - On-Camera Segments: ${onCameraStatus}
`;
            })
            .join('')
        : 'No footage inventory provided.';


    const prompt = `
You are an expert video producer and editor. Your task is to create a detailed shot list for a video based on its final script and a list of available footage.

**Video Title:** "${videoTitle}"
**Video Concept:** "${videoConcept}"
${styleGuidePrompt}

**Available On-Camera Locations:**
${onCameraNotes}

**Available Footage Inventory:**
${footageNotes}

**Final Script:**
This is the complete script, including both voiceover (VO) and on-camera dialogue. You must break this down into individual shots.
\`\`\`
${script}
\`\`\`

**Your Task:**
Create a comprehensive shot list as a JSON array of objects. Each object in the JSON array should represent a single shot or a small, continuous sequence of shots.

**JSON Object Structure:**
Each object in the array must have the following fields:
- \`scene\` (string): A brief, descriptive name for the scene (e.g., "Introduction," "Exploring the Market").
- \`shotType\` (string): The type of shot. Use one of the following values: "On-Camera," "Voiceover B-Roll," "Voiceover Drone," "Voiceover Mix."
- \`location\` (string): The primary location for the shot. This must match one of the locations from the footage inventory. If it's a general shot, use "N/A".
- \`dialogue\` (string): The exact dialogue or voiceover line(s) for this shot.
- \`visuals\` (string): A detailed description of what should be on screen. Be specific. For b-roll, suggest specific shots from the inventory (e.g., "Close-up of a coffee cup," "Wide shot of the beach"). For on-camera, describe the action.

**Instructions:**
1.  **Follow the Script:** The shot list must follow the narrative flow of the provided script.
2.  **Be Specific:** For "visuals," provide concrete and actionable descriptions.
3.  **Use the Inventory:** Ensure the suggested visuals align with the available footage.
4.  **Output ONLY JSON:** The final output must be a valid JSON array of objects, and nothing else.

**Example JSON Output:**
[
  {
    "scene": "Introduction",
    "shotType": "On-Camera",
    "location": "Main Street Cafe",
    "dialogue": "Hey everyone, welcome back to the channel! Today, we're exploring the beautiful city of Paris.",
    "visuals": "Host is sitting at a cafe, smiling and talking directly to the camera. A cup of coffee is on the table."
  },
  {
    "scene": "City Overview",
    "shotType": "Voiceover Drone",
    "location": "Eiffel Tower",
    "dialogue": "Paris is a city that needs no introduction, but it's a place that always has new secrets to reveal.",
    "visuals": "Sweeping drone shot of the Eiffel Tower at sunrise, with the city stretching out below."
  }
]
`;

    try {
        // FIX: Calling callGeminiAPI with the correct 4-argument signature.
        // The third argument is the generationConfig, and the fourth is the isComplex boolean.
        const generationConfig = { responseMimeType: "application/json" };
        const isComplex = true;

        const result = await window.aiUtils.callGeminiAPI(prompt, settings, generationConfig, isComplex);

        // The callGeminiAPI utility already parses the JSON, so we just need to validate the structure.
        if (Array.isArray(result)) {
            return { shotList: result };
        }
        
        // Handle cases where the AI might wrap the array in an object, e.g., { "shotList": [...] }
        if (typeof result === 'object' && result !== null) {
            const key = Object.keys(result).find(k => Array.isArray(result[k]));
            if (key) {
                return { shotList: result[key] };
            }
        }
        
        console.error("Final result was not a valid shot list array:", result);
        throw new Error("AI response was not a valid shot list array.");

    } catch (error) {
        console.error("Error in generateShotListFromScriptAI:", error);
        throw new Error(`Failed to generate shot list from script. ${error.message}`);
    }
};
