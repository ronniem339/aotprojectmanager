window.aiUtils = window.aiUtils || {};

window.aiUtils.refineVideoConceptBasedOnInventory = async ({ videoTitle, currentConcept, footageChangesSummary, settings, videoTone }) => {
    const styleGuide = window.aiUtils.getStyleGuidePrompt(settings, videoTone);
    const prompt = `You are a YouTube video concept reviser. A user changed their footage inventory.
    Please review the original concept and the changes, then provide a revised, brief outline or high-level plan.
    Original Title: "${videoTitle}"
    Original Concept: "${currentConcept}"
    ${styleGuide}
    Footage Inventory Changes: ${footageChangesSummary}
    Based on these changes, how should the video concept be updated? Provide only the revised concept string.`;
    return await window.aiUtils.callGeminiAPI(prompt, settings, { responseMimeType: "text/plain" }, true);
};
