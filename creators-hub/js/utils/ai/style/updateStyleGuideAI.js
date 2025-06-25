window.aiUtils = window.aiUtils || {};

window.aiUtils.updateStyleGuideAI = async function({ currentStyleGuide, refinementFeedback, settings }) {
    const prompt = `You are an AI assistant helping a creator refine their personal "Style Guide".
    Intelligently merge the user's feedback into the existing style guide.
    **Current Style Guide:**
    ${currentStyleGuide || "(No existing style guide. Create one based on the feedback below.)"}
    ---
    **Refinement Feedback to Incorporate:**
    "${refinementFeedback}"
    ---
    Respond with ONLY the complete, updated style guide text in a JSON object, like this:
    { "newStyleGuideText": "..." }`;
    try {
        const result = await window.aiUtils.callGeminiAPI(prompt, settings);
        return result;
    } catch (error) {
        console.error("Error updating style guide with AI:", error);
        throw new Error("AI failed to update the style guide.");
    }
};
