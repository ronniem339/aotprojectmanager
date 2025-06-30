// js/utils/ai/blog/generateDestinationGuideAI.js

window.aiUtils = window.aiUtils || {};
window.aiUtils.blog = window.aiUtils.blog || {};

/**
 * Generates a destination guide (pillar page) as a structured JSON object.
 */
window.aiUtils.blog.generateDestinationGuide = async (options, settings, knowledgeBases) => {
    const { location, existingArticles } = options;
    const { blog: blogKb } = knowledgeBases;

    const articleListForPrompt = existingArticles.map(article => `- "${article.title}" (URL: ${article.url})`).join('\n');

    const prompt = `
        You are a world-class travel editor, creating ultimate destination guides that serve as content hubs.

        **Master Output Format (CRITICAL):**
        ${blogKb.jsonOutputFormat || 'Your output MUST be a single, valid JSON object with the keys: "title", "suggestedExcerpt", "suggestedTags", "suggestedCategory", and "htmlContent".'}

        **Core Task:**
        Create a comprehensive destination guide for **${location}**.

        **Length:** The guide should be between 3,500 and 4,000 words.

        **Post Blueprint for 'htmlContent':**
        ${blogKb.destinationGuideBlueprint || 'Create an exciting guide that hooks the reader and integrates links naturally.'}

        **Existing Articles to Link To (for the 'htmlContent'):**
        You must incorporate links to the following articles within the guide's content.
        ${articleListForPrompt}

        Now, generate the complete guide as a single, valid JSON object.
    `;

    try {
        // CORRECTED: Call the correct utility function and pass isComplex: true
        return await window.aiUtils.callGeminiAPI(prompt, settings, {}, true);
    } catch (error) {
        console.error(`Error generating destination guide JSON for "${location}":`, error);
        throw new Error('Failed to generate the destination guide.');
    }
};
