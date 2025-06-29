// js/utils/ai/blog/generateDestinationGuideAI.js

/**
 * Generates a comprehensive destination guide (pillar page).
 * @param {object} options - Contains details for the post generation.
 * @param {string} options.location - The target location for the guide.
 * @param {Array<object>} options.existingArticles - An array of existing articles {title, url} to link to.
 * @param {object} settings - The application settings object.
 * @param {object} knowledgeBases - The user's knowledge bases.
 * @returns {Promise<string>} A promise that resolves to the generated blog post content (HTML).
 */
async function generateDestinationGuideAI(options, settings, knowledgeBases) {
    const { location, existingArticles } = options;
    const { blog: blogKb } = knowledgeBases;

    // Use the Pro model for this complex synthesis task if enabled.
    const model = settings.useProModelForComplexTasks
        ? (settings.proModelName || 'gemini-1.5-pro-latest')
        : (settings.flashModelName || 'gemini-1.5-flash-latest');

    const articleListForPrompt = existingArticles.map(article => `- "${article.title}" (URL: ${article.url})`).join('\n');

    const prompt = `
        You are a world-class travel editor, specializing in creating ultimate destination guides that serve as "pillar pages" or content hubs. Your task is to create the definitive guide for a location, seamlessly linking to existing, more detailed articles.

        **Core Task:**
        Create a comprehensive destination guide for **${location}**.

        **Core SEO Principles:**
        ${blogKb.coreSeoEngine || 'This is a pillar page. It should be comprehensive, well-structured, and demonstrate expertise. Internal linking is critical.'}

        **Post Blueprint & Structure:**
        You MUST follow these instructions precisely:
        ${blogKb.destinationGuideBlueprint || `
            1.  Create an exciting H1 title for the guide.
            2.  Write a "Why Visit" section that hooks the reader.
            3.  Create sections covering the location's main highlights (e.g., Top Attractions, Food & Drink, Getting Around).
            4.  Within these sections, you MUST naturally weave in contextual links to the existing articles provided below. Use the article title or a natural phrase as the anchor text for the link.
            5.  Do not just list the links. Integrate them into the narrative to encourage click-through.
        `}

        **Existing Articles to Link To:**
        You must incorporate links to the following articles within the guide's content. Use the provided URLs for the href attribute of the anchor tags.
        ${articleListForPrompt}

        Now, generate the complete guide as a single block of clean HTML. Do not include \`<html>\` or \`<body>\` tags. Ensure all links to existing articles are included correctly.
    `;

    try {
        const response = await window.ai.core.callGeminiAPI(prompt, settings, model);
        // Clean up the response to ensure it's just the HTML content
        return response.replace(/```html/g, '').replace(/```/g, '').trim();
    } catch (error) {
        console.error(`Error generating destination guide for "${location}":`, error);
        throw new Error('Failed to generate the destination guide.');
    }
}

// Add the function to the global AI utilities object
window.ai = window.ai || {};
window.ai.blog = window.ai.blog || {};
window.ai.blog.generateDestinationGuide = generateDestinationGuideAI;
