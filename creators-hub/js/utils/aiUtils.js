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
    
    generateBlogPostIdeasAI: async ({ destination, project, video, coreSeoEngine, ideaGenerationKb, monetizationGoals, settings }) => {
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
            const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings, {}, true); // isComplex = true
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

    findPointsOfInterestAI: async ({ mainLocationName, currentLocations, settings }) => {
        const currentLocationsList = currentLocations.length > 0
            ? currentLocations.map(loc => `- ${loc.name}`).join('\n')
            : 'No specific locations added yet.';

        const prompt = `You are a creative travel planner. Suggest relevant points of interest for a video project on "${mainLocationName}". Existing locations are:\n${currentLocationsList}\nReturn a JSON object with a single key "suggestedLocations" which is an array of objects, each with "name" and "description".`;

        try {
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

    generateDraftOutlineAI: async ({ videoTitle, videoConcept, initialThoughts, settings }) => {
        const prompt = `You are a scriptwriter. Create a logical draft script outline for a video titled "${videoTitle}" with concept "${videoConcept}" based on the user's raw notes:
---
${initialThoughts}
---
The outline should have an Intro, 2-4 Main Segments, and a Conclusion. For each part, briefly describe the narrative focus. Return a valid JSON object with a single key "draftOutline", which is a string.`;
        return await window.aiUtils.callGeminiAPI(prompt, settings, {}, true); // isComplex = true
    },

    generateScriptPlanAI: async ({ videoTitle, videoConcept, videoLocationsFeatured, projectFootageInventory, whoAmI, styleGuideText, settings }) => {
        const locationsDetail = (videoLocationsFeatured || []).map(locName => {
            const locInventory = Object.values(projectFootageInventory || {}).find(inv => inv.name === locName) || {};
            const footageTypes = ['bRoll', 'onCamera', 'drone'].filter(type => locInventory[type]).join(', ');
            return ` - ${locName}: ${footageTypes ? footageTypes + ' available' : 'No specific footage type recorded'}.`;
        }).join('\n');

        const prompt = `You are a YouTube script planner. Refine the script plan and generate specific user questions based on the following:
Video Title: "${videoTitle}"
Draft Outline / Concept: "${videoConcept}"
Creator Persona: "${whoAmI || 'N/A'}"
Creator Style Guide: "${styleGuideText || 'N/A'}"
Featured Locations & Footage:
${locationsDetail || 'No specific locations listed.'}

Your task is to:
1.  **Refine the Script Plan Outline:** Improve the provided draft outline based on available locations and footage.
2.  **Generate Specific User Questions:** Formulate one open-ended question for each major segment/location to gather user's unique experiences.
Return a valid JSON object: {"scriptPlan": "...", "locationQuestions": [{"locationName": "...", "question": "..."}]}`;

        const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings, {}, true); // isComplex = true
        
        if (parsedJson && typeof parsedJson.scriptPlan === 'string' && Array.isArray(parsedJson.locationQuestions)) {
            return parsedJson;
        } else {
            throw new Error("AI returned an invalid format for script plan.");
        }
    },
    
    generateFullScriptAI: async ({ scriptPlan, generalFeedback, locationExperiences, videoTitle, whoAmI, styleGuideText, settings }) => {
        const experienceDetails = Object.entries(locationExperiences).map(([key, value]) => `For ${key}, the user noted: "${value}"`).join('\n');
        
        const prompt = `You are a professional YouTube scriptwriter. Write a complete, engaging video script based on the following:
Video Title: "${videoTitle}"
Creator Persona: "${whoAmI || 'N/A'}"
Style Guide: "${styleGuideText || 'N/A'}"
Script Outline:
---
${scriptPlan}
---
User's Experiences:
---
${experienceDetails}
---
User's Feedback: "${generalFeedback || 'None'}"

Provide ONLY the spoken dialogue, ready for the creator to read. No scene numbers or camera directions.`;

        const usePro = settings.useProModelForComplexTasks;
        const modelName = usePro ? settings.proModelName : settings.flashModelName;
        
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

    generateKeywordsAI: async ({ title, concept, locationsFeatured, projectTitle, projectDescription, settings }) => {
        const prompt = `Act as a YouTube SEO expert. Generate a list of 25-30 potential search terms for a video.
- Title: "${title}"
- Concept: "${concept}"
- Locations: ${(locationsFeatured || []).join(', ')}
- Project: "${projectTitle}"
- Project Description: "${projectDescription}"
Return a JSON object: {"keywords": ["keyword one", ...]}.`;

        const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings);
        
        if (parsedJson && Array.isArray(parsedJson.keywords)) {
            return parsedJson.keywords;
        } else {
            throw new Error("AI returned an invalid keyword format.");
        }
    },

    extractVideoMetadataAI: async ({ videoTitle, videoDescription, settings }) => {
        const prompt = `Analyze the YouTube video title and description. Infer geographical locations and SEO keywords.
- Title: "${videoTitle}"
- Description: "${videoDescription}"
Provide output as JSON: {"locations_featured": [...], "targeted_keywords": [...]}.`;

        const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings);

        if (parsedJson && Array.isArray(parsedJson.locations_featured) && Array.isArray(parsedJson.targeted_keywords)) {
            return parsedJson;
        } else {
            throw new Error("AI returned an invalid format for video metadata extraction.");
        }
    },
    
    parseVideoFromTextAI: async ({ textInput, projectLocation, settings }) => {
        const prompt = `You are an expert video project manager. Analyze the following text and structure it into a single, valid JSON object with fields: "title", "concept", "script", "locations_featured", "targeted_keywords", "estimatedLengthMinutes".
Project is about: "${projectLocation}"
User's text:
---
${textInput}
---
Your response MUST be only the valid JSON object.`;

        const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings, {}, true); // isComplex = true

        if (!parsedJson || typeof parsedJson.title === 'undefined' || typeof parsedJson.concept === 'undefined') {
            throw new Error("AI returned an invalid or incomplete data structure.");
        }

        return parsedJson;
    },

    refineVideoConceptBasedOnInventory: async ({ videoTitle, currentConcept, footageChangesSummary, settings }) => {
        const usePro = settings.useProModelForComplexTasks;
        const modelName = usePro ? settings.proModelName : settings.flashModelName;

        const prompt = `You are a YouTube video concept reviser. Update the video concept based on changes to footage inventory.
Original Title: "${videoTitle}"
Original Concept: "${currentConcept}"
Footage Changes:
${footageChangesSummary}
Provide only the revised concept string.`;

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

    generateShortsIdeasAI: async ({ videoTitle, videoConcept, ...rest, settings }) => {
        const prompt = `You are a YouTube Shorts content strategist. Generate 3-5 distinct YouTube Shorts ideas based on the provided long-form video context.
Long-Form Video Title: "${videoTitle}"
Concept/Summary: "${videoConcept}"
Return a valid JSON object with a single key "shortsIdeas" which is an array of objects.`;

        try {
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

    generateShortsMetadataAI: async ({ videoTitle, shortsIdea, ...rest, settings }) => {
        const prompt = `You are a YouTube Shorts expert. Based on the long-form video context and a specific Shorts idea, generate optimized metadata for YouTube Studio.
Long-Form Video Title: "${videoTitle}"
Shorts Idea: ${JSON.stringify(shortsIdea)}
Return a valid JSON object with keys: "onScreenText", "caption", "description", "tags".`;

        try {
            const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings);
            if (parsedJson && Array.isArray(parsedJson.onScreenText) && typeof parsedJson.caption === 'string') {
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
