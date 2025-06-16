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
     * **NEW**: Generates a high-level script plan for a video, including specific questions for user input.
     * @param {object} params - Parameters for script plan generation.
     * @param {string} params.videoTitle - The title of the video.
     * @param {string} params.videoConcept - The high-level concept/summary of the video.
     * @param {Array<object>} params.videoLocationsFeatured - Array of featured location objects (from video.locations_featured).
     * @param {object} params.projectFootageInventory - The project's full footage inventory.
     * @param {string} params.whoAmI - User's persona.
     * @param {string} params.styleGuideText - User's style guide.
     * @param {string} params.apiKey - The Gemini API key.
     * @returns {Promise<object>} - A promise that resolves to an object with `scriptPlan` (string) and `locationQuestions` (array of {name, question}).
     * @throws {Error} If the API call fails or returns an invalid format.
     */
    generateScriptPlanAI: async ({ videoTitle, videoConcept, videoLocationsFeatured, projectFootageInventory, whoAmI, styleGuideText, apiKey }) => {
        if (!apiKey) {
            throw new Error("Gemini API Key is not set. Please set it in the settings.");
        }

        const locationsDetail = videoLocationsFeatured.map(locName => {
            // Find the full location object from project.locations if available, to get place_id and importance
            const locationObject = projectFootageInventory && Object.keys(projectFootageInventory).find(placeId => {
                // This logic assumes locationName is unique enough to find the corresponding place_id in footageInventory
                // A more robust way would be to pass place_id in videoLocationsFeatured if possible.
                // For now, we'll try to find it by name from the general project locations if necessary.
                // However, footageInventory keys ARE place_ids, so we need to map location names back to place_ids.
                // For simplicity here, let's assume videoLocationsFeatured directly contains location names,
                // and we're looking up footage details by name (which is a bit of a workaround for the current data structure)
                // A better approach would be to pass the actual `location` objects from `project.locations` to this function.
                // Given the current structure, I'll rely on the name lookup or a simplified summary.

                // Refined approach: Directly map locName to its inventory status if it was correctly stored.
                // The `video.locations_featured` only contains names. `project.locations` has the full objects.
                // We need to look up the `footageInventory` by `place_id`.
                // For this prompt, let's just summarize what we *know* about the footage from `projectFootageInventory`.
                // A true fix might require refactoring how `video.locations_featured` is stored (e.g., store place_id too).

                // Let's assume projectFootageInventory is keyed by location.name for this prompt for simplicity,
                // or just describe the type of footage for the location by its name.
                const locInventory = Object.values(projectFootageInventory).find(inv => inv.name === locName) || {}; // Simplified
                const footageTypes = ['bRoll', 'onCamera', 'drone'].filter(type => locInventory[type]).map(type => {
                    if (type === 'bRoll') return 'B-Roll';
                    if (type === 'onCamera') return 'On-Camera';
                    if (type === 'drone') return 'Drone';
                    return ''; // Should not happen
                }).join(', ');
                const importance = locInventory.importance ? `(${locInventory.importance} feature)` : '';
                return ` - ${locName}${importance}: ${footageTypes ? footageTypes + ' available' : 'No specific footage type recorded'}.`;
            }
        ).join('\n');


        const prompt = `Act as a highly experienced YouTube video script planner. Your goal is to create a structured outline for a video, and then identify key moments or locations where the user's specific experience and available footage can be woven in.

Video Title: "${videoTitle}"
Video Concept/Summary: "${videoConcept}"

Creator Persona (Who Am I): "${whoAmI || 'A knowledgeable and engaging content creator.'}"
Creator Style Guide: "${styleGuideText || 'Clear, concise, and captivating.'}"

Featured Locations (and their available footage from project inventory):
${locationsDetail || 'No specific featured locations listed.'}

Your task:
1.  **Generate a Script Plan Outline:** Provide a high-level, chronological plan for the video script. Break it into main sections (e.g., Intro, Segment 1, Segment 2, Outro). For each segment, briefly describe its focus based on the video concept and featured locations.
2.  **Generate Specific User Questions:** For each *featured location* mentioned, or for overall key aspects of the video, formulate *one* direct, open-ended question to gather the user's unique experience or specific footage details. These questions should directly relate to the content of that segment or location.

Your response MUST be a valid JSON object with the following structure:
{
    "scriptPlan": "A clear, detailed text outline for the video script, structured with headings like 'Intro', 'Main Segment: [Location Name]', 'Conclusion', etc., suggesting the flow and content of each part.",
    "locationQuestions": [
        {"locationName": "Optional Location Name (if question is location-specific)", "question": "A question asking for specific details about the user's experience or available footage."}
        // ... more location questions
    ]
}

Example of locationQuestions:
[
    {"locationName": "Eiffel Tower", "question": "What unique angle or specific B-roll did you get of the Eiffel Tower, or a memorable story from your visit there?"},
    {"locationName": "Louvre Museum", "question": "Which specific artworks or exhibits stood out to you at the Louvre, and what was your personal take on them?"},
    {"locationName": "Overall Experience", "question": "Were there any unexpected moments or challenges during this trip that would be interesting to include?"}
]`;

        const parsedJson = await window.aiUtils.callGeminiAPI(prompt, apiKey);
        
        if (parsedJson && typeof parsedJson.scriptPlan === 'string' && Array.isArray(parsedJson.locationQuestions)) {
            return {
                scriptPlan: parsedJson.scriptPlan,
                locationQuestions: parsedJson.locationQuestions
            };
        } else {
            throw new Error("AI returned an invalid format for script plan.");
        }
    },

    /**
     * **NEW**: Generates the full video script based on a plan, general feedback, and specific location experiences.
     * @param {object} params - Parameters for full script generation.
     * @param {string} params.scriptPlan - The high-level script plan generated by the AI.
     * @param {string} params.generalFeedback - General user feedback on the plan.
     * @param {object} params.locationExperiences - Object mapping location names to user's detailed experiences.
     * @param {string} params.videoTitle - The title of the video.
     * @param {string} params.videoConcept - The high-level concept/summary of the video.
     * @param {string} params.whoAmI - User's persona.
     * @param {string} params.styleGuideText - User's style guide.
     * @param {string} params.apiKey - The Gemini API key.
     * @returns {Promise<string>} - A promise that resolves to the raw text of the full script.
     * @throws {Error} If the API call fails.
     */
    generateFullScriptAI: async ({ scriptPlan, generalFeedback, locationExperiences, videoTitle, videoConcept, whoAmI, styleGuideText, apiKey }) => {
        if (!apiKey) {
            throw new Error("Gemini API Key is not set. Please set it in the settings.");
        }

        const locationDetailsString = Object.entries(locationExperiences)
            .map(([locName, experience]) => `- ${locName}: "${experience}"`)
            .join('\n');

        const prompt = `You are a professional YouTube scriptwriter. Your task is to write a complete, engaging video script based on the provided plan, user feedback, and specific details about their experiences and available footage.

Video Title: "${videoTitle}"
Video Concept/Summary: "${videoConcept}"
Creator Persona (Who Am I): "${whoAmI || 'A knowledgeable and engaging content creator.'}"
Creator Style Guide: "${styleGuideText || 'Clear, concise, and captivating.'}"

Here is the high-level script plan:
---
${scriptPlan}
---

User's General Feedback on the plan:
---
${generalFeedback || 'None provided.'}
---

User's Specific Experiences/Footage Details for Locations:
---
${locationDetailsString || 'None provided.'}
---

IMPORTANT: Your response must be only the raw text of the full, spoken dialogue. Do not include any visual directions, camera cues, on-screen text callouts (like "[B-roll of cliffs]"), or any other text that is not meant to be spoken. Ensure the script flows naturally, incorporates all provided details, and adheres to the persona and style guide.`;

        // Using text/plain for the responseMimeType as we only expect a string back
        const payload = {
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { responseMenediaMimeType: "text/plain" }
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
        return result.candidates[0].content.parts[0].text;
    }
};
