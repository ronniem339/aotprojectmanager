// js/utils/ai/blog/generateAffiliatePostAI.js

/**
 * Generates a monetizable affiliate blog post (e.g., listicle) for a specific purpose.
 * @param {object} options - Contains details for the post generation.
 * @param {string} options.postType - The type of post to generate ('hotel', 'road-trip', 'tours').
 * @param {string} options.location - The target location for the post.
 * @param {string} [options.audience] - The target audience (e.g., "families", "couples").
 * @param {string} [options.specifics] - Any other specific details or keywords to include.
 * @param {object} settings - The application settings object.
 * @param {object} knowledgeBases - The user's knowledge bases.
 * @returns {Promise<string>} A promise that resolves to the generated blog post content (HTML).
 */
async function generateAffiliatePostAI(options, settings, knowledgeBases) {
    const { postType, location, audience, specifics } = options;
    const { blog: blogKb } = knowledgeBases;

    // Use the Pro model for this creative task if enabled.
    const model = settings.useProModelForComplexTasks
        ? (settings.proModelName || 'gemini-1.5-pro-latest')
        : (settings.flashModelName || 'gemini-1.5-flash-latest');

    let blueprint = '';
    let instructions = '';

    // Select the correct blueprint and instructions based on the post type
    switch (postType) {
        case 'hotel':
            blueprint = blogKb.hotelListicleBlueprint;
            instructions = `Create a listicle of the top hotels in ${location} for ${audience || 'all travelers'}. Specific focus: ${specifics || 'general excellence'}.`;
            break;
        case 'road-trip':
            blueprint = blogKb.roadTripItineraryBlueprint;
            instructions = `Create a road trip itinerary starting, ending, or centered around ${location}. Focus on: ${specifics || 'scenic routes and interesting stops'}.`;
            break;
        case 'tours':
            blueprint = blogKb.toursAndActivitiesBlueprint;
            instructions = `Create a guide to the best tours and activities in ${location}. Specific focus: ${specifics || 'must-do experiences'}.`;
            break;
        default:
            throw new Error(`Invalid post type specified: ${postType}`);
    }

    const prompt = `
        You are an expert travel writer who excels at creating high-converting, monetizable blog content. Your writing is engaging, trustworthy, and SEO-optimized.

        **Your Core Task:**
        ${instructions}

        **Core SEO Principles:**
        ${blogKb.coreSeoEngine || 'Focus on providing valuable, easy-to-read content that fully answers the topic.'}

        **Monetization Goals:**
        ${blogKb.monetizationGoals || 'The goal is to generate revenue through affiliate links.'}

        **Post Blueprint & Structure:**
        You MUST follow these instructions precisely:
        ${blueprint || 'Structure the post as a helpful guide or listicle. Use clear headings and provide genuine, helpful information.'}

        Now, generate the complete blog post as a single block of clean HTML. Do not include \`<html>\` or \`<body>\` tags. Ensure all required placeholders like [Expedia Affiliate Link Here] are included exactly as specified in the blueprint.
    `;

    try {
        const response = await window.ai.core.callGeminiAPI(prompt, settings, model);
        // Clean up the response to ensure it's just the HTML content
        return response.replace(/```html/g, '').replace(/```/g, '').trim();
    } catch (error) {
        console.error(`Error generating affiliate post for type "${postType}":`, error);
        throw new Error('Failed to generate the affiliate post.');
    }
}

// Add the function to the global AI utilities object
window.ai = window.ai || {};
window.ai.blog = window.ai.blog || {};
window.ai.blog.generateAffiliatePost = generateAffiliatePostAI;
