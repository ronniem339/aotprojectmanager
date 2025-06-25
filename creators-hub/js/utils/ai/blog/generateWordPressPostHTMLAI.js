window.aiUtils = window.aiUtils || {};

/**
 * Generates a full blog post in HTML format, ready for WordPress, with OtterBlocks support.
 */
window.aiUtils.generateWordPressPostHTMLAI = async ({ idea, settings, tone }) => {
    const { title, primaryKeyword } = idea;
    const styleGuidePrompt = window.aiUtils.getStyleGuidePrompt(settings, tone);

    const prompt = `
You are an expert travel blogger and content creator. Your task is to write a complete blog post based on the provided title, keywords, and tone. The output must be well-structured HTML, ready for the WordPress Gutenberg editor.

${styleGuidePrompt}

**Blog Post Details:**
- **Title:** ${title}
- **Primary Keyword:** ${primaryKeyword}
- **Desired Tone:** ${tone || 'Informative'}

**Instructions:**
1.  Create a compelling and engaging blog post using standard Gutenberg blocks like paragraphs and headings.
2.  The structure should be logical with a clear introduction, body, and conclusion.
3.  **CRITICAL:** Wrap each distinct block of content (paragraphs, headings, lists, placeholders) in Gutenberg block comments.
4.  Do NOT include the main post title as a heading (e.g., as an <h1> tag) within the HTML content.
5.  Strategically place placeholders for images and YouTube videos where they would be most effective, using the specific block markup below.

    * **Image Placeholder Block:** Use this exact two-block format. This creates a clickable image placeholder and a descriptive paragraph below it.

        <figure class="wp-block-image size-large"><img alt="image placeholder"/></figure>
        <p class="is-style-small-text"><em>Image suggestion: [add descriptive keywords for the image here]</em></p>

    * **YouTube Placeholder Block:** Use this exact format. It creates a proper YouTube embed block with a helpful search link.

        <figure class="wp-block-embed is-type-video is-provider-youtube wp-embed-aspect-16-9 wp-has-aspect-ratio"><div class="wp-block-embed__wrapper">https://www.youtube.com/results?search_query=[add+descriptive+keywords+for+the+video+here]</div><figcaption><strong>YouTube Placeholder:</strong> [add descriptive keywords for the video here]</figcaption></figure>

6.  Ensure the primary keyword is naturally integrated into the text.
7.  Do NOT include \`<html>\`, \`<head>\`, or \`<body>\` tags.
8.  Your entire response must be only the raw HTML content with Gutenberg block comments.`;

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
