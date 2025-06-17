// creators-hub/js/utils/ai/import.js
(function(window) {
    "use strict";

    if (!window.aiUtils) {
        console.error("aiUtils.core.js must be loaded first.");
        return;
    }

    /**
     * Parses unstructured text to identify video details like title and script.
     * @param {string} text - The raw text to parse.
     * @returns {Promise<object>} - An object containing the parsed video title and script.
     */
    async function parseVideoFromTextAI(text) {
        const prompt = `Analyze the following text, which could be a blog post, a script, or notes. Extract a suitable video title and the main body of content to be used as a video script.

Text to analyze:
---
${text}
---

Respond with a JSON object with the following structure:
{
  "title": "A concise and relevant title for a video based on the text.",
  "script": "The main content from the text, formatted as a clean script, removing any irrelevant conversational parts or metadata."
}`;
        return window.aiUtils.callGeminiAPI(prompt);
    }


    // Expose functions
    Object.assign(window.aiUtils, {
        parseVideoFromTextAI
    });

})(window);
