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

        // Use gemini-2.0-flash by default for text generation unless specified otherwise
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
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
    
    generateBlogPostIdeasAI: async ({ destination, project, video, coreSeoEngine, ideaGenerationKb, monetizationGoals, apiKey }) => {
        if (!apiKey) {
            throw new Error("Gemini API Key is not set. Please set it in the settings.");
        }

        let context = '';
        if (destination) {
            context = `Your task is to generate a list of 10 diverse, high-potential blog post ideas for the destination: "${destination}".`;
        } else if (project && video) {
            context = `A user wants blog post ideas based on a specific video from their travels.
Project Title: "${project.playlistTitle}"
Video Title: "${video.title}"
Video Concept: "${video.concept}"
Video Locations: "${(video.locations_featured || []).join(', ')}"
Video Keywords: "${(video.targeted_keywords || []).join(', ')}"

Based on this specific video, generate 5-7 blog post ideas that expand on its themes, locations, or concepts.`;
        } else if (project) {
            context = `A user wants blog post ideas for an entire travel project.
Project Title: "${project.playlistTitle}"
Project Description: "${project.playlistDescription}"
Project Locations: "${(project.locations || []).map(l => l.name).join(', ')}"

Based on the overall project, generate 10 diverse blog post ideas.`;
        } else {
            throw new Error("No valid context provided for idea generation (topic, project, or video).");
        }

        const prompt = `You are an expert SEO and content strategist for a travel blog.
${context}

You MUST adhere to the following foundational knowledge bases for all generated content:
---
**Core SEO & Content Engine:**
${coreSeoEngine || "Focus on user intent and long-tail keywords."}
---
**Monetization & Content Goals:**
${monetizationGoals || "The goal is to generate affiliate revenue from links."}
---
**Blog Post Idea Generation Framework:**
${ideaGenerationKb || "Generate ideas for different content types like guides, listicles, and comparison posts."}
---

For each idea, provide the following in a valid JSON object:
- "title": (string) A catchy, SEO-friendly headline.
- "description": (string) A brief (1-2 sentence) summary of the post's content and target audience.
- "primaryKeyword": (string) The main search term this post should rank for.
- "postType": (string) The type of post, either "Destination Guide" or "Listicle Post".
- "monetizationOpportunities": (string) A brief (1-2 sentence) explanation of the specific monetization opportunities (e.g., affiliate links for hotels, tours, gear) and how it aligns with the user's content goals.

Your response must be a valid JSON object with a single key "ideas" which is an array of these objects.`;
        
        try {
            const parsedJson = await window.aiUtils.callGeminiAPI(prompt, apiKey);
            if (parsedJson && Array.isArray(parsedJson.ideas)) {
                return parsedJson.ideas;
            } else {
                throw new Error("AI returned an invalid format for blog post ideas.");
            }
        } catch (error) {
            console.error("Error generating blog post ideas:", error);
            throw new Error(`AI failed to generate ideas: ${error.message || error}`);
        }
    },

    findPointsOfInterestAI: async ({ mainLocationName, currentLocations, apiKey }) => {
        if (!apiKey) {
            throw new Error("Gemini API Key is not set. Please set it in the settings.");
        }

        const currentLocationsList = currentLocations.length > 0
            ? currentLocations.map(loc => `- ${loc.name}`).join('\n')
            : 'No specific locations added yet.';

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

    generateDraftOutlineAI: async ({ videoTitle, videoConcept, initialThoughts, apiKey }) => {
        // This function generates an initial draft outline based on user's raw thoughts.
        const prompt = `You are a scriptwriter tasked with creating an initial structure for a video.
Video Title: "${videoTitle}"
Video Concept: "${videoConcept}"

User's raw notes, experiences, and brain dump:
---
${initialThoughts}
---

Based *only* on the user's notes above, create a logical draft script outline.
This outline should have a clear Introduction, 2-4 Main Segments, and a Conclusion.
For each part, briefly describe the narrative focus. The goal is to turn their raw experiences into a coherent story flow.

Your response MUST be a valid JSON object with a single key "draftOutline", which is a string containing the formatted outline.
Example:
{
    "draftOutline": "Introduction:\\n- Start with the user's surprising moment to create a hook.\\n- Briefly introduce the main goal of the video.\\n\\nMain Segment 1: The Journey Begins\\n- Cover the initial part of the experience, focusing on the key footage mentioned.\\n\\nMain Segment 2: The Core Discovery\\n- Build up to the main message the user wants to convey.\\n\\nConclusion:\\n- Summarize the key takeaway and end with a powerful concluding thought."
}`;
        // Call Gemini API and return the parsed JSON.
        return await window.aiUtils.callGeminiAPI(prompt, apiKey);
    },

    generateScriptPlanAI: async ({ videoTitle, videoConcept, videoLocationsFeatured, projectFootageInventory, whoAmI, styleGuideText, apiKey }) => {
        // This function refines the draft outline and generates specific questions for the user.
        if (!apiKey) {
            throw new Error("Gemini API Key is not set. Please set it in the settings.");
        }

        const locationsDetail = (videoLocationsFeatured || []).map(locName => {
            const locInventory = Object.values(projectFootageInventory || {}).find(inv => inv.name === locName) || {};
            const footageTypes = ['bRoll', 'onCamera', 'drone'].filter(type => locInventory[type]).map(type => {
                if (type === 'bRoll') return 'B-Roll';
                if (type === 'onCamera') return 'On-Camera';
                if (type === 'drone') return 'Drone';
                return '';
            }).join(', ');
            const importance = locInventory.importance ? `(${locInventory.importance} feature)` : '';
            return ` - ${locName}${importance}: ${footageTypes ? footageTypes + ' available' : 'No specific footage type recorded'}.`;
        }).join('\n');

        const prompt = `You are a highly experienced YouTube video script planner. You have a draft outline, and your goal is now to refine it by asking for more specific details from the user in a down-to-earth, conversational, and relatable style. Avoid grandiose or overly formal language.

Video Title: "${videoTitle}"
Draft Outline / Concept:
---
${videoConcept}
---

Creator Persona (Who Am I): "${whoAmI || 'A knowledgeable and engaging content creator.'}"
Creator Style Guide: "${styleGuideText || 'Clear, concise, and captivating.'}"
Featured Locations & Available Footage:
${locationsDetail || 'No specific featured locations listed.'}

Your task is to:
1.  **Refine the Script Plan Outline:** Slightly improve upon the provided draft outline based on the locations and footage available. Make it a bit more detailed, keeping in mind a down-to-earth tone.
2.  **Generate Specific User Questions:** Based on your refined outline, formulate *one* direct, open-ended question for each major segment or featured location to gather the user's *unique experience, personal anecdotes, or specific footage details*. These questions should prompt the user about what they *did, saw, felt*, or *captured*. Ensure the questions are friendly and approachable, like you're chatting with a friend.

Your response MUST be a valid JSON object with the following structure:
{
    "scriptPlan": "A refined, more detailed text outline for the video script...",
    "locationQuestions": [
        {"locationName": "Optional Location Name (if question is location-specific)", "question": "A friendly, down-to-earth question asking for specific details about the user's experience or available footage."}
    ]
}`;

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
    
    generateFullScriptAI: async ({ scriptPlan, generalFeedback, locationExperiences, videoTitle, whoAmI, styleGuideText, apiKey }) => {
        // This function generates the full video script.
        const experienceDetails = Object.entries(locationExperiences).map(([key, value]) => `For ${key}, the user noted: "${value}"`).join('\n');
        
        const prompt = `You are a professional scriptwriter for YouTube. Your task is to write a complete, engaging video script.

Video Title: "${videoTitle}"
Creator Persona: "${whoAmI || 'A knowledgeable and engaging content creator.'}"
Style Guide: "${styleGuideText || 'Clear, concise, and captivating.'}"

Script Outline:
---
${scriptPlan}
---

User's Specific Experiences & Details:
---
${experienceDetails}
---

User's General Feedback on the Plan: "${generalFeedback || 'None provided.'}"

Based on all the above information, write the final, complete video script. The output should be **only the spoken dialogue**, ready for the creator to read. Do not include scene numbers, camera directions (e.g., "[B-ROLL]"), or any text that isn't part of the dialogue.
`;

        const payload = {
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "text/plain" }
        };
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
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

    refineScriptAI: async ({ currentScript, refinementInstructions, whoAmI, styleGuideText, apiKey }) => {
        // This new function refines an existing script based on user's natural language instructions.
        if (!apiKey) {
            throw new Error("Gemini API Key is not set. Please set it in the settings.");
        }

        const prompt = `You are a professional YouTube video script editor. Your task is to refine the provided video script based on the user's instructions.

Current Script:
---
${currentScript}
---

Creator Persona (Who Am I): "${whoAmI || 'A knowledgeable and engaging content creator.'}"
Creator Style Guide: "${styleGuideText || 'Clear, concise, and captivating.'}"

User's Refinement Instructions:
---
${refinementInstructions}
---

Please apply the user's instructions to the script. The output should be **only the revised spoken dialogue**, ready for the creator to read. Do not include scene numbers, camera directions, or any text that isn't part of the dialogue. If the instructions are unclear or unfeasible, make your best judgment to improve the script.
`;

        const payload = {
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "text/plain" }
        };
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
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

    generateKeywordsAI: async ({ title, concept, locationsFeatured, projectTitle, projectDescription, settings }) => {
        // This function generates keywords for YouTube videos.
        const apiKey = settings.geminiApiKey;
        const videoLocations = (locationsFeatured || []).join(', ');
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

    extractVideoMetadataAI: async ({ videoTitle, videoDescription, settings }) => {
        // This function extracts video metadata (locations, keywords) from title and description.
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
    
    parseVideoFromTextAI: async ({ textInput, projectLocation, settings }) => {
        // This function parses video information from raw text input.
        const apiKey = settings.geminiApiKey;
        if (!apiKey) {
            throw new Error("Gemini API Key is not set in settings.");
        }

        const prompt = `You are an expert video project manager. Analyze the following text provided by a user who is planning a new video. The video is part of a larger project about "${projectLocation}". The text may contain a mix of ideas, a full script, title suggestions, location notes, etc.

Your task is to meticulously extract and structure this information into a single, valid JSON object.

The user's text is:
---
${textInput}
---

Based on the text, identify and populate the following fields in the JSON object:
- "title": (string) The most likely and compelling title for the video. If multiple are suggested, choose the best one.
- "concept": (string) A concise but comprehensive summary or concept for the video. Synthesize this from all provided details.
- "script": (string) The full video script if it appears to be included. If a script is present, extract only the spoken words and dialogue, omitting scene numbers, camera directions, or speaker names unless they are part of the spoken content. If no script is provided, this field should be an empty string.
- "locations_featured": (array of strings) An array of ALL distinct geographical location names mentioned (cities, landmarks, parks, restaurants, villages, viewpoints, etc.). Be thorough. For example, if the text says "We went from Omodos to Laneia, stopping at the Kouris Dam", you must extract ["Omodos", "Laneia", "Kouris Dam"].
- "targeted_keywords": (array of strings) An array of 10-15 relevant SEO keywords or tags. Infer these from the main topics and locations.
- "estimatedLengthMinutes": (number) An estimated length in minutes if mentioned. If not mentioned, infer a reasonable length based on the script's word count (assume ~150 words per minute), or return null if no script is present.

Your response MUST be only the valid JSON object, with no other text or explanations before or after it.`;

        const parsedJson = await window.aiUtils.callGeminiAPI(prompt, apiKey);

        if (!parsedJson || typeof parsedJson.title === 'undefined' || typeof parsedJson.concept === 'undefined') {
            throw new Error("AI returned an invalid or incomplete data structure.");
        }

        return parsedJson;
    },

    refineVideoConceptBasedOnInventory: async ({ videoTitle, currentConcept, footageChangesSummary, settings }) => {
        // This function refines the video concept based on changes in footage inventory.
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

        const payload = {
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "text/plain" }
        };

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
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
        // This function generates YouTube Shorts ideas based on the main video and project context.
        if (!apiKey) {
            throw new Error("Gemini API Key is not set. Please set it in the settings.");
        }

        const featuredLocationsDetail = (videoLocationsFeatured || []).map(locName => {
                const locInventory = Object.values(projectFootageInventory || {}).find(inv => inv.name === locName) || {};
                const footageTypes = ['bRoll', 'onCamera', 'drone'].filter(type => locInventory[type]).map(type => {
                    if (type === 'bRoll') return 'B-Roll';
                    if (type === 'onCamera') return 'On-Camera';
                    if (type === 'drone') return 'Drone';
                    return '';
                }).join(', ');
                return ` - ${locName}: ${footageTypes ? footageTypes + ' footage available' : 'No specific footage recorded'}.`;
            }).join('\n');

        const previouslyCreatedShortsSummary = previouslyCreatedShorts.length > 0
            ? previouslyCreatedShorts.map(short => `- "${short.title}" (Status: ${short.status || 'unknown'})`).join('\n')
            : 'No shorts created from this video yet.';


        const prompt = `You are a YouTube Shorts content strategist. Your goal is to generate compelling, short-form video ideas for YouTube Shorts based on the provided long-form video and project context.

Current Long-Form Video:
- Title: "${videoTitle}"
- Concept/Summary: "${videoConcept}"
- Featured Locations with Footage Availability:
${featuredLocationsDetail || 'No specific locations featured in this video.'}

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

    generateShortsMetadataAI: async ({
        videoTitle,
        shortsIdea,
        whoAmI,
        styleGuideText,
        apiKey
    }) => {
        // This function generates metadata for YouTube Shorts.
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

