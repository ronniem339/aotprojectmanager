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
     * Finds points of interest using AI based on a main location and current locations.
     * @param {object} params - Parameters for finding points of interest.
     * @param {string} params.mainLocationName - The name of the main travel destination or project focus.
     * @param {Array<object>} params.currentLocations - An array of existing location objects in the project (each with a `name` property).
     * @param {string} params.apiKey - The Gemini API key.
     * @returns {Promise<Array<object>>} - A promise that resolves to an array of suggested location objects ({ name: string, description: string }).
     * @throws {Error} If the API call fails or returns an invalid format.
     */
    findPointsOfInterestAI: async ({ mainLocationName, currentLocations, apiKey }) => {
        if (!apiKey) {
            throw new Error("Gemini API Key is not set. Please set it in the settings.");
        }

        const currentLocationsList = currentLocations.length > 0
            ? currentLocations.map(loc => `- ${loc.name}`).join('\n')
            : 'No specific locations added yet.';

        // Updated prompt to request "up to 50" points of interest and emphasize providing as many as possible
        const prompt = `You are a creative travel planner and content idea generator. Your task is to suggest as many relevant *new and distinct* points of interest as possible, up to 50, for a video project focusing on "${mainLocationName}".

Consider the following existing locations already planned for the project:
${currentLocationsList}

For each suggestion, provide:
-   A concise name for the location.
-   A brief, engaging description (1-2 sentences) explaining why it's a good filming location or a key point of interest for content.

Your response MUST be a valid JSON object with a single key "suggestedLocations" which is an array of objects. Each object in the array must have "name" (string) and "description" (string) properties.

Example JSON response:
{
    "suggestedLocations": [
        {"name": "Local Street Art Scene", "description": "Vibrant murals and graffiti offer unique visual backdrops for dynamic B-roll and on-camera commentary."},
        {"name": "Hidden Waterfall Hike", "description": "A picturesque natural escape, perfect for drone shots and showcasing the region's untouched beauty."},
        {"name": "Artisanal Cheese Shop", "description": "Highlight local culinary delights and traditional craftsmanship with engaging close-ups and interviews."}
    ]
}`;

        try {
            const parsedJson = await window.aiUtils.callGeminiAPI(prompt, apiKey);
            if (parsedJson && Array.isArray(parsedJson.suggestedLocations)) {
                return parsedJson.suggestedLocations;
            } else {
                throw new Error("AI returned an invalid format for suggested locations.");
            }
        } catch (error) {
            console.error("Error finding points of interest:", error);
            throw new Error(`AI failed to find locations: ${error.message || error}`);
        }
    },

    /**
     * Generates a high-level script plan for a video, including specific questions for user input.
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
    },

    /**
     * Refines a video concept/plan based on updated footage inventory.
     * This function will be used by ManageFootageModal.
     *
     * @param {object} params - Parameters for concept refinement.
     * @param {string} params.videoTitle - The title of the video.
     * @param {string} params.currentConcept - The current high-level concept/plan for the video.
     * @param {string} params.footageChangesSummary - A summary of how footage inventory for featured locations has changed.
     * @param {object} params.settings - User settings containing API key.
     * @returns {Promise<string>} - A promise that resolves to the revised concept string.
     * @throws {Error} If the API call fails.
     */
    refineVideoConceptBasedOnInventory: async ({ videoTitle, currentConcept, footageChangesSummary, settings }) => {
        const apiKey = settings.geminiApiKey;

        if (!apiKey) {
            throw new Error("Gemini API Key is not set. Cannot refine video concept.");
        }

        const prompt = `You are a YouTube video concept reviser. A user has changed their footage inventory for locations featured in a video.
Please review the original video concept and the changes to the footage inventory, then provide a revised, brief outline or high-level plan for the video's content. Focus on key segments and main takeaways, NOT a full script.

Original Video Title: "${videoTitle}"
Original Video Concept/Plan: "${currentConcept}"

Changes in footage inventory for featured locations:
${footageChangesSummary}

Based on these changes, how should the video concept be updated? Provide only the revised concept string.`;

        // Using text/plain for the responseMimeType as we only expect a string back
        const payload = {
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "text/plain" }
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
