window.aiUtils = window.aiUtils || {};

window.aiUtils.generateShortsIdeasAI = async ({ video, settings }) => {
    const styleGuide = window.aiUtils.getStyleGuidePrompt(settings, video.tone);
    const shortsIdeaGenerationKb = settings.knowledgeBases?.youtube?.shortsIdeaGeneration || 'Focus on quick hooks and trending sounds.';

    const footageInventorySummary = Object.entries(video.footageInventory || {}).map(([loc, types]) => {
        const availableTypes = Object.entries(types)
            .filter(([_, isAvailable]) => isAvailable)
            .map(([type]) => type.replace('bRoll', 'B-Roll').replace('onCamera', 'On-Camera').replace('drone', 'Drone'))
            .join(', ');
        return `- ${loc}: ${availableTypes || 'No specific footage recorded'}`;
    }).join('\n');

    const previouslyCreatedShortsSummary = (video.shortsIdeas || []).length > 0
        ? (video.shortsIdeas || []).map(short => `- "${short.title}" (Status: ${short.status || 'unknown'})`).join('\n')
        : 'No shorts created yet.';

    const prompt = `
You are a creative and savvy YouTube Shorts video editor. Your task is to generate 3-5 distinct, high-impact Shorts ideas based on a long-form video's transcript and available footage.

**Primary Goal:** Create viral-worthy vertical videos that are visually stunning and provide immediate value.

**Source Material:**
- **Long-Form Video Title:** "${video.title}"
- **Video Concept:** "${video.concept}"
- **Video Transcript (for context and narrative):**
  """
  ${video.transcript ? video.transcript.substring(0, 6000) : 'No transcript available.'}
  """
- **Available Footage Inventory:**
  ${footageInventorySummary || 'No footage inventory available.'}

**Your Creative Process:**
1.  **Prioritize Visuals:** Start by identifying the most visually compelling footage available, especially **Drone Footage**. A stunning shot is the foundation of a great Short.
2.  **Find the Narrative:** Match the best visual shots with a relevant, interesting, or surprising moment from the video transcript.
3.  **Craft the Short:** For each idea, develop a complete concept.

**Output Instructions:**
For each of the 3-5 ideas, provide the following in a JSON object:
- **title:** A catchy, SEO-friendly title for the Short (under 70 characters).
- **description:** A brief, engaging description for the YouTube description box.
- **hook:** The first 3 seconds of the video. Make it incredibly engaging to stop the scroll. (e.g., "You won't BELIEVE this view...", "Here's a secret you won't find in guidebooks...").
- **script:** A concise script for the voiceover or on-screen text, directly referencing points from the transcript. Keep it under 150 words.
- **footageToUse:** Specific suggestions for which clips to use from the Footage Inventory. Be explicit (e.g., "Start with the drone shot over the main beach, then cut to the on-camera shot of the market.").
- **onScreenText:** Suggestion for on-screen text to emphasize key points.

**Previously Created Shorts (for reference, do not duplicate):**
${previouslyCreatedShortsSummary}

**General Style & Tone Guidelines:**
${styleGuide}
**Shorts-Specific Knowledge Base:**
"${shortsIdeaGenerationKb}"

Your response MUST be a valid JSON object with a single key "shortsIdeas" which is an array of the objects described above.
`;

    try {
        const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings, {}, true); // Complex task
        if (parsedJson && Array.isArray(parsedJson.shortsIdeas)) {
            return parsedJson.shortsIdeas;
        } else {
            console.error("AI returned an invalid format for shorts ideas:", parsedJson);
            throw new Error("AI returned an invalid format for shorts ideas.");
        }
    } catch (error) {
        console.error("Error generating shorts ideas:", error);
        throw new Error(`AI failed to generate shorts ideas: ${error.message || error}`);
    }
};
