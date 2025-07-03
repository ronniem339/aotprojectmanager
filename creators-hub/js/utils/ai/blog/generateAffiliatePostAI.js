// js/utils/ai/blog/generateAffiliatePostAI.js

window.aiUtils = window.aiUtils || {};
window.aiUtils.blog = window.aiUtils.blog || {};

/**
 * Generates a monetizable affiliate blog post as a structured JSON object.
 */
window.aiUtils.blog.generateAffiliatePost = async (options, settings, knowledgeBases) => {
    const { postType, location, audience, specifics } = options;
    const { blog: blogKb } = knowledgeBases;

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
        ${blogKb.jsonOutputFormat || 'Your output MUST be a single, valid JSON object with the keys: "title", "suggestedExcerpt", "suggestedTags", "suggestedCategory", and "htmlContent".'}

        **Core Task:**
        ${instructions}

        **Length:** The generated blog post should be a minimum of 2,000 words.

        **Post Blueprint for 'htmlContent':**
        ${blogKb[blueprintKey] || 'Structure the post as a helpful guide or listicle.'}

        Now, generate the complete blog post as a single, valid JSON object.
    `;

    try {
        // CORRECTED: Call the correct utility function and pass isComplex: true
        return await window.aiUtils.callGeminiAPI(prompt, settings, {}, true);
    } catch (error) {
        console.error(`Error generating affiliate post JSON for type "${postType}":`, error);
        throw new Error('Failed to generate the affiliate post.');
    }
};
