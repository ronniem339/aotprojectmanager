// creators-hub/js/utils/ai/scriptingV2/identifyLocationsFromTranscriptAI.js

// This AI utility identifies geographical locations mentioned in the transcript
// that are not already present in the video's featured locations.

window.aiUtils.identifyLocationsFromTranscriptAI = async ({ fullTranscript, existingLocations, videoTitle, settings }) => {
    console.log("Identifying new locations from transcript with AI...");

    // --- Input Validation ---
    if (!fullTranscript || typeof fullTranscript !== 'string' || fullTranscript.trim() === '') {
        throw new Error("Transcript is required to identify locations.");
    }
    if (!Array.isArray(existingLocations)) {
        throw new Error("Existing locations must be an array.");
    }
    if (!videoTitle || typeof videoTitle !== 'string') {
        throw new Error("Video title is required for context.");
    }
    if (!settings || !settings.knowledgeBases) {
        throw new Error("User settings are incomplete for AI location identification.");
    }

    const existingLocationsList = existingLocations.length > 0
        ? existingLocations.map(loc => `- ${loc}`).join('\n')
        : 'No specific locations currently listed.';

    const styleGuidePrompt = window.aiUtils.getStyleGuidePromptV2(settings);

    const prompt = `
        You are an expert travel documentarian and location scout. Your task is to analyze a video transcript and identify any significant geographical locations mentioned by the creator that are *not* already in the provided list of existing featured locations.

        **CRITICAL RULES:**
        1.  **Strict JSON Output:** Your entire response MUST be a single, valid JSON object.
        2.  **No Explanations:** Do NOT include any conversational text, explanations, or markdown outside of the JSON. Only the JSON object.
        3.  **Diacritics:** For all text you generate (location names), you MUST NOT use diacritics (e.g., use 'cafe' instead of 'café', 'Cordoba' instead of 'Córdoba').
        4.  **Focus on New Locations:** Only suggest locations that are clearly mentioned in the 'Full Transcript' AND are NOT present in the 'Existing Featured Locations' list.
        5.  **Specific Locations:** Focus on cities, towns, famous landmarks (e.g., "Eiffel Tower", "Louvre Museum"), or natural features (e.g., "Grand Canyon", "Mount Everest"). Avoid generic mentions like "the street", "the hotel", "the shop" unless a specific name is given.
        6.  **Contextual Relevance:** Prioritize locations that seem significant to the video's narrative, not just passing mentions.

        **Creator's Style Guide & Tone:**
        ${styleGuidePrompt}

        **Video Context:**
        - **Video Title:** ${videoTitle}

        **Existing Featured Locations (do NOT suggest these):**
        ---
        ${existingLocationsList}
        ---

        **Full Transcript:**
        ---
        ${fullTranscript}
        ---

        **Your Task:**
        Identify new, significant geographical locations from the 'Full Transcript' that are not in the 'Existing Featured Locations'.

        **Output Format:**
        Your final output MUST be a JSON object with a single key "suggested_new_locations", which is an array of strings (the suggested location names). If no new locations are found, the array should be empty.

        Example:
        \`\`\`json
        {
            "suggested_new_locations": ["Colosseum", "Trevi Fountain", "Vatican City"]
        }
        \`\`\`
        \`\`\`json
        {
            "suggested_new_locations": []
        }
        \`\`\`

        **JSON Output:**
    `;

    let response;
    try {
        response = await window.aiUtils.callGeminiAPI(
            prompt,
            settings,
            { taskTier: 'heavy' }, // This is an analysis task
            {
                temperature: 0.4, // Keep it focused
                response_mime_type: "application/json",
            }
        );

        // --- Output Validation ---
        if (!response || typeof response !== 'object' || !Array.isArray(response.suggested_new_locations)) {
            console.error("AI response for location identification is malformed:", response);
            throw new Error("AI returned an invalid structure for suggested locations. Expected an object with a 'suggested_new_locations' array.");
        }

        // Ensure all suggested locations are strings and trim them
        response.suggested_new_locations = response.suggested_new_locations
            .filter(loc => typeof loc === 'string' && loc.trim() !== '')
            .map(loc => loc.trim());

    } catch (err) {
        console.error("Error identifying locations from transcript with AI:", err);
        throw new Error(`Failed to identify locations from transcript: ${err.message || "An unknown AI error occurred."}`);
    }

    return response;
};
