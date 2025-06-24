// js/utils/aiUtils.js

/**
* This is the central AI utility object for the Creator's Hub application.
* It handles all interactions with the Google Gemini API.
*/
window.aiUtils = window.aiUtils || {};

/**
* Helper function to gather and format the creator's style guide information.
*/
window.aiUtils.getStyleGuidePrompt = (settings, videoTone) => {
    const whoAmI = settings.knowledgeBases?.creator?.whoAmI || 'A knowledgeable and engaging content creator.';
    const styleGuideText = settings.knowledgeBases?.creator?.styleGuideText || 'Clear, concise, and captivating.';
    const toneText = videoTone ? `\nVideo Tone: "${videoTone}"` : '';

    return `**Creator Style Guide & Context:**
Creator Persona (Who AmI): "${whoAmI}"
Creator Style Guide: "${styleGuideText}"${toneText}`;
};

/**
* The core, centralized function to call the Gemini API.
*/
window.aiUtils.callGeminiAPI = async (prompt, settings, generationConfig = {}, isComplex = false) => {
    if (!settings || !settings.geminiApiKey) {
      throw new Error("Gemini API Key is not set. Please set it in the settings.");
    }
    const apiKey = settings.geminiApiKey;

    const usePro = isComplex && settings.useProModelForComplexTasks;
    const modelName = usePro
      ? (settings.proModelName || 'gemini-1.5-pro-latest')
      : (settings.flashModelName || 'gemini-1.5-flash-latest');

    console.log(`%c[AI Call] Using model: ${modelName} (Complex Task: ${isComplex})`, 'color: #2563eb; font-weight: bold;');

    const diacriticsRule = `CRITICAL RULE: For all text you generate (titles, keywords, descriptions, names, script content, etc.), you MUST NOT use diacritics (e.g., use 'cafe' instead of 'café', 'Cordoba' instead of 'Córdoba'). This is for SEO and searchability for an English-speaking audience.`;

    const finalPrompt = `${diacriticsRule}\n\n--- ORIGINAL PROMPT BEGINS ---\n${prompt}`;
    
    const finalGenerationConfig = {
      responseMimeType: "application/json",
      ...generationConfig
    };

    const payload = {
      contents: [{ role: "user", parts: [{ text: finalPrompt }] }],
      generationConfig: finalGenerationConfig
    };

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);  

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

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
              const jsonStart = responseText.indexOf('{');
              const arrayStart = responseText.indexOf('[');
              
              const start = (jsonStart === -1 || (arrayStart !== -1 && arrayStart < jsonStart)) ? arrayStart : jsonStart;

              if (start === -1) {
                  throw new Error("Response did not contain a valid JSON object or array.");
              }

              const endChar = responseText[start] === '{' ? '}' : ']';
              const end = responseText.lastIndexOf(endChar);

              if (end === -1) {
                  throw new Error("Response did not contain a valid closing JSON character.");
              }
              
              const jsonString = responseText.substring(start, end + 1);
              return JSON.parse(jsonString); // Parse the CLEANED string
          } catch (e) {
              console.error("Failed to parse AI response as JSON:", responseText, e);
              throw new Error("AI response was expected to be valid JSON but wasn't.");
          }
      } else {
        // For plain text, just return it directly
        return responseText;
      }
    } catch (error) {
      clearTimeout(timeoutId);  
      if (error.name === 'AbortError') {
        throw new Error('API call timed out after 2 minutes.');
      }
      throw error;
    }
};

/**
  * Generates blog post ideas.
  */
window.aiUtils.generateBlogPostIdeasAI = async ({ destination, project, video, coreSeoEngine, ideaGenerationKb, monetizationGoals, settings }) => {
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
};

/**
 * NEW FUNCTION
 * Generates blog post ideas based on a specific video.
 */
