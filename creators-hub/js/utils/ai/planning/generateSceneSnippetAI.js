// creators-hub/js/utils/ai/planning/generateSceneSnippetAI.js

window.aiUtils = window.aiUtils || {};

/**
 * Generates a small, self-contained array of shot objects for a single new scene.
 * @param {object} options - The options for the AI call.
 * @param {object} options.newLocation - The location object for the new scene.
 * @param {string} options.onCameraDialogue - Optional dialogue for the scene.
 * @param {string} options.integrationNote - A note on how to integrate the scene.
 * @param {string} options.previousSceneContext - Dialogue from the last shot in the main list.
 * @param {object} options.settings - The application settings.
 * @returns {Promise<Array<object>>} A promise that resolves to an array of shot objects.
 */
window.aiUtils.generateSceneSnippetAI = async ({
  newLocation,
  onCameraDialogue,
  integrationNote,
  previousSceneContext,
  settings,
}) => {
  const prompt = `
You are a video editor creating a short transition scene. Create 1-3 shots to introduce a new location.

**Context:**
- The previous scene ended with this dialogue: "${previousSceneContext}"
- The new location is: "${newLocation.name}"
- The user's integration note is: "${integrationNote}"
${
  onCameraDialogue
    ? `- There is on-camera dialogue for this scene: "${onCameraDialogue}"`
    : ""
}

**Your Task:**
Create a short scene (1-3 shots) that logically introduces the new location. This might involve a voiceover transition, an establishing shot, and then the on-camera dialogue if provided.

**Output Format:**
Return a valid JSON array of shot objects. Each object must have the following keys:
- "scene" (string): A brief name for this new scene.
- "shotType" (string): "Voiceover" or "On-Camera".
- "location" (string): The name of the new location.
- "dialogue" (string): The dialogue for the shot.
- "visuals" (string): A description of the shot's visuals.

Example Output:
[
  { "shotType": "Voiceover", "scene": "Transition to Market", "location": "Old Market", "dialogue": "Now, let's head to the bustling market.", "visuals": "Drone shot of the market entrance." }
]
`;

  const generationConfig = { responseMimeType: "application/json" };
  const result = await window.aiUtils.callGeminiAPI(
    prompt,
    settings,
    generationConfig,
    true
  );
  return Array.isArray(result)
    ? result
    : result[Object.keys(result).find((k) => Array.isArray(result[k]))] || [];
};
