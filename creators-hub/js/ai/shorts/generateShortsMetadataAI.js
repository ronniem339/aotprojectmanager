window.aiUtils = window.aiUtils || {};

window.aiUtils.generateShortsMetadataAI = async ({ videoTitle, shortsIdea, settings, videoTone }) => {
    const styleGuide = window.aiUtils.getStyleGuidePrompt(settings, videoTone);
    const prompt = `You are a YouTube Shorts expert. Based on the long-form video and a Shorts idea, generate optimized metadata.
    Long-Form Video Title: "${videoTitle}"
    Shorts Idea:
    - Title: "${shortsIdea.title}"
    - Concept: "${shortsIdea.description}"
    ${styleGuide}
    Generate:
    1. **On-Screen Text:** 1-3 short, punchy phrases.
    2. **Short Caption:** Concise (under 100 characters) caption with 2-3 relevant hashtags.
    3. **Short Description:** Detailed (100-200 words) description for YouTube Studio.
    4. **Tags:** 5-10 relevant, comma-separated tags.
    Your response MUST be a valid JSON object with keys: "onScreenText", "caption", "description", "tags".`;
    try {
        const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings);
        if (parsedJson && Array.isArray(parsedJson.onScreenText) && typeof parsedJson.caption === 'string' && typeof parsedJson.description === 'string' && typeof parsedJson.tags === 'string') {
            return parsedJson;
        } else {
            throw new Error("AI returned an invalid format for shorts metadata.");
        }
    } catch (error) {
        console.error("Error generating shorts metadata:", error);
        throw new Error(`AI failed to generate shorts metadata: ${error.message || error}`);
    }
};