window.aiUtils.generateBlogPostIdeasFromVideoAI = async ({ video, projectTitle, coreSeoEngine, ideaGenerationKb, monetizationGoals, settings }) => {
    const context = `A user wants blog post ideas based on a specific video from their travels.
Project Title: "${projectTitle || 'N/A'}"
Video Title: "${video.title || 'Untitled Video'}"
Video Concept: "${video.concept || 'No concept provided.'}"
Video Locations: "${(video.locations_featured || []).join(', ') || 'No locations specified.'}"
Video Keywords: "${(video.targeted_keywords || []).join(', ') || 'No keywords specified.'}"

Based on this specific video, generate 5-7 blog post ideas that expand on its themes, locations, or concepts.`;

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
            console.error("AI returned an invalid format for blog post ideas from video:", parsedJson);
            throw new Error("AI returned an invalid format for blog post ideas.");
        }
    } catch (error) {
        console.error("Error generating blog post ideas from video:", error);
        throw new Error(`AI failed to generate ideas from video: ${error.message || error}`);
    }
};


    /**
  * Generates a full blog post based on an approved idea.
  */
window.aiUtils.generateBlogPostContentAI = async ({ idea, coreSeoEngine, monetizationGoals, settings }) => {
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
${postTypeSpecificKb}
**Monetization & Content Goals:**
${monetizationGoals || "Strategically integrate opportunities for affiliate revenue from links naturally within the content. Do NOT explicitly suggest adding links, just provide the content that would support them."}
---

**Your Task & Output Instructions:**
1. Write a comprehensive blog post.
2. Structure the post logically with an engaging introduction, several body sections using H2 and H3 headings, and a clear conclusion/call to action.
3. Naturally integrate the "primaryKeyword" throughout the content.
4. Weave in the "monetizationOpportunities" as seamlessly as possible.
5. Maintain the creator's style and tone.
6. Your response MUST contain a single JSON object with a key "blogPostContent". The value should be the full blog post formatted in Markdown.
7. **CRITICAL OUTPUT FORMAT:** Wrap your entire JSON object in "~~~json" and "~~~" delimiters.

Example Output Format:
~~~json
{
 "blogPostContent": "# My Awesome Travel Guide\\n\\n## Introduction\\n..."
}
~~~
`;

    try {
      const rawResponseText = await window.aiUtils.callGeminiAPI(prompt, settings, { responseMimeType: "text/plain" }, true);
      const jsonBlockRegex = /~~~\s*json\s*\n([\s\S]*?)\n\s*~~~/;
      const match = rawResponseText.match(jsonBlockRegex);
      let jsonString = null;

      if (match && match[1]) {
        jsonString = match[1];
      } else {
            console.error("AI response did not contain a valid JSON block.", rawResponseText);
        throw new Error("AI response did not provide the expected JSON format. Please try again.");
      }

      const parsedJson = JSON.parse(jsonString);

      if (parsedJson && typeof parsedJson.blogPostContent === 'string') {
        return parsedJson.blogPostContent;
      } else {
        throw new Error("AI returned an invalid format for blog post content.");
      }
    } catch (error) {
      console.error("Error generating blog post content:", error);
      throw new Error(`AI failed to generate blog post content: ${error.message || error}`);
    }
};

/**
  * Generates a full blog post in HTML format, ready for WordPress.
  */
window.aiUtils.generateWordPressPostHTMLAI = async ({ idea, settings, tone }) => {
    const { title, primaryKeyword } = idea;
    const styleGuidePrompt = window.aiUtils.getStyleGuidePrompt(settings, tone);

    const prompt = `
You are an expert travel blogger and content creator. Your task is to write a complete blog post based on the provided title, keywords, and tone. The output must be well-structured HTML, ready for the WordPress editor.

${styleGuidePrompt}

**Blog Post Details:**
- **Title:** ${title}
- **Primary Keyword:** ${primaryKeyword}
- **Desired Tone:** ${tone || 'Informative'}

**Instructions:**
1.  Create a compelling and engaging blog post.
2.  The structure should be logical with a clear introduction, body, and conclusion. Use H2 and H3 tags for headings.
3.  **CRITICAL:** Do NOT include the main post title as a heading (e.g., as an <h1> tag) within the HTML content. The title is handled separately by WordPress.
4.  Strategically place placeholders for images and YouTube videos where they would be most effective.
    * **Image Placeholder:** Use \`<div class="placeholder-image" style="height:300px; background:#ccc; display:flex; align-items:center; justify-content:center; margin:1rem 0;" data-keywords="a descriptive keyword for the image">Image Placeholder: [add descriptive keywords here]</div>\`
    * **YouTube Placeholder:** Use \`<div class="placeholder-youtube" style="height:300px; background:#333; color:white; display:flex; align-items:center; justify-content:center; margin:1rem 0;" data-keywords="a descriptive keyword for the video">YouTube Placeholder: [add descriptive keywords here]</div>\`
5.  Ensure the primary keyword is naturally integrated into the text.
6.  Do NOT include \`<html>\`, \`<head>\`, or \`<body>\` tags. The output should be only the content that goes inside the WordPress editor.
7.  Your entire response should be only the raw HTML content. Do not wrap it in JSON or Markdown code blocks.`;

    try {
        const htmlContent = await window.aiUtils.callGeminiAPI(
            prompt,
            settings,
            { responseMimeType: "text/plain" },
            true // This is a complex task
        );

        let cleanedHtml = htmlContent.trim();
        if (cleanedHtml.startsWith('```html')) {
            cleanedHtml = cleanedHtml.substring(7).trim();
        } else if (cleanedHtml.startsWith('```')) {
             cleanedHtml = cleanedHtml.substring(3).trim();
        }
        if (cleanedHtml.endsWith('```')) {
            cleanedHtml = cleanedHtml.slice(0, -3).trim();
        }

        return cleanedHtml;

    } catch (error) {
        console.error("Error generating WordPress Post HTML:", error);
        throw new Error(`AI failed to generate WordPress HTML: ${error.message || error}`);
    }
};
/**
 * --- NEW FUNCTION ---
 * Generates SEO tags for a blog post.
 */
