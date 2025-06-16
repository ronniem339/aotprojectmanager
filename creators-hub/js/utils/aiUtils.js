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

Your response MUST be a valid JSON object with a single key "suggestedLocations" which is an array of objects. Each object in the array must have "name" (string), "description" (string) and "place_id" (string - a unique identifier if possible, otherwise use the name) properties. If you use Google Places, use their place_id.

Example JSON response:
{
    "suggestedLocations": [
        {"name": "Local Street Art Scene", "description": "Vibrant murals and graffiti offer unique visual backdrops for dynamic B-roll and on-camera commentary.", "place_id": "ChIJT2_nCg_Yl_R_M2..."},
        {"name": "Hidden Waterfall Hike", "description": "A picturesque natural escape, perfect for drone shots and showcasing the region's untouched beauty.", "place_id": "ChIJT2_nCg_Yl_R_M2..."},
        {"name": "Artisanal Cheese Shop", "description": "Highlight local culinary delights and traditional craftsmanship with engaging close-ups and interviews.", "place_id": "ChIJT2_nCg_Yl_R_M2..."}
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
1.  **Generate a Script Plan Outline:** Provide a high-level, chronological outline for the video script. Break it into main sections (e.g., "Introduction", "Main Segment: [Location Name]", "Conclusion"). For each segment, briefly describe its focus based on the video concept and featured locations. Focus on *what will be covered*, NOT a full script with dialogue or detailed scene descriptions.
2.  **Generate Specific User Questions:** For each *featured location* mentioned, or for overall key aspects of the video, formulate *one* direct, open-ended question to gather the user's *unique experience, personal anecdotes, or specific footage details*. These questions should prompt the user about what they *did, saw, felt*, or *captured*, rather than asking for more details on the AI's suggested script elements.

Your response MUST be a valid JSON object with the following structure:
{
    "scriptPlan": "A clear, detailed text outline for the video script, structured with headings like 'Introduction', 'Main Segment: [Location Name]', 'Conclusion', etc., suggesting the flow and content of each part. Example: 'Introduction: Hook, introduce topic. Main Segment: Explore XYZ, highlight key features. Conclusion: Summary, call to action.'",
    "locationQuestions": [
        {"locationName": "Optional Location Name (if question is location-specific)", "question": "A question asking for specific details about the user's experience or available footage."}
        // ... more location questions
    ]
}

Example of locationQuestions:
[
    {"locationName": "Eiffel Tower", "question": "What was your most memorable moment or unexpected view from the Eiffel Tower, and do you have any unique footage of it?"},
    {"locationName": "Louvre Museum", "question": "Which specific artworks or exhibits did you find most captivating at the Louvre, and what personal insights or challenges did you experience while filming there?"},
    {"locationName": "Overall Experience", "question": "Beyond the specific locations, were there any surprising interactions, logistical challenges, or spontaneous discoveries during your trip that would add a personal touch to the video?"}
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
    },

    /**
     * Generates YouTube Shorts ideas based on video and project context.
     *
     * @param {object} params - Parameters for shorts idea generation.
     * @param {string} params.videoTitle - The title of the current video.
     * @param {string} params.videoConcept - The concept/description of the current video.
     * @param {Array<string>} params.videoLocationsFeatured - Array of location names featured in this video.
     * @param {object} params.projectFootageInventory - The full footage inventory for the project.
     * @param {string} params.projectTitle - The overall project/playlist title.
     * @param {string} params.shortsIdeaGenerationKb - User's knowledge base for Shorts ideas.
     * @param {string} params.whoAmI - User's persona.
     * @param {string} params.styleGuideText - User's style guide.
     * @param {string} params.apiKey - The Gemini API key.
     * @param {Array<object>} [params.previouslyCreatedShorts=[]] - Array of previously created shorts data for this video.
     * @returns {Promise<Array<object>>} - A promise that resolves to an array of suggested shorts ideas (objects with title, description, and footageToUse).
     * @throws {Error} If the API call fails or returns an invalid format.
     */
    generateShortsIdeasAI: async ({
        videoTitle,
        videoConcept,
        videoLocationsFeatured,
        projectFootageInventory,
        projectTitle,
        shortsIdeaGenerationKb,
        whoAmI,
        styleGuideText,
        apiKey,
        previouslyCreatedShorts = []
    }) => {
        if (!apiKey) {
            throw new Error("Gemini API Key is not set. Please set it in the settings.");
        }

        const featuredLocationsDetail = videoLocationsFeatured.length > 0
            ? videoLocationsFeatured.map(locName => {
                const locInventory = Object.values(projectFootageInventory).find(inv => inv.name === locName) || {};
                const footageTypes = ['bRoll', 'onCamera', 'drone'].filter(type => locInventory[type]).map(type => {
                    if (type === 'bRoll') return 'B-Roll';
                    if (type === 'onCamera') return 'On-Camera';
                    if (type === 'drone') return 'Drone';
                    return '';
                }).join(', ');
                return ` - ${locName}: ${footageTypes ? footageTypes + ' footage available' : 'No specific footage recorded'}.`;
            }).join('\n')
            : 'No specific locations featured in this video.';

        const previouslyCreatedShortsSummary = previouslyCreatedShorts.length > 0
            ? previouslyCreatedShorts.map(short => `- "${short.title}" (Status: ${short.status || 'unknown'})`).join('\n')
            : 'No shorts created from this video yet.';


        const prompt = `You are a YouTube Shorts content strategist. Your goal is to generate compelling, short-form video ideas for YouTube Shorts based on the provided long-form video and project context.

Current Long-Form Video:
- Title: "${videoTitle}"
- Concept/Summary: "${videoConcept}"
- Featured Locations with Footage Availability:
${featuredLocationsDetail}

Overall Project Context:
- Project/Series Title: "${projectTitle}"

Creator Persona (Who Am I): "${whoAmI || 'A knowledgeable and engaging content creator.'}"
Creator Style Guide: "${styleGuideText || 'Clear, concise, and captivating.'}"
YouTube Shorts Ideas Knowledge Base: "${shortsIdeaGenerationKb || 'Focus on quick hooks, trending sounds, and challenges. Keep it concise.'}"

Previously created shorts from this video (consider these to avoid overlap or suggest variations):
${previouslyCreatedShortsSummary}

Generate 3-5 distinct YouTube Shorts ideas. For each idea, provide:
-   A concise, catchy title for the Short.
-   A brief description (1-2 sentences) explaining the concept and why it's suitable for Shorts.
-   A suggestion for specific footage to use, leveraging the available footage and featured locations (e.g., "Drone shots of [Location X] combined with B-roll of [activity]").

Your response MUST be a valid JSON object with a single key "shortsIdeas" which is an array of objects. Each object in the array must have "title" (string), "description" (string), and "footageToUse" (string) properties.

Example JSON response:
{
    "shortsIdeas": [
        {"title": "Epic Drone Shots of [Location]", "description": "Quick montage of the most breathtaking drone footage, set to trending audio, showcasing the beauty of the location.", "footageToUse": "Drone shots of the cliffside, wide B-roll of the beach, time-lapse of sunset."},
        {"title": "Hidden Gem Foodie Spot in [City]", "description": "Fast-paced reveal of a unique local eatery featured in the long-form, highlighting a signature dish and quirky atmosphere.", "footageToUse": "On-camera close-ups of food preparation, B-roll of the restaurant interior, quick cuts of taste tests."},
        {"title": "Reacting to [Specific Moment/Challenge]", "description": "Short clip of me reacting to a funny or unexpected moment from the long-form video, with text overlays and trending sound.", "footageToUse": "On-camera reaction footage, relevant B-roll of the challenging activity, fast-paced cuts to emphasize humor."}
    ]
}`;

        try {
            const parsedJson = await window.aiUtils.callGeminiAPI(prompt, apiKey);
            if (parsedJson && Array.isArray(parsedJson.shortsIdeas)) {
                return parsedJson.shortsIdeas;
            } else {
                throw new Error("AI returned an invalid format for shorts ideas.");
            }
        } catch (error) {
            console.error("Error generating shorts ideas:", error);
            throw new Error(`AI failed to generate shorts ideas: ${error.message || error}`);
        }
    },

    /**
     * Generates YouTube Shorts metadata (on-screen text, caption, description, tags) for an accepted idea.
     *
     * @param {object} params - Parameters for metadata generation.
     * @param {string} params.videoTitle - The title of the long-form video.
     * @param {object} params.shortsIdea - The accepted shorts idea object ({ title, description, footageToUse }).
     * @param {string} params.whoAmI - User's persona.
     * @param {string} params.styleGuideText - User's style guide.
     * @param {string} params.apiKey - The Gemini API key.
     * @returns {Promise<object>} - A promise that resolves to an object with generated metadata.
     * @throws {Error} If the API call fails or returns an invalid format.
     */
    generateShortsMetadataAI: async ({
        videoTitle,
        shortsIdea,
        whoAmI,
        styleGuideText,
        apiKey
    }) => {
        if (!apiKey) {
            throw new Error("Gemini API Key is not set. Please set it in the settings.");
        }

        const prompt = `You are a YouTube Shorts expert. Based on the long-form video context and a specific Shorts idea, generate optimized metadata for YouTube Studio.

Long-Form Video Title: "${videoTitle}"

Shorts Idea:
- Title: "${shortsIdea.title}"
- Concept: "${shortsIdea.description}"
- Footage Suggestion: "${shortsIdea.footageToUse}"

Creator Persona (Who Am I): "${whoAmI || 'A knowledgeable and engaging content creator.'}"
Creator Style Guide: "${styleGuideText || 'Clear, concise, and captivating.'}"

Your task is to generate:
1.  **On-Screen Text:** 1-3 short, punchy phrases suitable for on-screen overlays (e.g., for key moments, hooks, or calls to action).
2.  **Short Caption:** A concise (under 100 characters), engaging caption including 2-3 relevant hashtags.
3.  **Short Description:** A more detailed (100-200 words) description for YouTube Studio, expanding on the Shorts concept and encouraging engagement. Include relevant keywords naturally.
4.  **Tags:** 5-10 relevant, comma-separated tags for SEO.

Your response MUST be a valid JSON object with the following structure:
{
    "onScreenText": ["Phrase 1", "Phrase 2"],
    "caption": "Your concise caption #hashtag1 #hashtag2",
    "description": "Your detailed short description here...",
    "tags": "tag1, tag2, tag3"
}`;

        try {
            const parsedJson = await window.aiUtils.callGeminiAPI(prompt, apiKey);
            if (parsedJson && Array.isArray(parsedJson.onScreenText) && typeof parsedJson.caption === 'string' && typeof parsedJson.description === 'string' && typeof parsedJson.tags === 'string') {
                return parsedJson;
            } else {
                throw new Error("AI returned an invalid format for shorts metadata.");
            }
        } catch (error) {
            console.error("Error generating shorts metadata:", error);
            throw new Error(`AI failed to generate shorts metadata: ${error.message || error}`);
        }
    }
};
