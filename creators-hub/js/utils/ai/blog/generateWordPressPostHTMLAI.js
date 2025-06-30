window.aiUtils = window.aiUtils || {};

/**
 * Generates a full blog post in HTML format, ready for WordPress, with OtterBlocks support.
 */
window.aiUtils.generateWordPressPostHTMLAI = async ({ idea, settings, tone }) => {
    const { title, primaryKeyword } = idea;
    const styleGuidePrompt = window.aiUtils.getStyleGuidePrompt(settings, tone);

    const prompt = `
You are an expert travel blogger and content creator with deep knowledge of the WordPress Gutenberg editor and OtterBlocks. Your task is to write a complete, engaging, and visually appealing blog post based on the provided title and keywords.

${styleGuidePrompt}

**Blog Post Details:**
- **Title:** ${title}
- **Primary Keyword:** ${primaryKeyword}
- **Desired Tone:** ${tone || 'Informative'}

**Formatting Instructions:**
1.  **Vary Your Block Formats:** Do NOT overuse simple paragraphs and bullet points. Your main goal is to create a visually interesting layout. Use a rich variety of Gutenberg blocks to present information in an engaging way.
2.  **Utilize Advanced Blocks:** Where appropriate, structure the content using the following blocks. Use the correct Gutenberg block comment syntax (e.g., ):
    - **Accordions ():** Use for FAQs, detailed itineraries, or any content that can be collapsed.
    - **Tabs ():** Perfect for comparing options, like different neighborhoods to stay in or pros and cons.
    - **Media & Text ():** Combine images with descriptive text.
    - **Spacers ():** Use spacers to improve readability.
    - **Product Reviews ():** If discussing hotels or tours, format them using this block with a star rating.
    - **Google Maps ():** When a specific location is mentioned, embed a map using its name.
3.  **Content-Driven Formatting:** Let the content guide your choice of block. A list of "Pros and Cons" is better in tabs than a bulleted list. A section on "Frequently Asked Questions" is perfect for an accordion.
4.  **Placeholders:** Strategically place placeholders for images, YouTube videos, and affiliate links where they would be most effective, using the specific block markup below.

    * **Image Placeholder Block:** Use this exact format. This creates a clickable image placeholder and a descriptive paragraph below it.

        <figure class="wp-block-image size-large"><img src="https://via.placeholder.com/1024x576.png?text=Replace+this+image" alt="Image placeholder"/></figure>
        <p class="is-style-small-text"><em>Image suggestion: [add descriptive keywords for the image here]</em></p>
        * **YouTube Placeholder Block:** Use this exact format. It creates a proper YouTube embed block with a helpful search link.

        <figure class="wp-block-embed is-type-video is-provider-youtube wp-embed-aspect-16-9 wp-has-aspect-ratio"><div class="wp-block-embed__wrapper">
        https://www.youtube.com/watch?v=dQw4w9WgXcQ
        </div><figcaption><strong>YouTube Placeholder:</strong> [add descriptive keywords for the video here]</figcaption></figure>
        * **Affiliate Link Placeholder Block:** Use this exact format. It creates a visually distinct button that serves as a placeholder for an affiliate link.

        <div class="wp-block-buttons">
            <div class="wp-block-button is-style-outline"><a class="wp-block-button__link has-white-color has-vivid-cyan-blue-background-color has-text-color has-background" href="[add affiliate link here]" target="_blank" rel="noopener noreferrer">[add affiliate link text here]</a></div>
            </div>
        5.  **CRITICAL:** Wrap each distinct block of content (paragraphs, headings, lists, placeholders) in Gutenberg block comments.
6.  **No Main Title:** Do NOT include the main post title as an <h1> tag within the HTML content.
7.  **Keyword Integration:** Naturally integrate the primary keyword into the text.
8.  **Output Format:** Your entire response must be only the raw HTML content with Gutenberg block comments. Do NOT use markdown.
`;

    try {
        const htmlContent = await window.aiUtils.callGeminiAPI(
            prompt,
            settings,
            { responseMimeType: "text/plain" },
            true // This is a complex task
        );

        // Clean up potential markdown formatting from the AI response
        let cleanedHtml = htmlContent.trim();
        if (cleanedHtml.startsWith('```html')) {
            cleanedHtml = cleanedHtml.substring(7).trim();
        } else if (cleanedHtml.startsWith('```')) {
             cleanedHtml = cleanedHtml.substring(3).trim();
        }
        if (cleanedHtml.endsWith('```')) {
            cleanedHtml = cleanedHtml.slice(0, -3).trim();
        }

        return cleanedHtml;

    } catch (error) {
        console.error("Error generating WordPress Post HTML:", error);
        throw new Error(`AI failed to generate WordPress HTML: ${error.message || error}`);
    }
};
