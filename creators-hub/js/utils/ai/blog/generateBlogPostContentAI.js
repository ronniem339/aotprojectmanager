window.aiUtils = window.aiUtils || {};

/**
 * Generates the full blog post content from an idea.
 * This is a "complex" task that uses the more powerful Gemini model.
 */
window.aiUtils.generateBlogPostContentAI = async (idea, settings) => {
    const styleGuidePrompt = window.aiUtils.getStyleGuidePrompt(settings);
    // This assumes related videos are handled elsewhere or not needed for this isolated function.
    const relatedVideoContext = ''; 

    const prompt = `
        You are an expert, world-class blog post writer specializing in creating engaging, SEO-optimized content.
        Your persona is defined by the following style guide:
        ${styleGuidePrompt}

        Your task is to write a full, complete, high-quality blog post based on the following idea:
        - Title: "${idea.title}"
        - Primary Keyword: "${idea.primaryKeyword}"
        - Description: "${idea.description}"
        - Post Type: "${idea.postType}"
        - Monetization Angle: "${idea.monetizationOpportunities}"

        ${relatedVideoContext}

        **WRITING INSTRUCTIONS:**
        1.  **Length:** The blog post should be comprehensive, typically between 1,500 and 2,500 words.
        2.  **Structure:** Use clear headings (H2, H3), short paragraphs, and bullet points to improve readability.
        3.  **SEO:** Naturally integrate the primary keyword and related secondary keywords throughout the text.
        4.  **Content:** The content must be 100% original, factual, and provide genuine value to the reader.
        5.  **Images:** Include placeholders like "[Relevant Image: A detailed map of the La Gomera hiking trails]" where an image would enhance the post.
        6.  **Internal Links:** Include at least one placeholder for an internal link, like "[Internal Link: Read our full guide to the Canary Islands]".
        7.  **Output:** The final output should be a single string of Markdown-formatted text.

        **CRITICAL OUTPUT FORMATTING RULES:**
        1.  Your ENTIRE output MUST be a single, valid JSON object.
        2.  This JSON object MUST be enclosed within a markdown code block, starting with '~~~json' on a new line and ending with '~~~' on a new line.
        3.  The JSON object must have a single key: "blogPostContent". The value should be the complete blog post as a single Markdown string.
        4.  DO NOT include any text or explanation outside of the '~~~json' and '~~~' delimiters.
        5.  **FAILURE TO FOLLOW THESE RULES WILL CAUSE AN ERROR.** Ensure the final '~~~' is present at the very end of your response.
    `;

    try {
        const rawResponseText = await window.aiUtils.callGeminiAPI(prompt, settings, { responseMimeType: "text/plain" }, true);

        // --- RESILIENT PARSING LOGIC ---
        const startIndex = rawResponseText.indexOf('~~~json');
        if (startIndex !== -1) {
            let potentialJson = rawResponseText.substring(startIndex + '~~~json'.length);
            const endIndex = potentialJson.lastIndexOf('~~~');

            if (endIndex !== -1) {
                potentialJson = potentialJson.substring(0, endIndex);
            }
            
            potentialJson = potentialJson.trim();

            try {
                const parsed = JSON.parse(potentialJson);
                if (parsed && parsed.blogPostContent) return parsed;
            } catch (e) {
                console.warn("Initial JSON parsing failed, attempting to repair truncated JSON...", e.message);
                const lastBrace = potentialJson.lastIndexOf('}');
                if (lastBrace !== -1) {
                    const repairedJsonString = potentialJson.substring(0, lastBrace + 1);
                    try {
                        const parsed = JSON.parse(repairedJsonString);
                        if (parsed && parsed.blogPostContent) {
                            console.log("Successfully repaired and parsed truncated JSON.");
                            return parsed;
                        }
                    } catch (e2) {
                        console.error("JSON repair attempt failed.", e2);
                    }
                }
            }
        }

        console.error("AI response did not contain a valid JSON block, even after attempting to repair.", rawResponseText);
        throw new Error("AI response did not provide the expected JSON format. Please try again.");

    } catch (error) {
        console.error("Error generating blog post content:", error);
        throw new Error(`AI failed to generate blog post content: ${error.message || error}`);
    }
};
