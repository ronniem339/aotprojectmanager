window.aiUtils = window.aiUtils || {};

/**
 * Generates a full blog post in HTML format, ready for WordPress, with OtterBlocks support.
 */
window.aiUtils.generateWordPressPostHTMLAI = async ({ idea, settings, tone }) => {
    const { title, primaryKeyword } = idea;
    const styleGuidePrompt = window.aiUtils.getStyleGuidePrompt(settings, tone);

    const prompt = `
You are an expert travel blogger and content creator. Your task is to write a complete blog post based on the provided title, keywords, and tone. The output must be well-structured HTML, ready for the WordPress Gutenberg editor, specifically for a user of the Otter Blocks editor.

${styleGuidePrompt}

**Blog Post Details:**
- **Title:** ${title}
- **Primary Keyword:** ${primaryKeyword}
- **Desired Tone:** ${tone || 'Informative'}

**Instructions:**
1.  Create a compelling and engaging blog post using the Gutenberg block formats provided below.
2.  The structure should be logical with a clear introduction, body, and conclusion.
3.  **CRITICAL:** Wrap each distinct block of content (paragraphs, headings, lists, placeholders) in Gutenberg block comments as shown in the examples.
4.  Do NOT include the main post title as a heading (e.g., as an <h1> tag) within the HTML content.
5.  Strategically place placeholders for images, YouTube videos, and affiliate links where they would be most effective, using the specific block markup below.

    * **Paragraph Block:** Use this for all standard paragraphs.

        <!-- wp:paragraph -->
        <p>This is a standard paragraph of text.</p>
        <!-- /wp:paragraph -->

    * **Heading Block:** Use this format for all headings. Adjust the `level` as needed (e.g., 2 for `<h2>`, 3 for `<h3>`).

        <!-- wp:heading {"level":2} -->
        <h2>This is a Heading</h2>
        <!-- /wp:heading -->

    * **Image Placeholder Block:** Use this exact format. This creates a clickable image placeholder and a descriptive paragraph below it.

        <!-- wp:image {"id":-1,"sizeSlug":"large","linkDestination":"none"} -->
        <figure class="wp-block-image size-large"><img src="https://via.placeholder.com/1024x576.png?text=Replace+this+image" alt="Image placeholder"/></figure>
        <!-- /wp:image -->

        <!-- wp:paragraph {"className":"is-style-small-text"} -->
        <p class="is-style-small-text"><em>Image suggestion: [add descriptive keywords for the image here]</em></p>
        <!-- /wp:paragraph -->

    * **YouTube Placeholder Block:** Use this exact format. It creates a proper YouTube embed block with a helpful search link.

        <!-- wp:embed {"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ","type":"video","providerNameSlug":"youtube","responsive":true,"className":"wp-embed-aspect-16-9 wp-has-aspect-ratio"} -->
        <figure class="wp-block-embed is-type-video is-provider-youtube wp-embed-aspect-16-9 wp-has-aspect-ratio"><div class="wp-block-embed__wrapper">
        https://www.youtube.com/watch?v=dQw4w9WgXcQ
        </div><figcaption><strong>YouTube Placeholder:</strong> [add descriptive keywords for the video here]</figcaption></figure>
        <!-- /wp:embed -->

    * **Affiliate Link Placeholder Block:** Use this exact format. It creates a visually distinct button that serves as a placeholder for an affiliate link.

        <!-- wp:buttons -->
        <div class="wp-block-buttons">
            <!-- wp:button {"backgroundColor":"vivid-cyan-blue","textColor":"white","className":"is-style-outline"} -->
            <div class="wp-block-button is-style-outline"><a class="wp-block-button__link has-white-color has-vivid-cyan-blue-background-color has-text-color has-background" href="[add affiliate link here]" target="_blank" rel="noopener noreferrer">[add affiliate link text here]</a></div>
            <!-- /wp:button -->
        </div>
        <!-- /wp:buttons -->

6.  Ensure the primary keyword is naturally integrated into the text.
7.  Do NOT include `<html>`, `<head>`, or `<body>` tags.
8.  Your entire response must be only the raw HTML content with Gutenberg block comments.`

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
