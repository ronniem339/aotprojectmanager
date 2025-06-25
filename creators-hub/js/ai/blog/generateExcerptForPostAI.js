window.aiUtils = window.aiUtils || {};

/**
 * Generates a clean, text-only excerpt/meta description for a blog post.
 */
window.aiUtils.generateExcerptForPostAI = async ({ idea, settings }) => {
    const { title, description } = idea; // Use the original idea's title and description
    const prompt = `
You are an expert SEO copywriter. Your task is to write a compelling, text-only meta description (excerpt) for a blog post based on its title and summary.

**Instructions:**
1.  The excerpt must be a concise and engaging summary, ideally between 140 and 160 characters.
2.  The output must be a single paragraph of plain text.
3.  Do NOT use any HTML, Markdown, quotation marks, or other special formatting.
4.  Do NOT include labels like "Excerpt:". The entire response must be ONLY the text of the excerpt itself.

**Blog Post Details:**
- **Title:** "${title}"
- **Summary:** "${description}"

Based on these details, generate the perfect excerpt.`;

    try {
        const excerptText = await window.aiUtils.callGeminiAPI(
            prompt,
            settings,
            { responseMimeType: "text/plain" },
            false // This is not a complex task
        );
        // Return the clean, trimmed text.
        return excerptText.trim();
    } catch (error) {
        console.error("Error generating post excerpt:", error);
        // Fallback to the original idea description if the AI fails.
        return idea.description;
    }
};