window.aiUtils.generateTagsForPostAI = async ({ idea, settings }) => {
    const prompt = `You are an SEO expert. Based on the following blog post idea, generate a list of 5-10 highly relevant tags for WordPress.
    
    Blog Post Details:
    - Title: "${idea.title}"
    - Description: "${idea.description}"
    - Primary Keyword: "${idea.primaryKeyword}"

    Return the list as a valid JSON object with a single key "tags", which is an array of strings.
    Example: { "tags": ["travel", "destinations", "city guide"] }`;

    try {
        const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings);
        if (parsedJson && Array.isArray(parsedJson.tags)) {
            return parsedJson.tags;
        } else {
            console.warn("AI returned an invalid format for tags, returning empty array.", parsedJson);
            return []; // Return an empty array on failure to prevent crashes
        }
    } catch (error) {
        console.error("Error generating tags for post:", error);
        throw new Error(`AI failed to generate tags: ${error.message || error}`);
    }
};
  /**
  * Finds points of interest.
  */
window.aiUtils.findPointsOfInterestAI = async ({ mainLocationName, currentLocations, settings }) => {
    const existingLocationNames = currentLocations.map(l => l.name).join(', ');

    const prompt = `You are a creative travel planner. Based on the main location "${mainLocationName}", suggest up to 50 specific, popular, and interesting points of interest. Avoid suggesting general areas or cities that are already in the existing list of locations: ${existingLocationNames}.

Return your answer as a JSON array of objects. Each object must have four keys:
1. "name" (a string for the place name).
2. "description" (a brief, compelling 1-sentence description).
3. "lat" (a number for the latitude).
4. "lng" (a number for the longitude).

Ensure the latitude and longitude are accurate. Do not include any locations from the existing list.

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
};
    
window.aiUtils.generateInitialQuestionsAI = async (params) => {
        const { initialThoughts, locations, description, storytellingKnowledge, settings } = params;
        const styleGuidePrompt = window.aiUtils.getStyleGuidePrompt(settings);
        const prompt = `You are an expert video scriptwriter and storyteller.
        **Your Internal Guide: Core Storytelling Principles**
        Read and internalize these principles. This is your expert knowledge for how to build a good story.
        \`\`\`
        ${storytellingKnowledge}
        \`\`\`
        **User's Project Information:**
        - Video Description: ${description}
        - Creator's Notes: ${initialThoughts}
        - Available Locations: ${JSON.stringify(locations.map(loc => loc.name))}
        ${styleGuidePrompt}
        **Your Task:**
        Your goal is to become the storytelling expert for the user. Use your internal guide to figure out what you need to ask to build a great narrative.
        **Critically Important:** DO NOT ask the user questions using the jargon from the principles.
        Instead, you must **translate** those storytelling concepts into simple, direct, and personal questions about the user's actual experience.
        Ask 3-5 of these simple, experience-focused questions.
        **Output Format:**
        Your response MUST be a valid JSON object with a single key "questions", which must be an array of strings.`;
        return await window.aiUtils.callGeminiAPI(prompt, settings, {}, true);
    };

