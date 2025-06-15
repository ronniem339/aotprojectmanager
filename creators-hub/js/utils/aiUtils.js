// js/utils/aiUtils.js

/**
 * Calls the Gemini API with a given prompt and optional generation configuration.
 *
 * @param {string} prompt - The text prompt for the API.
 * @param {string} apiKey - The Gemini API key.
 * @param {object} [generationConfig={}] - Optional generation configuration for the API.
 * @returns {Promise<object>} - A promise that resolves to the parsed JSON response from the API.
 * @throws {Error} If the API key is not set or if the API response is not OK.
 */
window.aiUtils = {
    callGeminiAPI: async (prompt, apiKey, generationConfig = {}) => {
        if (!apiKey) {
            throw new Error("Gemini API Key is not set. Please set it in the settings.");
        }

        const payload = {
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
                ...generationConfig
            }
        };

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err?.error?.message || 'API Error');
        }
        const result = await response.json();
        return JSON.parse(result.candidates[0].content.parts[0].text);
    },

    /**
     * Generates keyword ideas using the Gemini AI.
     *
     * @param {object} params - Parameters for keyword generation.
     * @param {string} params.title - The main title (project or video).
     * @param {string} params.concept - The concept/description.
     * @param {Array<string>} params.locationsFeatured - Array of featured location names.
     * @param {string} params.projectTitle - The overall project/playlist title.
     * @param {string} params.projectDescription - The overall project/playlist description.
     * @param {object} params.settings - User settings containing API key.
     * @returns {Promise<Array<string>>} - A promise that resolves to an array of keyword strings.
     * @throws {Error} If the API call fails or returns an invalid format.
     */
    generateKeywordsAI: async ({ title, concept, locationsFeatured, projectTitle, projectDescription, settings }) => {
        const apiKey = settings.geminiApiKey;
        const videoLocations = locationsFeatured.join(', ');

        const prompt = `Act as a YouTube SEO expert and keyword research tool.
        Generate a list of 25-30 potential search terms.
        
        Context for keyword generation:
        - Main Title/Topic: "${title}"
        - Concept/Description: "${concept}"
        - Featured Locations: ${videoLocations.length > 0 ? videoLocations : 'None specified'}
        - Overall Project/Playlist Title: "${projectTitle}"
        - Overall Project/Playlist Description: "${projectDescription}"

        Provide a mix of:
        - Short-tail keywords (e.g., "travel Cyprus")
        - Long-tail keywords (e.g., "best hidden beaches in Cyprus")
        - Question-based keywords (e.g., "what to do in Cyprus in October")
        
        Return the list as a JSON object like: {"keywords": ["keyword one", "keyword two", "keyword three", ...]}.`;

        const parsedJson = await window.aiUtils.callGeminiAPI(prompt, apiKey);
        
        if (parsedJson && Array.isArray(parsedJson.keywords)) {
            return parsedJson.keywords;
        } else {
            throw new Error("AI returned an invalid keyword format.");
        }
    }
};
