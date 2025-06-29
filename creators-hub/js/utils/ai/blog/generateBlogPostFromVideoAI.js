// js/utils/ai/blog/generateBlogPostFromVideoAI.js

/**
 * Generates a full blog post from a video's script and metadata.
 * @param {object} video - The video object, containing title, description, and script.
 * @param {object} settings - The application settings object.
 * @param {object} knowledgeBases - The user's knowledge bases.
 * @returns {Promise<string>} A promise that resolves to the generated blog post content (HTML).
 */
async function generateBlogPostFromVideoAI(video, settings, knowledgeBases) {
    const { title, description, finalScript } = video;
    const { blog: blogKb, youtube: youtubeKb } = knowledgeBases;

    // Use the Flash model for this task as it's primarily reformatting.
    const model = settings.flashModelName || 'gemini-1.5-flash-latest';

    const prompt = `
        You are an expert travel blogger and SEO specialist. Your task is to rewrite a YouTube video script into a comprehensive, engaging, and SEO-optimized blog post.

        **Your Persona & Style Guide:**
        ${youtubeKb.whoAmI || 'Assume a friendly, knowledgeable travel expert persona.'}

        **Core SEO Principles:**
        ${blogKb.coreSeoEngine || 'Focus on providing valuable, easy-to-read content that fully answers the topic.'}

        **Monetization Goals:**
        ${blogKb.monetizationGoals || 'The goal is to drive traffic to the YouTube channel and website.'}

        **Post Blueprint:**
        Follow these instructions for structuring the post:
        ${blogKb.videoCompanionPostBlueprint || `
            1. Create a compelling, SEO-friendly H1 title based on the video title.
            2. Write a short, engaging introduction that hooks the reader.
            3. Rewrite the video script into a detailed blog post. Do not just copy it. Elaborate on points, add more context, and organize the content with clear H2 and H3 headings.
            4. Ensure the tone is appropriate for a blog post, not a spoken script.
            5. Prominently feature a placeholder to embed the YouTube video. Use the text: [YOUTUBE_VIDEO_EMBED_HERE].
            6. Conclude with a summary and a strong call-to-action to watch the video, like the channel, and leave a comment.
        `}

        **Source Video Information:**
        - **Video Title:** "${title}"
        - **Video Description:** "${description}"
        - **Video Script:**
        ---
        ${finalScript}
        ---

        Now, generate the complete blog post as a single block of clean HTML. Do not include \`<html>\` or \`<body>\` tags.
    `;

    try {
        const response = await window.ai.core.callGeminiAPI(prompt, settings, model);
        // Clean up the response to ensure it's just the HTML content
        return response.replace(/```html/g, '').replace(/```/g, '').trim();
    } catch (error) {
        console.error('Error generating blog post from video:', error);
        throw new Error('Failed to generate the blog post from the video script.');
    }
}

// Add the function to the global AI utilities object
window.ai = window.ai || {};
window.ai.blog = window.ai.blog || {};
window.ai.blog.generateBlogPostFromVideo = generateBlogPostFromVideoAI;