window.aiUtils.generateDraftOutlineAI = async (params) => {
        const { videoTitle, videoConcept, initialThoughts, initialAnswers, storytellingKnowledge, settings, refinementText, videoTone } = params;
        const styleGuidePrompt = window.aiUtils.getStyleGuidePrompt(settings, videoTone);
        const initialAnswersPrompt = initialAnswers ? `**Creator's Answers to Initial Questions:**\n${initialAnswers}\n` : '';
        const refinementPrompt = refinementText ? `**Refinement Feedback:** The user has reviewed a previous version and provided these instructions that you MUST follow: "${refinementText}".` : '';
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
        1. Read all the provided information and synthesize it.
        2. Use your "Internal Guide" to structure the user's information into a clear narrative outline.
        3. For each part of the outline, write a brief, engaging description.
        4. **Critically Important:** Your final output MUST NOT contain the names of the storytelling principles or any other technical jargon.
        **Output Formatting Instructions:**
        - You MUST use Markdown for all formatting.
        - Use '###' for major parts.
        - Use bold for sub-headings.
        - Use a single dash (-) for bullet points.
        - Use "---" as a separator between major parts.
        Your response MUST be a valid JSON object with a single key "draftOutline", which is a string containing the outline.`;
        return await window.aiUtils.callGeminiAPI(prompt, settings, {}, true);
    };

window.aiUtils.generateScriptPlanAI = async ({ videoTitle, videoConcept, draftOutline, settings }) => {
        const styleGuidePrompt = window.aiUtils.getStyleGuidePrompt(settings);
        const prompt = `
        You are an expert video producer and storyteller. Your goal is to help a creator flesh out their video by asking insightful questions.
        You have been given the draft outline. Your task is to generate questions to extract personal experiences, feelings, and specific details.
        **Video Title:** "${videoTitle}"
        **Video Concept:** "${videoConcept}"
        ${styleGuidePrompt}
        **Draft Outline to Analyze:**
        ---
        ${draftOutline}
        ---
        **Your Task:**
        Based on the outline, generate 5-7 targeted questions. Focus on:
        - Eliciting emotional responses or personal reflections.
        - Uncovering specific, sensory details.
        - Probing for unexpected challenges or surprises.
        - Encouraging a unique opinion or "insider tip".
        **Output Format:**
        A valid JSON object with a single key "locationQuestions", which must be an array of objects, where each object has a single key "question".`;
        const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings, {}, true);
        if (parsedJson && Array.isArray(parsedJson.locationQuestions)) {
            return parsedJson;
        } else {
            throw new Error("AI returned an invalid format for script plan questions.");
        }
    };

window.aiUtils.generateFinalScriptAI = async ({ scriptPlan, userAnswers, videoTitle, settings, refinementText, onCameraDescriptions, videoTone, existingScript = '' }) => {
        const styleGuide = window.aiUtils.getStyleGuidePrompt(settings, videoTone);
        let prompt;
        if (existingScript) {
            prompt = `You are a professional script editor. Refine the following video script based on my request AND my style guide.
            ${styleGuide}
            You must apply the requested changes directly to the provided script. The voiceover and on-camera dialogue are from the SAME PERSON. Preserve the structure and tone unless asked to change it.
            MY REFINEMENT REQUEST: --- "${refinementText}" ---
            EXISTING SCRIPT TO REFINE: --- ${existingScript} ---
            Now, return only the full, complete, and updated script text. Do not add any extra commentary, headers, or speaker names.`;
        } else {
            const onCameraPromptSection = (onCameraDescriptions && Object.keys(onCameraDescriptions).length > 0)
                ? `**On-Camera Segments (CRITICAL CONTEXT):**
                At certain points, I (the creator) will be speaking directly to the camera. Your most important job is to write a voiceover script that seamlessly integrates with these moments.
                - The voiceover and on-camera dialogue are from the SAME PERSON.
                - DO NOT repeat information I've already said on-camera. Your script should provide the missing context.
                - Your script MUST serve as a natural bridge INTO and OUT OF these on-camera moments.
                Here are my notes on what I say/do when I'm on camera:
                ${Object.entries(onCameraDescriptions).filter(([, desc]) => desc && desc.trim() !== '').map(([loc, desc]) => `- At ${loc}, I am on camera to say/do the following: "${desc}"`).join('\n')}`
                : '';
            const answersPromptSection = `Creator's Detailed Answers: --- ${userAnswers} ---`;
            const refinementPromptSection = refinementText ? `**Refinement Feedback:** You MUST incorporate this feedback: "${refinementText}".\n---\n` : '';
            prompt = `You are a professional scriptwriter for YouTube. Write my complete, final voiceover script based on all provided materials.
            Video Title: "${videoTitle}"
            ${styleGuide}
            Approved Script Outline: --- ${scriptPlan} ---
            ${onCameraPromptSection}
            ${answersPromptSection}
            ${refinementPromptSection}
            **Your Final Instructions:**
            1. Write the final, complete video script.
            2. The output must be ONLY my spoken voiceover dialogue, ready to record.
            3. Do not include scene numbers, camera directions, speaker names, or any text not part of the dialogue.
            4. **Crucially, treat the voiceover and on-camera segments as a single, continuous monologue from me.**
            Now, write my complete voiceover script.`;
        }
        const responseText = await window.aiUtils.callGeminiAPI(prompt, settings, { responseMimeType: "text/plain" }, true);
        return { finalScript: responseText };
    };
        
