// js/utils/aiUtils.js

/**
 * This is the central AI utility object for the Creator's Hub application.
 * It handles all interactions with the Google Gemini API.
 */
window.aiUtils = {
    /**
     * Helper function to gather and format the creator's style guide information.
     * @param {object} settings - The application's complete settings object.
     * @param {string} [videoTone] - The specific tone of the current video, if available.
     * @returns {string} - A formatted string containing the style guide prompt.
     */
    getStyleGuidePrompt: (settings, videoTone) => {
        const whoAmI = settings.knowledgeBases?.creator?.whoAmI || 'A knowledgeable and engaging content creator.';
        const styleGuideText = settings.knowledgeBases?.creator?.styleGuideText || 'Clear, concise, and captivating.';
        const toneText = videoTone ? `\nVideo Tone: "${videoTone}"` : '';

        return `**Creator Style Guide & Context:**
Creator Persona (Who AmI): "${whoAmI}"
Creator Style Guide: "${styleGuideText}"${toneText}`;
    },

    /**
     * The core, centralized function to call the Gemini API.
     * It now dynamically selects the model (Flash or Pro) based on the user's settings and the complexity of the task.
     * All other helper functions in this file will call this central function.
     *
     * @param {string} prompt - The text prompt for the API.
     * @param {object} settings - The application's complete settings object, containing API keys and model preferences.
     * @param {object} [generationConfig={}] - Optional generation configuration for the API.
     * @param {boolean} [isComplex=false] - A flag to determine if the Pro model should be used for this specific task.
     * @returns {Promise<object|string>} - A promise that resolves to the parsed JSON response or plain text from the API.
     * @throws {Error} If the API key is not set or if the API response is not OK.
     */
    callGeminiAPI: async (prompt, settings, generationConfig = {}, isComplex = false) => {
        if (!settings || !settings.geminiApiKey) {
            throw new Error("Gemini API Key is not set. Please set it in the settings.");
        }
        const apiKey = settings.geminiApiKey;

        const usePro = isComplex && settings.useProModelForComplexTasks;
        const modelName = usePro
            ? (settings.proModelName || 'gemini-1.5-pro-latest')
            : (settings.flashModelName || 'gemini-1.5-flash-latest');

        console.log(`%c[AI Call] Using model: ${modelName} (Complex Task: ${isComplex})`, 'color: #2563eb; font-weight: bold;');

        // --- START OF NEW CODE ---
        // This rule will now be added to every prompt sent to the AI.
        const diacriticsRule = `CRITICAL RULE: For all text you generate (titles, keywords, descriptions, names, script content, etc.), you MUST NOT use diacritics (e.g., use 'cafe' instead of 'café', 'Cordoba' instead of 'Córdoba'). This is for SEO and searchability for an English-speaking audience.`;

        const finalPrompt = `${diacriticsRule}\n\n--- ORIGINAL PROMPT BEGINS ---\n${prompt}`;
        // --- END OF NEW CODE ---

        const finalGenerationConfig = {
            responseMimeType: "application/json",
            ...generationConfig
        };

        const payload = {
            // Use the modified prompt with the added rule
            contents: [{ role: "user", parts: [{ text: finalPrompt }] }],
            generationConfig: finalGenerationConfig
        };

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

        // Added a 30-second timeout for the fetch request.
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal // Link the abort controller to the fetch request
            });

            clearTimeout(timeoutId); // Clear the timeout if the request succeeds

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err?.error?.message || `API Error (${response.status})`);
            }

            const result = await response.json();

            if (!result.candidates || !result.candidates[0].content || !result.candidates[0].content.parts) {
                console.error("Unexpected AI response structure:", result);
                throw new Error("AI returned an unexpected or empty response.");
            }

            const responseText = result.candidates[0].content.parts[0].text;
            
            if (finalGenerationConfig.responseMimeType === "application/json") {
                try {
                    return JSON.parse(responseText);
                } catch (e) {
                    console.error("Failed to parse AI response as JSON:", responseText, e);
                    throw new Error("AI response was expected to be valid JSON but wasn't.");
                }
            } else {
                return responseText;
            }
        } catch (error) {
            clearTimeout(timeoutId); // Also clear timeout on error
            if (error.name === 'AbortError') {
                throw new Error('API call timed out after 30 seconds.');
            }
            // Re-throw other network or parsing errors
            throw error;
        }
    },

    /**
     * Generates blog post ideas. This is considered a complex task.
     */
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
/**
     * NEW: Generates a full blog post based on an approved idea. This is considered a complex task.
     */

    generateBlogPostContentAI: async ({ idea, coreSeoEngine, monetizationGoals, settings }) => {
        const styleGuidePrompt = window.aiUtils.getStyleGuidePrompt(settings);

        let postTypeSpecificKb = '';
        if (idea.postType === 'Listicle Post' && settings.knowledgeBases.blog.listicleContent) {
            postTypeSpecificKb = `**Listicle Post Knowledge Base:**\n${settings.knowledgeBases.blog.listicleContent}\n---`;
        } else if (idea.postType === 'Destination Guide' && settings.knowledgeBases.blog.destinationGuideContent) {
            postTypeSpecificKb = `**Destination Guide Knowledge Base:**\n${settings.knowledgeBases.blog.destinationGuideContent}\n---`;
        }

        const prompt = `You are an expert blog post writer for a travel blog.
Your task is to write a complete, detailed, and engaging blog post based on the following approved idea.

Blog Post Idea Details:
- Title: "${idea.title}"
- Description: "${idea.description}"
- Primary Keyword: "${idea.primaryKeyword}"
- Post Type: "${idea.postType}"
- Monetization Opportunities: "${idea.monetizationOpportunities}"

${styleGuidePrompt}

You MUST adhere to the following foundational knowledge bases for all generated content:
---
**Core SEO & Content Engine:**
${coreSeoEngine || "Focus on user intent and long-tail keywords. Structure with H1, H2, H3 tags. Include internal and external linking opportunities."}
---
${postTypeSpecificKb} // Include the post-type specific knowledge base here
**Monetization & Content Goals:**
${monetizationGoals || "Strategically integrate opportunities for affiliate revenue from links naturally within the content. Do NOT explicitly suggest adding links, just provide the content that would support them."}
---

**Your Task & Output Instructions:**
1.  Write a comprehensive blog post (around 1000-1500 words is ideal, but focus on quality and completeness).
2.  Structure the post logically with an engaging introduction, several body sections using H2 and H3 headings, and a clear conclusion/call to action.
3.  Naturally integrate the "primaryKeyword" throughout the content.
4.  Weave in the "monetizationOpportunities" as seamlessly as possible. Think about what relevant products, services, or tours could be mentioned naturally. Do not explicitly suggest adding links, just provide the content that would support them.
5.  Maintain the creator's style and tone.
6.  The response MUST be a valid JSON object with a single key "blogPostContent" which is a string containing the full blog post formatted in Markdown.
7.  CRITICAL FOR JSON PARSING: Ensure that the value for "blogPostContent" is a single, valid JSON-escaped string. All newlines should be `\\n`, and all double quotes within the content should be `\\"`.
Example JSON format:
{
  "blogPostContent": "# My Awesome Travel Guide\\n\\n## Introduction\\n...\\n### Section 1\\n...\\n"
}
`;

        try {
            const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings, { responseMimeType: "application/json" }, true);
            if (parsedJson && typeof parsedJson.blogPostContent === 'string') {
                return parsedJson.blogPostContent;
            } else {
                throw new Error("AI returned an invalid format for blog post content.");
            }
        } catch (error) {
            console.error("Error generating blog post content:", error);
            throw new Error(`AI failed to generate blog post content: ${error.message || error}`);
        }
    },
    /**
     * Finds points of interest. This is a simple task.
     */
    findPointsOfInterestAI: async ({ mainLocationName, currentLocations, settings }) => {
        const existingLocationNames = currentLocations.map(l => l.name).join(', ');

        const prompt = `You are a creative travel planner. Based on the main location "${mainLocationName}", suggest up to 50 specific, popular, and interesting points of interest (like museums, landmarks, famous restaurants, unique natural features). Avoid suggesting general areas or cities that are already in the existing list of locations: ${existingLocationNames}.

Return your answer as a JSON array of objects. Each object must have four keys:
1. "name" (a string for the place name).
2. "description" (a brief, compelling 1-sentence description).
3. "lat" (a number for the latitude).
4. "lng" (a number for the longitude).

Ensure the latitude and longitude are accurate for the suggested location. Do not include any locations from the existing list.

Example JSON format:
[
  {"name": "Eiffel Tower", "description": "Iconic iron tower offering breathtaking panoramic views of Paris.", "lat": 48.8584, "lng": 2.2945},
  {"name": "Louvre Museum", "description": "Home to masterpieces like the Mona Lisa and Venus de Milo.", "lat": 48.8606, "lng": 2.3376}
]`;

        try {
            const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings);
            if (!Array.isArray(parsedJson)) {
                const key = Object.keys(parsedJson).find(k => Array.isArray(parsedJson[k]));
                if (key) {
                    return parsedJson[key];
                }
                throw new Error("AI response was not a valid JSON array.");
            }
            return parsedJson;
        } catch (error) {
            console.error("Error finding points of interest:", error);
            throw new Error(`AI failed to find locations: ${error.message || error}`);
        }
    },
    /**
     * Asks high-level strategic questions based on the user's initial notes.
     */
    generateInitialQuestionsAI: async (params) => {
    // 1. Add 'storytellingKnowledge' here
        const { initialThoughts, locations, description, storytellingKnowledge, settings } = params; 

        const styleGuidePrompt = window.aiUtils.getStyleGuidePrompt(settings);

        const prompt = `You are an expert video scriptwriter and storyteller. Your role is to be the creative guide for a user.

        **Your Internal Guide: Core Storytelling Principles**
        Read and internalize these principles. This is your expert knowledge for how to build a good story.
        \`\`\`
        ${storytellingKnowledge}
        \`\`\`

        **User's Project Information:**
        Here is the information about the user's project and their raw thoughts.
        - Video Description: ${description}
        - Creator's Notes: ${initialThoughts}
        - Available Locations: ${JSON.stringify(locations.map(loc => loc.name))}

        ${styleGuidePrompt}

        **Your Task:**
        Your goal is to become the storytelling expert for the user. Use your internal guide (the Storytelling Principles) to figure out what you need to ask to build a great narrative.

        **Critically Important:** DO NOT ask the user questions using the jargon from the principles (e.g., do not mention "The Hook," "Inciting Incident," "Climax," or "The Elixir"). The user is not the expert - you are.

        Instead, you must **translate** those storytelling concepts into simple, direct, and personal questions about the user's actual experience.

        **Example of what NOT to do:**
        - BAD: "What was the 'Inciting Incident' of your trip?"
        - BAD: "Considering the 'Resolution', what is the Elixir you returned with?"

        **Example of what TO do:**
        - GOOD: "Looking back, what was the one moment that made you realize this trip was going to be special or different than you expected?" (This gets the 'Inciting Incident' without using the jargon).
        - GOOD: "If a viewer could only remember one single idea or feeling from your video, what would you want it to be?" (This gets the 'Resolution'/'Core Message' simply).
        - GOOD: "What was the most challenging or surprising moment you faced during this trip?" (This helps identify the 'Climax').

        Ask 3-5 of these simple, experience-focused questions.

        **Output Format:**
        Your response MUST be a valid JSON object with a single key "questions".
        "questions" must be an array of strings.
`;

        return await window.aiUtils.callGeminiAPI(prompt, settings, {}, true);
    },

    /**
     * Generates a draft outline from raw text. This is a complex task.
     */
    generateDraftOutlineAI: async (params) => {
        // All the parameters and helper variables remain the same
        const { videoTitle, videoConcept, initialThoughts, initialAnswers, storytellingKnowledge, settings, refinementText, videoTone } = params;
        const styleGuidePrompt = window.aiUtils.getStyleGuidePrompt(settings, videoTone);

        const initialAnswersPrompt = initialAnswers
            ? `**Creator's Answers to Initial Questions:**\n${initialAnswers}\n`
            : '';

        const refinementPrompt = refinementText 
            ? `**Refinement Feedback:** The user has reviewed a previous version and provided these instructions that you MUST follow: "${refinementText}".` 
            : '';

        // The prompt is the only part that changes
        const prompt = `You are a master scriptwriter and storyteller. Your task is to create a compelling, clean, and easy-to-read draft outline for a video.

        **Your Internal Guide: Core Storytelling Principles**
        You MUST use these principles to structure the outline. This is your expert knowledge.
        \`\`\`
        ${storytellingKnowledge}
        \`\`\`

        **Project Information:**
        - Video Title: "${videoTitle}"
        - Video Concept: "${videoConcept}"
        - Creator's Raw Notes: \`\`\`
        ${initialThoughts}
        \`\`\`
        ${initialAnswersPrompt}
        ${refinementPrompt}

        ${styleGuidePrompt}

        **Your Task & Output Instructions:**
        1.  Read all the provided information and synthesize it.
        2.  Use your "Internal Guide" to structure the user's information into a clear narrative outline.
        3.  For each part of the outline, write a brief, engaging description of the content and the narrative focus in a way that is easy for anyone to understand. The tone must match the creator's style.
        4.  **Critically Important:** Your final output MUST NOT contain the names of the storytelling principles or any other technical jargon. Do not write "(The Hook)", "(Rising Action)", "(Act I)", etc. in the outline you produce. You are the expert; you do the structural work and present a clean, inspiring outline to the user.
        
        **Output Formatting Instructions:**
        - You MUST use Markdown for all formatting.
        - Use a '###' heading for each major part of the outline (e.g., "### Part 1: The Title").
        - Use bold for sub-headings inside each part (e.g., "**Content:**").
        - Use a single dash (-) for all bullet points.
        - Use a triple dash "---" as a separator between each major part.
        
        Your response MUST be a valid JSON object with a single key "draftOutline", which is a string containing the clean, formatted outline.
    `;

    return await window.aiUtils.callGeminiAPI(prompt, settings, {}, true);
    },


    /**
     * Generates a detailed script plan and follow-up questions. This is a complex task.
     */
    generateScriptPlanAI: async ({ videoTitle, videoConcept, draftOutline, settings, videoTone }) => {
    const styleGuide = window.aiUtils.getStyleGuidePrompt(settings, videoTone);
    const outline = draftOutline || videoConcept;

    const prompt = `You are an experienced YouTube script planner. Your task is to analyze a draft outline and generate specific, easy-to-answer questions to extract the details needed for a full script.

Video Title: "${videoTitle}"
Draft Outline:
---
${outline}
---

${styleGuide}

**Your Task:**
1.  **Review the Outline:** Analyze each section of the provided script outline.
2.  **Generate Specific Questions:** For each section, create 1-3 simple, direct questions. The goal is a balance between practical information and personal experience. Questions should pull out:
    - **Practical Details:** Key actions, "how-to" steps, important facts, or logistics.
    - **Personal Details:** Specific memories, sensory details (sight, sound, taste), emotions, and anecdotes.
    The phrasing of these questions should align with the creator's persona and style.
    
    *Good Question Examples:*
    - "What was the single most surprising thing you discovered at [Location]?"
    - "What's the #1 practical tip you'd give someone visiting [Place] for the first time?"
    - "Describe the taste of [Food Item] in just three words."
    - "What was the first thing you did when you arrived at [Scene]?"
    - "What's a common mistake people make here?"

    *Bad Question Examples (Avoid these):*
    - "What was your experience?" (Too broad)
    - "Tell me about the location." (Not specific enough)
    - "How did this place make you feel on a deep, spiritual level?" (Usually too abstract)

3.  **Return a Refined Plan & Questions:** Your goal is to present the user with their own plan, now enhanced with your clarifying questions.

**Output Format:**
Your response MUST be a valid JSON object with two keys: "scriptPlan" and "locationQuestions".
- "scriptPlan": (String) The original outline that was provided to you.
- "locationQuestions": (Array of Objects) An array where each object has a "question" key containing the string of the question.
Example: 
{
  "scriptPlan": "Intro: Hook the viewer...",
  "locationQuestions": [
    {"question": "What's the hook?"},
    {"question": "What's the key takeaway for the main segment?"}
  ]
}
`;

    const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings, {}, true);
    if (parsedJson && typeof parsedJson.scriptPlan === 'string' && Array.isArray(parsedJson.locationQuestions)) {
        return parsedJson;
    } else {
         throw new Error("AI returned an invalid format for script plan.");
    }
},
    
    /**
     * MODIFIED: Generates a full script, now aware of on-camera segments. This is a complex task.
     * The function name is changed to align with the calling component (ScriptingTask.js)
     */
    generateFinalScriptAI: async ({ scriptPlan, userAnswers, videoTitle, settings, refinementText, onCameraDescriptions, videoTone }) => {
        const styleGuide = window.aiUtils.getStyleGuidePrompt(settings, videoTone);

        // Build the prompt section for on-camera descriptions, if they exist
        let onCameraPromptSection = '';
        if (onCameraDescriptions && Object.keys(onCameraDescriptions).length > 0) {
            const descriptions = Object.entries(onCameraDescriptions)
                .filter(([, desc]) => desc && desc.trim() !== '')
                .map(([loc, desc]) => `- At ${loc}, the creator will be on camera to say/do the following: "${desc}"`)
                .join('\n');
            
            if (descriptions) {
                onCameraPromptSection = `**On-Camera Segments (CRITICAL CONTEXT):**
The creator has already recorded on-camera dialogue/actions. Your most important job is to write a voiceover that works AROUND these segments.

DO NOT repeat information that is already delivered on-camera. Your script should provide the missing context or what's happening between takes, not restate what's already said.
Your voiceover MUST serve as the bridge between segments. Write smooth transitions that lead INTO and OUT OF these on-camera moments.
Here is what the creator has noted about their on-camera footage. This is what you must work around:
${descriptions}
`;
            }
        }

        const answersPromptSection = `
Creator's Detailed Answers to Questions:
---
${userAnswers}
---
`;

        const refinementPromptSection = refinementText 
            ? `**Refinement Feedback:** You MUST incorporate this feedback into the new script: "${refinementText}".\n---\n` 
            : '';

        const prompt = `You are a professional scriptwriter for YouTube. Your task is to write the complete, final voiceover script based on all provided materials.
Video Title: "${videoTitle}"
${styleGuide}

Approved Script Outline:
---
${scriptPlan}
---
${onCameraPromptSection}
${answersPromptSection}
${refinementPromptSection}
Your Final Instructions:

1. Write the final, complete video script.
2. The output must be ONLY the spoken voiceover dialogue, ready for the creator to record.
3. Do not include scene numbers, camera directions (e.g., "[B-ROLL]"), speaker names, or any text that isn't part of the dialogue.
4. Crucially, you must follow the rules in the "On-Camera Segments" section if it exists. Your script is the glue that holds the on-camera parts and the voiceover together. For example, lead into an on-camera segment with a question ("I had to see if this place lived up to the hype...") and lead out of it with a reflection ("...and it absolutely did. Now, on to the next stop.").

Now, write the complete voiceover script.`;
        
        // This is a complex task requiring a plain text response.
        const responseText = await window.aiUtils.callGeminiAPI(prompt, settings, { responseMimeType: "text/plain" }, true);
        
        // The calling function expects an object, so we wrap the text response.
        return { finalScript: responseText };
    },
    
    /**
     * Generates keywords. This is a simple task.
     */
    generateKeywordsAI: async ({ title, concept, locationsFeatured, projectTitle, projectDescription, settings }) => {
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

        const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings);

        if (parsedJson && Array.isArray(parsedJson.keywords)) {
            return parsedJson.keywords;
        } else {
            throw new Error("AI returned an invalid keyword format.");
        }
    },

    /**
     * Extracts metadata from text. This is a simple task.
     */
    extractVideoMetadataAI: async ({ videoTitle, videoDescription, settings }) => {
        const youtubeSeoKb = settings.knowledgeBases?.youtube?.youtubeSeoKnowledgeBase || '';

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

    /**
     * Parses a full video structure from unstructured text. This is a complex task.
     */
    parseVideoFromTextAI: async ({ textInput, projectLocation, settings }) => {
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
- "locations_featured": (array of strings) An array of ALL distinct geographical location names mentioned (cities, landmarks, parks, restaurants, villages, viewpoints, etc.). Be thorough.
- "targeted_keywords": (array of strings) An array of 10-15 relevant SEO keywords or tags. Infer these from the main topics and locations.
- "estimatedLengthMinutes": (number) An estimated length in minutes if mentioned. If not mentioned, infer a reasonable length based on the script's word count (assume ~150 words per minute), or return null if no script is present.

Your response MUST be only the valid JSON object, with no other text or explanations before or after it.`;

        const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings, {}, true);

        if (!parsedJson || typeof parsedJson.title === 'undefined' || typeof parsedJson.concept === 'undefined') {
            throw new Error("AI returned an invalid or incomplete data structure.");
        }

        return parsedJson;
    },

    /**
     * Rewrites a script based on changes. This is a complex task requiring a plain text response.
     */
    refineVideoConceptBasedOnInventory: async ({ videoTitle, currentConcept, footageChangesSummary, settings, videoTone }) => {
        const styleGuide = window.aiUtils.getStyleGuidePrompt(settings, videoTone);

        const prompt = `You are a YouTube video concept reviser. A user has changed their footage inventory for locations featured in a video.
Please review the original video concept and the changes to the footage inventory, then provide a revised, brief outline or high-level plan for the video's content. Focus on key segments and main takeaways, NOT a full script.

Original Video Title: "${videoTitle}"
Original Video Concept/Plan: "${currentConcept}"

${styleGuide}

Changes in footage inventory for featured locations:
${footageChangesSummary}

Based on these changes, how should the video concept be updated? Provide only the revised concept string.`;

        return await window.aiUtils.callGeminiAPI(prompt, settings, { responseMimeType: "text/plain" }, true);
    },

    /**
     * Generates YouTube Shorts ideas. This is a simple task.
     */
    generateShortsIdeasAI: async ({
        videoTitle,
        videoConcept,
        videoLocationsFeatured,
        projectFootageInventory,
        projectTitle,
        shortsIdeaGenerationKb,
        previouslyCreatedShorts = [],
        settings,
        videoTone
    }) => {
        const styleGuide = window.aiUtils.getStyleGuidePrompt(settings, videoTone);

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

${styleGuide}
YouTube Shorts Ideas Knowledge Base: "${shortsIdeaGenerationKb || 'Focus on quick hooks, trending sounds, and challenges. Keep it concise.'}"

Previously created shorts from this video (consider these to avoid overlap or suggest variations):
${previouslyCreatedShortsSummary}

Generate 3-5 distinct YouTube Shorts ideas. For each idea, provide:
- A concise, catchy title for the Short.
- A brief description (1-2 sentences) explaining the concept and why it's suitable for Shorts.
- A suggestion for specific footage to use, leveraging the available footage and featured locations (e.g., "Drone shots of [Location X] combined with B-roll of [activity)").

Your response MUST be a valid JSON object with a single key "shortsIdeas" which is an array of objects. Each object in the array must have "title" (string), "description" (string), and "footageToUse" (string) properties.`;

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

    /**
     * Generates metadata for a YouTube Short. This is a simple task.
     */
generateShortsMetadataAI: async ({
        videoTitle,
        shortsIdea,
        settings,
        videoTone
    }) => {
        const styleGuide = window.aiUtils.getStyleGuidePrompt(settings, videoTone);

        const prompt = `You are a YouTube Shorts expert. Based on the long-form video context and a specific Shorts idea, generate optimized metadata for YouTube Studio.

Long-Form Video Title: "${videoTitle}"

Shorts Idea:
- Title: "${shortsIdea.title}"
- Concept: "${shortsIdea.description}"
- Footage Suggestion: "${shortsIdea.footageToUse}"

${styleGuide}

Your task is to generate:
1.  **On-Screen Text:** 1-3 short, punchy phrases suitable for on-screen overlays.
2.  **Short Caption:** A concise (under 100 characters), engaging caption including 2-3 relevant hashtags.
3.  **Short Description:** A more detailed (100-200 words) description for YouTube Studio.
4.  **Tags:** 5-10 relevant, comma-separated tags for SEO.

Your response MUST be a valid JSON object with the following structure:
{
    "onScreenText": ["Phrase 1", "Phrase 2"],
    "caption": "Your concise caption #hashtag1 #hashtag2",
    "description": "Your detailed short description here...",
    "tags": "tag1, tag2, tag3"
}`;

        try {
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
    },

    // NEW: Function to update the creator's style guide based on feedback.
    updateStyleGuideAI: async function({ currentStyleGuide, refinementFeedback, settings }) {
        console.log("AI: Updating Style Guide based on feedback.");

        const prompt = `
You are an AI assistant helping a content creator refine their personal "Style Guide".
Your task is to intelligently merge the user's feedback into the existing style guide.

**Instructions:**
1.  Read the "Current Style Guide" and the "Refinement Feedback" carefully.
2.  Integrate the feedback into the main body of the style guide in a natural and coherent way. Do not add any extra commentary or sections. Just update the guide.

---
**Current Style Guide:**
${currentStyleGuide || "(No existing style guide. Create one based on the feedback below.)"}
---
**Refinement Feedback to Incorporate:**
"${refinementFeedback}"
---

Respond with ONLY the complete, updated style guide text in a JSON object, like this:
{
  "newStyleGuideText": "..."
}
`;

        try {
            // Correct the call to use the object's own method
            const result = await window.aiUtils.callGeminiAPI(prompt, settings);
            console.log("AI Response for Style Guide Update:", result);
            return result;
        } catch (error) {
            console.error("Error updating style guide with AI:", error);
            throw new Error("AI failed to update the style guide.");
        }
    }
};
