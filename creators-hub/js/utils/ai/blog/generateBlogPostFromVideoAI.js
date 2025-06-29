// js/utils/ai/blog/generateBlogPostFromVideoAI.js

window.aiUtils = window.aiUtils || {};
window.aiUtils.blog = window.aiUtils.blog || {};

/**
 * Generates a full blog post as a structured JSON object from a video's script.
 */
window.aiUtils.blog.generateBlogPostFromVideo = async (video, settings, knowledgeBases) => {
    const { title, description, finalScript } = video;
    const { blog: blogKb, youtube: youtubeKb } = knowledgeBases;

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
            1. Rewrite the video script into a detailed blog post. Do not just copy it.
            2. Prominently feature a placeholder to embed the YouTube video: [YOUTUBE_VIDEO_EMBED_HERE].
            3. Conclude with a summary and a strong call-to-action.
        `}

        **Source Video Information:**
        - **Video Title:** "${title}"
        - **Video Description:** "${description}"
        - **Video Script:**
        ---
        ${finalScript}
        ---

        Now, generate the complete blog post as a single, valid JSON object.
    `;

    try {
        // CORRECTED: Call the correct utility function and pass isComplex: false
        return await window.aiUtils.callGeminiAPI(prompt, settings, {}, false);
    } catch (error) {
        console.error('Error generating blog post JSON from video:', error);
        throw new Error('Failed to generate the blog post from the video script.');
    }
};