window.aiUtils.generateKeywordsAI = async ({ title, concept, locationsFeatured, projectTitle, projectDescription, settings }) => {
        const videoLocations = (locationsFeatured || []).join(', ');
        const youtubeSeoKb = settings.knowledgeBases?.youtube?.youtubeSeoKnowledgeBase || '';
        const videoTitlesKb = settings.knowledgeBases?.youtube?.videoTitles || '';
        const videoDescriptionsKb = settings.knowledgeBases?.youtube?.videoDescriptions || '';
        const prompt = `Act as a YouTube SEO expert. Generate a list of 25-30 potential search terms.
        Context:
        - Main Title/Topic: "${title}"
        - Concept/Description: "${concept}"
        - Featured Locations: ${videoLocations.length > 0 ? videoLocations : 'None specified'}
        - Project Title: "${projectTitle}"
        - Project Description: "${projectDescription}"
        ${youtubeSeoKb ? `SEO Best Practices: ${youtubeSeoKb}` : ''}
        ${videoTitlesKb ? `Title Guidelines: ${videoTitlesKb}` : ''}
        ${videoDescriptionsKb ? `Description Guidelines: ${videoDescriptionsKb}` : ''}
        Provide a mix of short-tail, long-tail, and question-based keywords.
        Return the list as a JSON object like: {"keywords": ["keyword one", "keyword two", ...]}.`;
        const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings);
        if (parsedJson && Array.isArray(parsedJson.keywords)) {
            return parsedJson.keywords;
        } else {
            throw new Error("AI returned an invalid keyword format.");
        }
    };

