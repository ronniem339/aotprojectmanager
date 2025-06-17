// js/utils/aiUtils.js

/**
 * Calls the Gemini API with a given prompt and optional generation configuration.
 *
 * @param {string} prompt - The text prompt for the API.
 * @param {object} settings - The application's settings object.
 * @param {object} [generationConfig={}] - Optional generation configuration for the API.
 * @param {boolean} [isComplex=false] - Flag to indicate if the task is complex and should use the Pro model if enabled.
 * @returns {Promise<object>} - A promise that resolves to the parsed JSON response from the API.
 * @throws {Error} If the API key is not set or if the API response is not OK.
 */
window.aiUtils = {
    callGeminiAPI: async (prompt, settings, generationConfig = {}, isComplex = false) => {
        const apiKey = settings.geminiApiKey;
        if (!apiKey) {
            throw new Error("Gemini API Key is not set. Please set it in the settings.");
        }

        // Determine which model to use
        const usePro = isComplex && settings.useProModelForComplexTasks;
        const modelName = usePro 
            ? (settings.proModelName || 'gemini-1.5-pro-latest') 
            : (settings.flashModelName || 'gemini-1.5-flash-latest');
        
        const payload = {
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
                ...generationConfig
            }
        };

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err?.error?.message || `API Error (${response.status})`);
        }
        
        const result = await response.json();
        
        if (!result.candidates || !result.candidates[0].content || !result.candidates[0].content.parts) {
            console.error("Unexpected AI response structure:", result);
            throw new Error("AI returned an unexpected or empty response.");
        }

        try {
            return JSON.parse(result.candidates[0].content.parts[0].text);
        } catch (e) {
            console.error("Failed to parse AI response as JSON:", result.candidates[0].content.parts[0].text, e);
            throw new Error("AI response was not valid JSON.");
        }
    },
    
    // MODIFIED: Added 'settings' to params and 'isComplex: true' to the call
    generateBlogPostIdeasAI: async ({ destination, project, video, coreSeoEngine, ideaGenerationKb, monetizationGoals, settings }) => {
        const apiKey = settings.geminiApiKey;
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
            // MODIFIED: Pass settings and isComplex flag
            const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings, {}, true);
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

    // MODIFIED: Added 'settings' to params
    findPointsOfInterestAI: async ({ mainLocationName, currentLocations, settings }) => {
        const apiKey = settings.geminiApiKey;
        const currentLocationsList = currentLocations.length > 0
            ? currentLocations.map(loc => `- ${loc.name}`).join('\n')
            : 'No specific locations added yet.';

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
        {"name": "Hidden Waterfall Hike", "description": "A picturesque natural escape, perfect for drone shots and showcasing the region's untouched beauty."}
    ]
}`;

        try {
            // MODIFIED: Pass settings. isComplex defaults to false.
            const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings);
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

    // MODIFIED: Added 'settings' to params and 'isComplex: true' to the call
    generateDraftOutlineAI: async ({ videoTitle, videoConcept, initialThoughts, settings }) => {
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

Your response MUST be a valid JSON object with a single key "draftOutline", which is a string containing the formatted outline.`;
        // MODIFIED: Pass settings and isComplex flag
        return await window.aiUtils.callGeminiAPI(prompt, settings, {}, true);
    },

    // MODIFIED: Added 'settings' to params and 'isComplex: true' to the call
    generateScriptPlanAI: async ({ videoTitle, videoConcept, videoLocationsFeatured, projectFootageInventory, whoAmI, styleGuideText, settings }) => {
        const apiKey = settings.geminiApiKey;
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

        const prompt = `You are a highly experienced YouTube video script planner. You have a draft outline, and your goal is now to refine it by asking for more specific details.

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
1.  **Refine the Script Plan Outline:** Slightly improve upon the provided draft outline based on the locations and footage available. Make it a bit more detailed.
2.  **Generate Specific User Questions:** Based on your refined outline, formulate *one* direct, open-ended question for each major segment or featured location to gather the user's *unique experience, personal anecdotes, or specific footage details*. These questions should prompt the user about what they *did, saw, felt*, or *captured*.

Your response MUST be a valid JSON object with the following structure:
{
    "scriptPlan": "A refined, more detailed text outline for the video script...",
    "locationQuestions": [
        {"locationName": "Optional Location Name (if question is location-specific)", "question": "A question asking for specific details about the user's experience or available footage."}
    ]
}`;

        // MODIFIED: Pass settings and isComplex flag
        const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings, {}, true);
        
        if (parsedJson && typeof parsedJson.scriptPlan === 'string' && Array.isArray(parsedJson.locationQuestions)) {
            return {
                scriptPlan: parsedJson.scriptPlan,
                locationQuestions: parsedJson.locationQuestions
            };
        } else {
            throw new Error("AI returned an invalid format for script plan.");
        }
    },
    
    // This is a long-form generation task, a prime candidate for the Pro model.
    generateFullScriptAI: async ({ scriptPlan, generalFeedback, locationExperiences, videoTitle, whoAmI, styleGuideText, settings }) => {
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
        // Determine which model to use
        const usePro = settings.useProModelForComplexTasks;
        const modelName = usePro 
            ? (settings.proModelName || 'gemini-1.5-pro-latest') 
            : (settings.flashModelName || 'gemini-1.5-flash-latest');
        
        const payload = {
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "text/plain" }
        };
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${settings.geminiApiKey}`;
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

    // MODIFIED: Added settings to params
    generateKeywordsAI: async ({ title, concept, locationsFeatured, projectTitle, projectDescription, settings }) => {
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

        // MODIFIED: Pass settings
        const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings);
        
        if (parsedJson && Array.isArray(parsedJson.keywords)) {
            return parsedJson.keywords;
        } else {
            throw new Error("AI returned an invalid keyword format.");
        }
    },

    // MODIFIED: Added settings to params
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
        
        // MODIFIED: Pass settings
        const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings);

        if (parsedJson && Array.isArray(parsedJson.locations_featured) && Array.isArray(parsedJson.targeted_keywords)) {
            return {
                locations_featured: parsedJson.locations_featured,
                targeted_keywords: parsedJson.targeted_keywords
            };
        } else {
            throw new Error("AI returned an invalid format for video metadata extraction.");
        }
    },
    
    // MODIFIED: Added 'settings' to params and 'isComplex: true' to the call
    parseVideoFromTextAI: async ({ textInput, projectLocation, settings }) => {
        const apiKey = settings.geminiApiKey;
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
        
        // MODIFIED: Pass settings and isComplex flag
        const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings, {}, true);

        if (!parsedJson || typeof parsedJson.title === 'undefined' || typeof parsedJson.concept === 'undefined') {
            throw new Error("AI returned an invalid or incomplete data structure.");
        }

        return parsedJson;
    },

    // MODIFIED: Added settings to params. This is a text-generation task, so it uses the text/plain method.
    refineVideoConceptBasedOnInventory: async ({ videoTitle, currentConcept, footageChangesSummary, settings }) => {
        const apiKey = settings.geminiApiKey;
        const usePro = settings.useProModelForComplexTasks;
        const modelName = usePro ? (settings.proModelName || 'gemini-1.5-pro-latest') : (settings.flashModelName || 'gemini-1.5-flash-latest');

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

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
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
    
    // MODIFIED: Added settings to params
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
        previouslyCreatedShorts = [],
        settings // Added settings
    }) => {
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

Your response MUST be a valid JSON object with a single key "shortsIdeas" which is an array of objects. Each object in the array must have "title" (string), "description" (string), and "footageToUse" (string) properties.`;

        try {
            // MODIFIED: Pass settings
            const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings);
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

    // MODIFIED: Added settings to params
    generateShortsMetadataAI: async ({
        videoTitle,
        shortsIdea,
        whoAmI,
        styleGuideText,
        apiKey,
        settings // Added settings
    }) => {
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
            // MODIFIED: Pass settings
            const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings);
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
