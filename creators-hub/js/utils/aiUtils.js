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
        // Ensure the response is parsed as JSON. If the API returns raw text unexpectedly, this might fail.
        try {
            return JSON.parse(result.candidates[0].content.parts[0].text);
        } catch (e) {
            console.error("Failed to parse AI response as JSON:", result.candidates[0].content.parts[0].text, e);
            throw new Error("AI response was not valid JSON.");
        }
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
     * @param {object} params.settings - User settings containing API key and knowledge bases.
     * @returns {Promise<Array<string>>} - A promise that resolves to an array of keyword strings.
     * @throws {Error} If the API call fails or returns an invalid format.
     */
    generateKeywordsAI: async ({ title, concept, locationsFeatured, projectTitle, projectDescription, settings }) => {
        const apiKey = settings.geminiApiKey;
        const videoLocations = locationsFeatured.join(', ');
        const youtubeSeoKb = settings.knowledgeBases?.youtube?.youtubeSeoKnowledgeBase || '';
        const videoTitlesKb = settings.knowledgeBases?.youtube?.videoTitles || '';
        const videoDescriptionsKb = settings.knowledgeBases?.youtube?.videoDescriptions || '';


        const prompt = `Act as a YouTube SEO expert and keyword research tool.
        Generate a list of 25-30 potential search terms.
        
        Context for keyword generation:
        - Main Title/Topic: "${title}"
        - Concept/Description: "${concept}"
        - Featured Locations: ${videoLocations.length > 0 ? videoLocations : 'None specified'}
        - Overall Project/Playlist Title: "${projectTitle}"
        - Overall Project/Playlist Description: "${projectDescription}"

        ${youtubeSeoKb ? `YouTube SEO Best Practices: ${youtubeSeoKb}` : ''}
        ${videoTitlesKb ? `YouTube Video Title Guidelines: ${videoTitlesKb}` : ''}
        ${videoDescriptionsKb ? `YouTube Video Description Guidelines: ${videoDescriptionsKb}` : ''}

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
    },

    /**
     * Extracts and infers video metadata (locations and keywords/tags) using Gemini AI.
     * This is useful for parsing content from imported sources like YouTube descriptions.
     *
     * @param {object} params - Parameters for metadata extraction.
     * @param {string} params.videoTitle - The title of the video.
     * @param {string} params.videoDescription - The raw description of the video.
     * @param {object} params.settings - User settings containing API key and knowledge bases.
     * @returns {Promise<object>} - A promise that resolves to an object like:
     * `{"locations_featured": ["Location 1", "Location 2"], "targeted_keywords": ["keyword1", "keyword2"]}`.
     * @throws {Error} If the API call fails or returns an invalid format.
     */
    extractVideoMetadataAI: async ({ videoTitle, videoDescription, settings }) => {
        const apiKey = settings.geminiApiKey;
        const youtubeSeoKb = settings.knowledgeBases?.youtube?.youtubeSeoKnowledgeBase || '';

        if (!apiKey) {
            throw new Error("Gemini API Key is not set. Cannot extract video metadata.");
        }

        const prompt = `Analyze the following YouTube video title and description.
        Infer the most relevant geographical locations featured in the video and the most important keywords/tags for SEO.
        
        Video Title: "${videoTitle}"
        Video Description: "${videoDescription}"
        
        ${youtubeSeoKb ? `YouTube SEO Best Practices Context: ${youtubeSeoKb}` : ''}

        Provide the output as a JSON object with two keys:
        - "locations_featured": An array of strings, listing inferred locations (e.g., ["Paris", "Eiffel Tower"]). If no specific locations can be inferred, return an empty array.
        - "targeted_keywords": An array of strings, listing relevant SEO keywords/tags (e.g., ["travel vlog", "Paris guide", "Eiffel Tower climb"]). Include about 10-15 keywords.
        
        Example output:
        {
          "locations_featured": ["New York City", "Statue of Liberty"],
          "targeted_keywords": ["NYC travel", "New York guide", "Statue of Liberty tour", "city break", "USA vlog"]
        }`;

        const parsedJson = await window.aiUtils.callGeminiAPI(prompt, apiKey);

        if (parsedJson && Array.isArray(parsedJson.locations_featured) && Array.isArray(parsedJson.targeted_keywords)) {
            return {
                locations_featured: parsedJson.locations_featured,
                targeted_keywords: parsedJson.targeted_keywords
            };
        } else {
            throw new Error("AI returned an invalid format for video metadata extraction.");
        }
    }
};
