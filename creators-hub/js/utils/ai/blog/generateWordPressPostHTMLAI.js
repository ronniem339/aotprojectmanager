window.aiUtils = window.aiUtils || {};

/**
 * Generates a full blog post in HTML format, ready for WordPress, with OtterBlocks support.
 */
window.aiUtils.generateWordPressPostHTMLAI = async ({ idea, settings, tone }) => {
    const { title, primaryKeyword, blogPostContent } = idea;
    const styleGuidePrompt = window.aiUtils.getStyleGuidePrompt(settings, tone);

    const prompt =
        `
        You are an expert travel blogger and content creator. Your task is to take the following raw blog post content and transform it into a complete, well-structured HTML document ready for the WordPress Gutenberg editor. You will also generate metadata for the post.

        ${styleGuidePrompt}

        **Blog Post Details:**
        - **Title:** ${title}
        - **Primary Keyword:** ${primaryKeyword}
        - **Raw Content:**
${blogPostContent}

        **Instructions:**
        1.  **Format the Content:** Convert the raw text into well-structured HTML using Gutenberg block formats.
        2.  **Generate Metadata:** Create a concise excerpt, relevant tags, and suggest one primary WordPress category.
        3.  **Structure the Output:** Your final output must be a single, clean JSON object. Do not include any text or markdown formatting before or after the JSON.

        **JSON Output Structure:**
        {
          "htmlContent": "<!-- wp:paragraph --><p>Your formatted HTML content starts here...</p><!-- /wp:paragraph -->...",
          "excerpt": "A short, compelling summary of the post.",
          "tags": ["tag1", "tag2", "tag3"],
          "categories": ["PrimaryCategory"]
        }
        `;

    try {
        console.log("Prompt sent to AI:", prompt);
        const jsonResponse = await window.aiUtils.callGeminiAPI(
            prompt,
            settings,
            { responseMimeType: "application/json" },
            true // This is a complex task
        );
        console.log("Raw JSON response from AI:", jsonResponse);

        // The response should be a JSON object, so we parse it directly.
        return jsonResponse;

    } catch (error) {
        console.error("Error generating WordPress Post HTML:", error);
        throw new Error(`AI failed to generate WordPress HTML: ${error.message || error}`);
    }
};