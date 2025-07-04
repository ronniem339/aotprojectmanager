// js/utils/ai/blog/generateBlogPostFromVideoAI.js

window.aiUtils = window.aiUtils || {};
window.aiUtils.blog = window.aiUtils.blog || {};

/**
 * Generates a full blog post as a structured JSON object from a video's script or shot list.
 */
window.aiUtils.blog.generateBlogPostFromVideo = async (video, settings, knowledgeBases) => {
    const { title, description, finalScript, shotList } = video;
    const { blog: blogKb, youtube: youtubeKb } = knowledgeBases;

    let sourceMaterialPrompt;

    // Check if a detailed shotList exists and use it as the preferred source
    if (shotList && shotList.length > 1) {
        sourceMaterialPrompt = `
        **Source Video Information (from Shot List):**
        You will be working from a structured shot list. The 'onCamera' key contains the main dialogue. The 'bRoll' key contains descriptions of the visual scenes you must also describe in the blog post. The 'textOnScreen' key contains important text to include.

        - **Video Title:** "${title}"
        - **Video Shot List (JSON format):**
        ---
        ${JSON.stringify(shotList, null, 2)}
        ---
        `;
    } else {
        // Fallback for older projects or if shot list hasn't been generated yet
        sourceMaterialPrompt = `
        **Source Video Information (from Script):**
        - **Video Title:** "${title}"
        - **Video Description:** "${description}"
        - **Video Script:**
        ---
        ${finalScript}
        ---
        `;
    }

    const prompt = `
        You are an expert travel blogger and SEO specialist. Your task is to rewrite a YouTube video's content into a comprehensive, engaging, and SEO-optimized blog post.

        **Master Output Format (CRITICAL):**
        You MUST follow these instructions for the output format. This is the most important rule.
        ${blogKb.jsonOutputFormat || 'Your output MUST be a single, valid JSON object with the keys: "title", "suggestedExcerpt", "suggestedTags", "suggestedCategory", and "htmlContent".'}

        **Your Persona & Style Guide:**
        ${youtubeKb.whoAmI || 'Assume a friendly, knowledgeable travel expert persona.'}

        **Core SEO Principles:**
        ${blogKb.coreSeoEngine || 'Focus on providing valuable, easy-to-read content that fully answers the topic.'}

        **Length:**
        The blog post should be comprehensive and detailed, aiming for at least 1,500 - 2,000 words. Expand on the source material's ideas; do not just summarize them.

        **Post Blueprint for 'htmlContent':**
        Use the following instructions to generate the value for the 'htmlContent' key in the JSON object:
        ${blogKb.videoCompanionPostBlueprint || `
            1. Rewrite the source material into a detailed blog post. Do not just copy it.
            2. If working from a shot list, describe the B-Roll visuals to create a rich reading experience.
            3. Prominently feature a placeholder to embed the YouTube video: [YOUTUBE_VIDEO_EMBED_HERE].
            4. Conclude with a summary and a strong call-to-action.
        `}

        ${sourceMaterialPrompt}

        Now, generate the complete blog post as a single, valid JSON object.
    `;

    try {
        // CORRECTED: Call the correct utility function and pass isComplex: true
        return await window.aiUtils.callGeminiAPI(prompt, settings, {}, true);
    } catch (error) {
        console.error('Error generating blog post JSON from video:', error);
        throw new Error('Failed to generate the blog post from the video script.');
    }
};
