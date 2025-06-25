window.aiUtils = window.aiUtils || {};

/**
 * Generates a list of relevant tags for a blog post using AI.
 */
window.aiUtils.generateTagsForPostAI = async ({ idea, settings }) => {
    const prompt = `You are an SEO expert. Based on the following blog post idea, generate a list of 5-10 highly relevant tags for WordPress.

    Blog Post Details:
    - Title: "${idea.title}"
    - Description: "${idea.description}"
    - Primary Keyword: "${idea.primaryKeyword}"

    Return the list as a valid JSON object with a single key "tags", which is an array of strings.
    Example: { "tags": ["travel", "destinations", "city guide"] }`;

    try {
        const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings);
        if (parsedJson && Array.isArray(parsedJson.tags)) {
            return parsedJson.tags;
        } else {
            console.warn("AI returned an invalid format for tags, returning empty array.", parsedJson);
            return [];
        }
    } catch (error) {
        console.error("Error generating tags for post:", error);
        return []; // Return an empty array on failure to prevent crashes
    }
};
