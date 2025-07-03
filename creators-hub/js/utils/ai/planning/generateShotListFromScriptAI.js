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
 * @param {object} options.onCameraDescriptions - An object where keys are location names and values are the on-camera dialogue for that location.
 * @param {object} options.footageInventory - An object detailing available footage, keyed by location name.
 * @param {object} options.settings - The application settings.
 *
 * @returns {Promise<{shotList: Array<object>}>} A promise that resolves to an object
 * containing the structured shot list.
 */
window.aiUtils.generateShotListFromScriptAI = async ({ script, videoTitle, videoConcept, onCameraDescriptions, footageInventory, settings }) => {
    console.log("AI: generateShotListFromScriptAI received - script:", JSON.stringify(script));
    console.log("AI: generateShotListFromScriptAI received - videoTitle:", JSON.stringify(videoTitle));
    console.log("AI: generateShotListFromScriptAI received - videoConcept:", JSON.stringify(videoConcept));
    console.log("AI: generateShotListFromScriptAI received - onCameraDescriptions:", JSON.stringify(onCameraDescriptions));
    console.log("AI: generateShotListFromScriptAI received - footageInventory:", JSON.stringify(footageInventory));
    console.log("AI: Generating shot list from existing script.", { videoTitle });

    const styleGuidePrompt = window.aiUtils.getStyleGuidePrompt(settings);

    // Create a clear summary of the on-camera dialogue segments.
const onCameraNotes = Object.entries(onCameraDescriptions || {})
    .map(([location, dialogue]) => {
        const dialogueText = Array.isArray(dialogue) ? dialogue.join(' ') : dialogue;
        return `- At "${location}", the on-camera dialogue is: "${dialogueText}"`;
    })
    .join('\n');

    // Create a clear summary of the footage inventory.
    const footageNotes = Object.entries(footageInventory || {})
        .map(([locationKey, details]) => {
            const footageTypes = [];
            if (details.bRoll) footageTypes.push('B-Roll');
            if (details.onCamera) footageTypes.push('On-Camera');
            if (details.drone) footageTypes.push('Drone');
            return `- **${details.name}:** Available Footage: ${footageTypes.join(', ') || 'None'}`;
        })
        .join('\n');

    const prompt = `
You are an expert video producer and editor. Your task is to create a detailed shot list for a video by combining a voiceover script with on-camera dialogue segments and mapping them to available footage.

**Video Title:** "${videoTitle}"
**Video Concept:** "${videoConcept}"
${styleGuidePrompt}

---
**SOURCE MATERIALS**

**1. Voiceover Script (VO):**
This is the main script that will be read as a voiceover.
\`\`\`
${script}
\`\`\`

**2. On-Camera Dialogue Segments:**
These are segments where the host speaks directly to the camera at specific locations.
${onCameraNotes || 'No on-camera segments provided.'}

**3. Footage Inventory:**
This is a list of locations and the types of footage available for each.
${footageNotes || 'No footage inventory provided.'}
---

**YOUR TASK**

Create a comprehensive shot list in JSON format. You must merge the "Voiceover Script" and the "On-Camera Dialogue" into a single, chronological narrative. Each object in the JSON array represents a single shot.

**JSON Object Structure (STRICT):**
Each object in the array must have the following fields:
- \`scene\` (string): A brief, descriptive name for the scene (e.g., "Introduction," "Exploring the Market").
- \`shotType\` (string): Use **"On-Camera"** for dialogue from the "On-Camera Dialogue Segments". Use **"Voiceover"** for dialogue from the "Voiceover Script".
- \`location\` (string): The location name where the shot takes place. This must match a location from the Footage Inventory. If it's a general voiceover, use "N/A".
- \`dialogue\` (string): The exact dialogue or voiceover line(s) for this specific shot.
- \`visuals\` (string): A detailed description of what should be on screen. For "Voiceover", suggest specific shots from the Footage Inventory (e.g., "Drone shot of Nicosia's old town," "Close-up of a street sign on the Green Line"). For "On-Camera", describe the action (e.g., "Host stands in front of the checkpoint, talking to the camera.").

**Instructions:**
1.  **Integrate:** Weave the on-camera segments into the voiceover script to create a natural flow. The voiceover should lead into and out of the on-camera parts.
2.  **Dialogue Source:** For rows with \`shotType: "Voiceover"\`, the \`dialogue\` MUST come from the "Voiceover Script". For rows with \`shotType: "On-Camera"\`, the \`dialogue\` MUST come from the "On-Camera Dialogue Segments".
3.  **Location Matching:** Correctly assign the \`location\` for each shot based on the dialogue and the available inventory.
4.  **Visuals:** Suggest specific visuals based on the dialogue and the known available footage for that location.
5.  **Output ONLY JSON:** The final output must be a valid JSON array of shot objects and nothing else.
`;

    try {
        // Correctly call the Gemini API with 4 arguments: prompt, settings, generationConfig, isComplex
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
