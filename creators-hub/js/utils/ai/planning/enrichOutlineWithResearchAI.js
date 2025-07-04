window.aiUtils = window.aiUtils || {};

/**
 * Enriches a script outline with facts, tips, and history using Google Search.
 * @param {object} params - The parameters for the AI call.
 * @param {string} params.scriptPlan - The markdown string of the script outline to enrich.
 * @param {object} params.settings - The application settings.
 * @returns {Promise<object>} A promise that resolves to the AI's response,
 * expected to contain the enriched outline.
 */
window.aiUtils.enrichOutlineWithResearchAI = async ({ scriptPlan, settings }) => {
    const prompt = `
You are an expert researcher and an engaging storyteller. Your task is to take a video script outline and enrich it with interesting facts, historical context, and practical tips to make it more informative and engaging for the audience.

**Video Outline:**
---
${scriptPlan}
---

**Your Task:**
1.  Read the provided outline to understand the topics of each section.
2.  For each major topic or location in the outline, you MUST use the provided Google Search tool to find relevant information. You are looking for:
    * **Surprising Facts:** Little-known details or "did you know?" style information.
    * **Historical Context:** Brief, interesting historical anecdotes.
    * **Useful Tips:** Practical advice for a viewer interested in the topic (e.g., best photo spots, what to wear, a specific dish to try).
3.  Rewrite the outline, integrating the information you found.
4.  Present the new information clearly, perhaps using labels like "**✨ Fun Fact:**", "**A Bit of History:**", or "**Pro-Tip:**".
5.  **CRITICALLY IMPORTANT:** You MUST cite the source URL for every piece of information you add, right after the fact. Example: "The tower leans more than Pisa's. [Source: https://example.com/tower_facts]".
6.  Your final output must be a single JSON object with one key, "enrichedOutline", containing the complete, updated outline as a markdown string. Do not include any other text or wrappers around the JSON.`;

    // This function requires tool use, specifically Google Search.
    // The callGeminiAPI function is assumed to handle the enabling of tools
    // when the prompt requests it and the model supports it.
    const generationConfig = { responseMimeType: "application/json" };
    
    // The 'isComplex' flag is set to true to indicate that this is a multi-step task
    // involving research and generation, which often requires more advanced reasoning.
    const isComplex = true;

    return await window.aiUtils.callGeminiAPI(prompt, settings, generationConfig, isComplex);
};
