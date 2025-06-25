window.aiUtils = window.aiUtils || {};

window.aiUtils.generateScriptPlanAI = async ({ videoTitle, videoConcept, draftOutline, settings }) => {
    const styleGuidePrompt = window.aiUtils.getStyleGuidePrompt(settings);
    const prompt = `
    You are an expert video producer and storyteller. Your goal is to help a creator flesh out their video by asking insightful questions.
    You have been given the draft outline. Your task is to generate questions to extract personal experiences, feelings, and specific details.
    **Video Title:** "${videoTitle}"
    **Video Concept:** "${videoConcept}"
    ${styleGuidePrompt}
    **Draft Outline to Analyze:**
    ---
    ${draftOutline}
    ---
    **Your Task:**
    Based on the outline, generate 5-7 targeted questions. Focus on:
    - Eliciting emotional responses or personal reflections.
    - Uncovering specific, sensory details.
    - Probing for unexpected challenges or surprises.
    - Encouraging a unique opinion or "insider tip".
    **Output Format:**
    A valid JSON object with a single key "locationQuestions", which must be an array of objects, where each object has a single key "question".`;
    const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings, {}, true);
    if (parsedJson && Array.isArray(parsedJson.locationQuestions)) {
        return parsedJson;
    } else {
        throw new Error("AI returned an invalid format for script plan questions.");
    }
};
