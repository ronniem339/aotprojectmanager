// creators-hub/js/utils/ai/planning/generateRefinedScriptPlanAI.js

/**
 * @fileoverview
 * This file contains the AI utility function for generating a refined script plan
 * that integrates on-camera dialogue and actions into the existing video outline.
 * This step is crucial for ensuring the final voiceover script flows naturally
 * with the pre-recorded on-camera segments.
 */

/**
 * Takes an initial script plan and on-camera descriptions to create a more
 * detailed, integrated plan for the final script generation.
 *
 * @param {object} options - The options for the AI call.
 * @param {string} options.scriptPlan - The existing high-level script plan or outline.
 * @param {object} options.onCameraDescriptions - An object where keys are location names
 * and values are strings describing the on-camera action or dialogue at that location.
 * @param {string} options.videoTitle - The title of the video.
 * @param {object} options.settings - The application settings, including the style guide.
 *
 * @returns {Promise<{refinedScriptPlan: string}>} A promise that resolves to an object
 * containing the refined script plan.
 */
window.aiUtils.generateRefinedScriptPlanAI = async ({ scriptPlan, onCameraDescriptions, videoTitle, settings }) => {
    console.log("AI: Generating refined script plan with on-camera details.", { scriptPlan, onCameraDescriptions, videoTitle });

    const styleGuidePrompt = window.aiUtils.getStyleGuidePrompt(settings);

    // FIX: Replaced single quotes with backticks for the multi-line template literal.
    const onCameraNotes = Object.entries(onCameraDescriptions)
        .map(([location, description]) => `
---
Location: ${location}
On-Camera Action/Dialogue:
${description}
---
`).join('\n');

    const prompt = `
You are an expert video scriptwriter and producer. Your task is to refine a video script plan to seamlessly integrate pre-recorded on-camera segments.

**Video Title:** "${videoTitle}"

**Style Guide:**
${styleGuidePrompt}

**High-Level Script Plan:**
This is the original plan for the video's structure and narrative flow.
\`\`\`
${scriptPlan}
\`\`\`

**On-Camera Segments:**
These are the segments that have already been filmed, featuring a person on camera. You must build the voiceover script around them. The voiceover should connect these on-camera parts, provide context, and cover other parts of the video (like b-roll or drone shots) as outlined in the high-level plan.
\`\`\`
${onCameraNotes}
\`\`\`

**Your Task:**
Review the high-level plan and the specific on-camera segments. Then, create a **Refined Script Plan**. This new plan should be a detailed, scene-by-scene outline for the *entire* video, explicitly marking where the on-camera segments fit and what the voiceover should cover in between.

**Refined Script Plan Requirements:**
1.  **Integrate, Don't Just List:** Don't just place the on-camera notes in the outline. Describe how the voiceover will lead into and out of them.
2.  **Maintain Flow:** The final plan must follow a logical and engaging narrative structure based on the original high-level plan.
3.  **Explicit Voiceover (VO) and On-Camera cues:** Clearly label which parts are [VOICEOVER] and which are [ON-CAMERA: Location Name].
4.  **Comprehensive:** The refined plan must cover the entire video from start to finish.

**Output:**
Provide only the "Refined Script Plan" as a structured, easy-to-follow markdown document. This plan will be the definitive blueprint for the final scriptwriter.

**Example Output Structure:**
[INTRO MUSIC]

**Scene 1: Introduction**
[VOICEOVER]
- Hook the viewer with a compelling question about [Topic].
- Briefly introduce the video's premise.

[ON-CAMERA: Location A]
- The host welcomes the audience and explains the goal for the day.
- Mentions the first stop.

**Scene 2: Exploring Location B**
[VOICEOVER]
- As drone footage of Location B plays, explain its significance.
- Build anticipation for what the host will do there.

...and so on.
`;

    try {
        const response = await window.aiUtils.callGeminiAPI(prompt, settings);
        // The Gemini API returns the response in a structured format.
        // We are expecting a simple string response for this function.
        // No special parsing is needed if the AI follows the prompt correctly.
        return { refinedScriptPlan: response };
    } catch (error) {
        console.error("Error in generateRefinedScriptPlanAI:", error);
        throw new Error('Failed to generate refined script plan. ${error.message}');
    }
};