window.aiUtils.extractVideoMetadataAI = async ({ videoTitle, videoDescription, settings }) => {
        const youtubeSeoKb = settings.knowledgeBases?.youtube?.youtubeSeoKnowledgeBase || '';
        const prompt = `Analyze the YouTube video title and description. Infer geographical locations and important keywords/tags for SEO.
        Video Title: "${videoTitle}"
        Video Description: "${videoDescription}"
        ${youtubeSeoKb ? `SEO Best Practices Context: ${youtubeSeoKb}` : ''}
        Provide output as a JSON object with two keys:
        - "locations_featured": An array of location strings. Return empty array if none inferred.
        - "targeted_keywords": An array of 10-15 SEO keyword strings.`;
        const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings);
        if (parsedJson && Array.isArray(parsedJson.locations_featured) && Array.isArray(parsedJson.targeted_keywords)) {
            return {
                locations_featured: parsedJson.locations_featured,
                targeted_keywords: parsedJson.targeted_keywords
            };
        } else {
            throw new Error("AI returned an invalid format for metadata extraction.");
        }
    };

window.aiUtils.parseVideoFromTextAI = async ({ textInput, projectLocation, settings }) => {
        const prompt = `You are an expert video project manager. Analyze the following text from a user planning a new video for a project about "${projectLocation}".
        User's text: --- ${textInput} ---
        Extract and structure this information into a single, valid JSON object.
        Fields to populate:
        - "title": (string) The best title.
        - "concept": (string) A concise summary.
        - "script": (string) The full video script if present, otherwise an empty string. Extract only spoken words.
        - "locations_featured": (array of strings) ALL distinct geographical location names mentioned.
        - "targeted_keywords": (array of strings) 10-15 relevant SEO keywords.
        - "estimatedLengthMinutes": (number) Estimated length, or infer from script word count (~150 wpm), or return null.
        Your response MUST be only the valid JSON object.`;
        const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings, {}, true);
        if (!parsedJson || typeof parsedJson.title === 'undefined' || typeof parsedJson.concept === 'undefined') {
            throw new Error("AI returned an invalid or incomplete data structure.");
        }
        return parsedJson;
    };

window.aiUtils.refineVideoConceptBasedOnInventory = async ({ videoTitle, currentConcept, footageChangesSummary, settings, videoTone }) => {
        const styleGuide = window.aiUtils.getStyleGuidePrompt(settings, videoTone);
        const prompt = `You are a YouTube video concept reviser. A user changed their footage inventory.
        Please review the original concept and the changes, then provide a revised, brief outline or high-level plan.
        Original Title: "${videoTitle}"
        Original Concept: "${currentConcept}"
        ${styleGuide}
        Footage Inventory Changes: ${footageChangesSummary}
        Based on these changes, how should the video concept be updated? Provide only the revised concept string.`;
        return await window.aiUtils.callGeminiAPI(prompt, settings, { responseMimeType: "text/plain" }, true);
    };

