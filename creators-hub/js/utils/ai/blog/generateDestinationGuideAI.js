// js/utils/ai/blog/generateDestinationGuideAI.js

/**
 * Generates a destination guide (pillar page) as a structured JSON object.
 * @param {object} options - Contains details for the post generation.
 * @param {string} options.location - The target location for the guide.
 * @param {Array<object>} options.existingArticles - An array of existing articles {title, url} to link to.
 * @param {object} settings - The application settings object.
 * @param {object} knowledgeBases - The user's knowledge bases.
 * @returns {Promise<object>} A promise that resolves to the generated blog post as a structured JSON object.
 */
async function generateDestinationGuideAI(options, settings, knowledgeBases) {
    const { location, existingArticles } = options;
    const { blog: blogKb } = knowledgeBases;

    const model = settings.useProModelForComplexTasks
        ? (settings.proModelName || 'gemini-1.5-pro-latest')
        : (settings.flashModelName || 'gemini-1.5-flash-latest');

    const articleListForPrompt = existingArticles.map(article => `- "${article.title}" (URL: ${article.url})`).join('\n');

    const prompt = `
        You are a world-class travel editor, creating ultimate destination guides that serve as content hubs.

        **Master Output Format (CRITICAL):**
        You MUST follow these instructions for the output format. This is the most important rule.
        ${blogKb.jsonOutputFormat || 'Your output MUST be a single, valid JSON object with the keys: "title", "suggestedExcerpt", "suggestedTags", "suggestedCategory", and "htmlContent".'}

        **Core Task:**
        Create a comprehensive destination guide for **${location}**.

        **Post Blueprint for 'htmlContent':**
        Use the following instructions to generate the value for the 'htmlContent' key in the JSON object:
        ${blogKb.destinationGuideBlueprint || `
            1.  Create an exciting guide that hooks the reader.
            2.  Create sections covering the location's main highlights.
            3.  Within these sections, you MUST naturally weave in contextual links to the existing articles provided below.
            4.  Do not just list the links. Integrate them into the narrative to encourage click-through.
        `}

        **Existing Articles to Link To (for the 'htmlContent'):**
        You must incorporate links to the following articles within the guide's content. Use the provided URLs for the href attribute of the anchor tags.
        ${articleListForPrompt}

        Now, generate the complete guide as a single, valid JSON object, adhering strictly to the Master Output Format. Ensure all links to existing articles are included correctly in the 'htmlContent'.
    `;

    try {
        const response = await window.ai.core.callGeminiAPI(prompt, settings, model);
        const jsonString = response.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonString);
    } catch (error) {
        console.error(`Error generating or parsing destination guide JSON for "${location}":`, error);
        throw new Error('Failed to generate the destination guide. The AI response was not valid JSON.');
    }
}

// Add the function to the global AI utilities object
window.ai = window.ai || {};
window.ai.blog = window.ai.blog || {};
window.ai.blog.generateDestinationGuide = generateDestinationGuideAI;
