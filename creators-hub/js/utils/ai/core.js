// creators-hub/js/utils/ai/core.js
(function(window) {
    "use strict";

    // Initialize the aiUtils namespace on the window object
    if (!window.aiUtils) {
        window.aiUtils = {};
    }

    /**
     * A core function to communicate with the Gemini API.
     * This is a generic wrapper that handles the API key and endpoint,
     * making it easier to call from other utility functions.
     * @param {string} prompt - The prompt to send to the AI model.
     * @param {object} generationConfig - Configuration for the AI generation, including response format.
     * @returns {Promise<any>} - The parsed JSON response from the API.
     */
    async function callGeminiAPI(prompt, generationConfig = { responseMimeType: "application/json" }) {
        const apiKey = window.appConfig.geminiApiKey;
        if (!apiKey) {
            console.error("Gemini API key is not set.");
            alert("Please set your Gemini API key in the settings.");
            throw new Error("Gemini API key not set.");
        }

        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

        const requestBody = {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            generationConfig
        };

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorBody = await response.json();
                console.error("API Error Response:", errorBody);
                throw new Error(`API request failed with status ${response.status}`);
            }

            const data = await response.json();
            
            if (data.candidates && data.candidates.length > 0 && data.candidates[0].content) {
                const text = data.candidates[0].content.parts[0].text;
                // Clean the response by removing markdown backticks for JSON
                const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
                return JSON.parse(cleanedText);
            } else {
                 // Handle cases where the response might be blocked due to safety settings
                if (data.promptFeedback && data.promptFeedback.blockReason) {
                    console.error("Prompt was blocked:", data.promptFeedback.blockReason);
                    console.error("Safety Ratings:", data.promptFeedback.safetyRatings);
                    alert(`Request was blocked due to: ${data.promptFeedback.blockReason}. Please adjust your input.`);
                    throw new Error(`Request blocked due to: ${data.promptFeedback.blockReason}`);
                }
                console.error("Unexpected API response structure:", data);
                throw new Error("Failed to get a valid response from the AI. The response format was unexpected.");
            }
        } catch (error) {
            console.error("Error calling Gemini API:", error);
            throw error;
        }
    }

    // Expose the core function
    window.aiUtils.callGeminiAPI = callGeminiAPI;

})(window);
