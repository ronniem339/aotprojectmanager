// js/utils/ai/blog/generateAffiliatePostAI.js

/**
 * Generates a monetizable affiliate blog post as a structured JSON object.
 * @param {object} options - Contains details for the post generation.
 * @param {string} options.postType - The type of post to generate ('hotel', 'road-trip', 'tours').
 * @param {string} options.location - The target location for the post.
 * @param {string} [options.audience] - The target audience.
 * @param {string} [options.specifics] - Any other specific details or keywords to include.
 * @param {object} settings - The application settings object.
 * @param {object} knowledgeBases - The user's knowledge bases.
 * @returns {Promise<object>} A promise that resolves to the generated blog post as a structured JSON object.
 */
async function generateAffiliatePostAI(options, settings, knowledgeBases) {
    const { postType, location, audience, specifics } = options;
    const { blog: blogKb } = knowledgeBases;

    const model = settings.useProModelForComplexTasks
        ? (settings.proModelName || 'gemini-1.5-pro-latest')
        : (settings.flashModelName || 'gemini-1.5-flash-latest');

    let blueprintKey = '';
    let instructions = '';

    switch (postType) {
        case 'hotel':
            blueprintKey = 'hotelListicleBlueprint';
            instructions = `Create a listicle of the top hotels in ${location} for ${audience || 'all travelers'}. Specifics: ${specifics || 'general excellence'}.`;
            break;
        case 'road-trip':
            blueprintKey = 'roadTripItineraryBlueprint';
            instructions = `Create a road trip itinerary centered around ${location}. Focus on: ${specifics || 'scenic routes'}.`;
            break;
        case 'tours':
            blueprintKey = 'toursAndActivitiesBlueprint';
            instructions = `Create a guide to the best tours in ${location}. Focus on: ${specifics || 'must-do experiences'}.`;
            break;
        default:
            throw new Error(`Invalid post type: ${postType}`);
    }

    const prompt = `
        You are an expert travel writer who excels at creating high-converting, monetizable blog content.

        **Master Output Format (CRITICAL):**
        You MUST follow these instructions for the output format. This is the most important rule.
        ${blogKb.jsonOutputFormat || 'Your output MUST be a single, valid JSON object with the keys: "title", "suggestedExcerpt", "suggestedTags", "suggestedCategory", and "htmlContent".'}

        **Core Task:**
        ${instructions}

        **Monetization Goals:**
        ${blogKb.monetizationGoals || 'The goal is to generate revenue through affiliate links.'}

        **Post Blueprint for 'htmlContent':**
        Use the following instructions to generate the value for the 'htmlContent' key in the JSON object:
        ${blogKb[blueprintKey] || 'Structure the post as a helpful guide or listicle. Use clear headings and provide genuine, helpful information.'}

        Now, generate the complete blog post as a single, valid JSON object, adhering strictly to the Master Output Format. Ensure all required affiliate placeholders are included exactly as specified.
    `;

    try {
        const response = await window.ai.core.callGeminiAPI(prompt, settings, model);
        const jsonString = response.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonString);
    } catch (error) {
        console.error(`Error generating or parsing affiliate post JSON for type "${postType}":`, error);
        throw new Error('Failed to generate the affiliate post. The AI response was not valid JSON.');
    }
}

// Add the function to the global AI utilities object
window.ai = window.ai || {};
window.ai.blog = window.ai.blog || {};
window.ai.blog.generateAffiliatePost = generateAffiliatePostAI;
