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
        - **Raw Content:**
${String(blogPostContent)}

        **Instructions:**
        1.  **Format the Content:** Convert the raw text into well-structured HTML. For each distinct content block (e.g., paragraph, heading, list, image), wrap the standard HTML tags with the corresponding Gutenberg block comments (e.g., <p>...</p>, <h2>...</h2>, <ul>...</ul>). For the FAQ section, specifically use the `` block or its equivalent if a more specific FAQ block structure is preferred.
        2.  **Handle List Items:** If the raw content uses <br> tags within list items (<li>) to separate text, convert these into nested paragraphs or nested lists if the points are distinct enough, for a more semantic and Gutenberg-friendly approach.
        3.  **Generate Metadata:** Create a concise excerpt, relevant tags, and suggest one primary WordPress category.
        4.  **Apply Creator Style Guide:** Ensure the transformed HTML content strictly adheres to the 'Creator Style Guide & Context' provided, incorporating the specified tone, pacing, vocabulary, sentence structure, and humor, while actively avoiding all 'Excluded Phrases'.
        5.  **Structure the Output:** Your final output must be a single, clean JSON object. Do not include any text or markdown formatting before or after the JSON.

        **JSON Output Structure:**
        {
          "htmlContent": "<!-- wp:paragraph --><p>Your formatted HTML content starts here...</p><!-- /wp:paragraph -->...",
          "excerpt": "Generate a concise (under 30 words), compelling, and SEO-friendly summary of the post, drawing on the 'Creator Style Guide' for tone. This should entice readers to click.",
          "tags": ["Generate 5-8 highly relevant and specific tags (keywords or short phrases) that accurately describe the content and are commonly searched by travelers. Focus on locations, activities, and key attractions mentioned in the post."],
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