// **FIX: Reverted to the simpler, correct version.** // With the central callGeminiAPI now being robust, this function no longer needs complex parsing logic.
window.aiUtils.generateShortsIdeasAI = async ({ videoTitle, videoConcept, videoLocationsFeatured, projectFootageInventory, projectTitle, shortsIdeaGenerationKb, previouslyCreatedShorts = [], settings, videoTone }) => {
    const styleGuide = window.aiUtils.getStyleGuidePrompt(settings, videoTone);
    
    const featuredLocationsDetail = (videoLocationsFeatured || []).map(locName => {
        const locInventory = Object.values(projectFootageInventory || {}).find(inv => inv.name === locName) || {};
        const footageTypes = ['bRoll', 'onCamera', 'drone'].filter(type => locInventory[type]).map(type => type.replace('bRoll', 'B-Roll').replace('onCamera', 'On-Camera').replace('drone', 'Drone')).join(', ');
        return ` - ${locName}: ${footageTypes ? footageTypes + ' footage available' : 'No specific footage recorded'}.`;
    }).join('\n');
    
    const previouslyCreatedShortsSummary = previouslyCreatedShorts.length > 0 ? previouslyCreatedShorts.map(short => `- "${short.title}" (Status: ${short.status || 'unknown'})`).join('\n') : 'No shorts created yet.';
    
    const prompt = `You are a YouTube Shorts content strategist. Generate compelling, short-form video ideas.
    Long-Form Video:
    - Title: "${videoTitle}"
    - Concept: "${videoConcept}"
    - Locations with Footage:
    ${featuredLocationsDetail || 'No specific locations featured.'}
    Project Context:
    - Series Title: "${projectTitle}"
    ${styleGuide}
    Shorts Knowledge Base: "${shortsIdeaGenerationKb || 'Focus on quick hooks and trending sounds.'}"
    Previously created shorts (avoid overlap):
    ${previouslyCreatedShortsSummary}
    Generate 3-5 distinct YouTube Shorts ideas. For each idea, provide:
    - A catchy title.
    - A brief description.
    - A suggestion for specific footage to use.
    Your response MUST be a valid JSON object with a single key "shortsIdeas" which is an array of objects with "title", "description", and "footageToUse" properties.`;

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
};

window.aiUtils.generateShortsMetadataAI = async ({ videoTitle, shortsIdea, settings, videoTone }) => {
        const styleGuide = window.aiUtils.getStyleGuidePrompt(settings, videoTone);
        const prompt = `You are a YouTube Shorts expert. Based on the long-form video and a Shorts idea, generate optimized metadata.
        Long-Form Video Title: "${videoTitle}"
        Shorts Idea:
        - Title: "${shortsIdea.title}"
        - Concept: "${shortsIdea.description}"
        ${styleGuide}
        Generate:
        1. **On-Screen Text:** 1-3 short, punchy phrases.
        2. **Short Caption:** Concise (under 100 characters) caption with 2-3 relevant hashtags.
        3. **Short Description:** Detailed (100-200 words) description for YouTube Studio.
        4. **Tags:** 5-10 relevant, comma-separated tags.
        Your response MUST be a valid JSON object with keys: "onScreenText", "caption", "description", "tags".`;
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
    };

window.aiUtils.updateStyleGuideAI = async function({ currentStyleGuide, refinementFeedback, settings }) {
        const prompt = `You are an AI assistant helping a creator refine their personal "Style Guide".
        Intelligently merge the user's feedback into the existing style guide.
        **Current Style Guide:**
        ${currentStyleGuide || "(No existing style guide. Create one based on the feedback below.)"}
        ---
        **Refinement Feedback to Incorporate:**
        "${refinementFeedback}"
        ---
        Respond with ONLY the complete, updated style guide text in a JSON object, like this:
        { "newStyleGuideText": "..." }`;
        try {
            const result = await window.aiUtils.callGeminiAPI(prompt, settings);
            return result;
        } catch (error) {
            console.error("Error updating style guide with AI:", error);
            throw new Error("AI failed to update the style guide.");
        }
    }
