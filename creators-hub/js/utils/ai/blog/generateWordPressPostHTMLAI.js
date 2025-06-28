window.aiUtils = window.aiUtils || {};

/**
 * Generates a full blog post in HTML format, ready for WordPress, with OtterBlocks support.
 */
window.aiUtils.generateWordPressPostHTMLAI = async ({ idea, settings, tone }) => {
    const { title, primaryKeyword } = idea;
    const styleGuidePrompt = window.aiUtils.getStyleGuidePrompt(settings, tone);

    const prompt =
        '\nYou are an expert travel blogger and content creator. Your task is to write a complete blog post based on the provided title, keywords, and tone. The output must be well-structured HTML, ready for the WordPress Gutenberg editor, specifically for a user of the Otter Blocks editor.\n\n' +
        styleGuidePrompt +
        '\n\n**Blog Post Details:**\n' +
        `- **Title:** ${title}\n` +
        `- **Primary Keyword:** ${primaryKeyword}\n` +
        `- **Desired Tone:** ${tone || 'Informative'}\n\n` +
        '**Instructions:**\n' +
        '1.  Create a compelling and engaging blog post using the Gutenberg block formats provided below.\n' +
        '2.  The structure should be logical with a clear introduction, body, and conclusion.\n' +
        '3.  **CRITICAL:** Wrap each distinct block of content (paragraphs, headings, lists, placeholders) in Gutenberg block comments **EXACTLY as shown in the examples**.\n' +
        '4.  Do NOT include the main post title as a heading (e.g., as an <h1> tag) within the HTML content.\n' +
        '5.  Strategically place placeholders for images, YouTube videos, and affiliate links where they would be most effective, using the specific block markup below.\n\n' +
        '    *   **Paragraph Block:** Use this for all standard paragraphs.\n\n' +
        '        <!-- wp:paragraph -->\n' +
        '        <p>This is a standard paragraph of text.</p>\n' +
        '        <!-- /wp:paragraph -->\n\n' +
        '    *   **Heading Block:** Use this format for all headings. Adjust the `level` as needed (e.g., 2 for `<h2>`, 3 for `<h3>`).\n\n' +
        '        <!-- wp:heading {"level":2} -->\n' +
        '        <h2>This is a Heading</h2>\n' +
        '        <!-- /wp:heading -->\n\n' +
        '    *   **Image Placeholder Block:** Use this exact format. This creates a clickable image placeholder and a descriptive paragraph below it.\n\n' +
        '        <!-- wp:image {"id":-1,"sizeSlug":"large","linkDestination":"none"} -->\n' +
        '        <figure class="wp-block-image size-large"><img src="https://via.placeholder.com/1024x576.png?text=Replace+this+image" alt="Image placeholder"/></figure>\n' +
        '        <!-- /wp:image -->\n\n' +
        '        <!-- wp:paragraph {"className":"is-style-small-text"} -->\n' +
        '        <p class="is-style-small-text"><em>Image suggestion: [add descriptive keywords for the image here]</em></p>\n' +
        '        <!-- /wp:paragraph -->\n\n' +
        '    *   **YouTube Placeholder Block:** Use this exact format. It creates a proper YouTube embed block with a helpful search link.\n\n' +
        '        <!-- wp:embed {"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ","type":"video","providerNameSlug":"youtube","responsive":true,"className":"wp-embed-aspect-16-9 wp-has-aspect-ratio"} -->\n' +
        '        <figure class="wp-block-embed is-type-video is-provider-youtube wp-embed-aspect-16-9 wp-has-aspect-ratio"><div class="wp-block-embed__wrapper">\n' +
        '        https://www.youtube.com/watch?v=dQw4w9WgXcQ\n' +
        '        </div><figcaption><strong>YouTube Placeholder:</strong> [add descriptive keywords for the video here]</figcaption></figure>\n' +
        '        <!-- /wp:embed -->\n\n' +
        '    *   **Affiliate Link Placeholder Block:** Use this exact format. It creates a visually distinct button that serves as a placeholder for an affiliate link.\n\n' +
        '        <!-- wp:buttons -->\n' +
        '        <div class="wp-block-buttons">\n' +
        '            <!-- wp:button {"backgroundColor":"vivid-cyan-blue","textColor":"white","className":"is-style-outline"} -->\n' +
        '            <div class="wp-block-button is-style-outline"><a class="wp-block-button__link has-white-color has-vivid-cyan-blue-background-color has-text-color has-background" href="[add affiliate link here]" target="_blank" rel="noopener noreferrer">[add affiliate link text here]</a></div>\n' +
        '            <!-- /wp:button -->\n' +
        '        </div>\n' +
        '        <!-- /wp:buttons -->\n\n' +
        '6.  Ensure the primary keyword is naturally integrated into the text.\n' +
        '7.  Do NOT include `<html>`, `<head>`, or `<body>` tags.\n' +
        8.  Your entire response must be only the raw HTML content with Gutenberg block comments. **Ensure there are NO extra characters, spaces, or newlines before the first `<!-- wp:` comment or after the last `<!-- /wp:` comment.**
'

    try {
        const htmlContent = await window.aiUtils.callGeminiAPI(
            prompt,
            settings,
            { responseMimeType: "text/plain" },
            true // This is a complex task
        );

        // Clean up potential markdown formatting from the AI response
        let cleanedHtml = htmlContent.trim();
        if (cleanedHtml.startsWith("```html")) {
            cleanedHtml = cleanedHtml.substring(7).trim();
        } else if (cleanedHtml.startsWith("```")) {
             cleanedHtml = cleanedHtml.substring(3).trim();
        }
        if (cleanedHtml.endsWith("```")) {
            cleanedHtml = cleanedHtml.slice(0, -3).trim();
        }

        return cleanedHtml;

    } catch (error) {
        console.error("Error generating WordPress Post HTML:", error);
        throw new Error(`AI failed to generate WordPress HTML: ${error.message || error}`);
    }
};