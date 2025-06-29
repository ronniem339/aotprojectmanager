// js/utils/ai/blog/generateBlogPostFromVideoAI.js

/**
 * Generates a full blog post as a structured JSON object from a video's script.
 * @param {object} video - The video object, containing title, description, and script.
 * @param {object} settings - The application settings object.
 * @param {object} knowledgeBases - The user's knowledge bases.
 * @returns {Promise<object>} A promise that resolves to the generated blog post as a structured JSON object.
 */
async function generateBlogPostFromVideoAI(video, settings, knowledgeBases) {
    const { title, description, finalScript } = video;
    const { blog: blogKb, youtube: youtubeKb } = knowledgeBases;

    // Use the Flash model for this task as it's primarily reformatting.
    const model = settings.flashModelName || 'gemini-1.5-flash-latest';

    const prompt = `
        You are an expert travel blogger and SEO specialist. Your task is to rewrite a YouTube video script into a comprehensive, engaging, and SEO-optimized blog post.

        **Master Output Format (CRITICAL):**
        You MUST follow these instructions for the output format. This is the most important rule.
        ${blogKb.jsonOutputFormat || 'Your output MUST be a single, valid JSON object with the keys: "title", "suggestedExcerpt", "suggestedTags", "suggestedCategory", and "htmlContent".'}

        **Your Persona & Style Guide:**
        ${youtubeKb.whoAmI || 'Assume a friendly, knowledgeable travel expert persona.'}

        **Core SEO Principles:**
        ${blogKb.coreSeoEngine || 'Focus on providing valuable, easy-to-read content that fully answers the topic.'}

        **Post Blueprint for 'htmlContent':**
        Use the following instructions to generate the value for the 'htmlContent' key in the JSON object:
        ${blogKb.videoCompanionPostBlueprint || `
            1. Rewrite the video script into a detailed blog post. Do not just copy it. Elaborate on points, add more context, and organize the content with clear H2 and H3 headings.
            2. Ensure the tone is appropriate for a blog post, not a spoken script.
            3. Prominently feature a placeholder to embed the YouTube video. Use the text: [YOUTUBE_VIDEO_EMBED_HERE].
            4. Conclude with a summary and a strong call-to-action to watch the video.
        `}

        **Source Video Information:**
        - **Video Title:** "${title}"
        - **Video Description:** "${description}"
        - **Video Script:**
        ---
        ${finalScript}
        ---

        Now, generate the complete blog post as a single, valid JSON object, adhering strictly to the Master Output Format.
    `;

    try {
        const response = await window.ai.core.callGeminiAPI(prompt, settings, model);
        // Clean up the response to ensure it's a valid JSON string
        const jsonString = response.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonString);
    } catch (error) {
        console.error('Error generating or parsing blog post JSON from video:', error);
        throw new Error('Failed to generate the blog post from the video script. The AI response was not valid JSON.');
    }
}

// Add the function to the global AI utilities object
window.ai = window.ai || {};
window.ai.blog = window.ai.blog || {};
window.ai.blog.generateBlogPostFromVideo = generateBlogPostFromVideoAI;
