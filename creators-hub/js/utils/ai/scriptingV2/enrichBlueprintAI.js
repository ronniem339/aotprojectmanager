// creators-hub/js/utils/ai/scriptingV2/enrichBlueprintAI.js

// **FIX:** The logic from getStyleGuidePrompt and callGeminiAPI has been moved directly into this file
// to prevent script loading errors and to correctly handle props.

const getLocalStyleGuidePrompt = (settings) => {
    const styleGuide = settings.knowledgeBases?.style?.styleGuide || {};
    const { videoTone, videoStyle, speakingStyle, humorLevel, targetAudience, keyTerminology, thingsToAvoid, outroMessage, brandVoice, pacing, visualStyle, musicStyle } = styleGuide;
    let prompt = "## Creator's Style Guide & Tone\n\n";
    if (brandVoice) prompt += `**Overall Brand Voice:** ${brandVoice}\n`;
    if (videoTone) prompt += `**Video Tone:** ${videoTone}\n`;
    if (videoStyle) prompt += `**Video Style:** ${videoStyle}\n`;
    if (speakingStyle) prompt += `**Speaking Style:** ${speakingStyle}\n`;
    if (humorLevel) prompt += `**Humor Level:** ${humorLevel}\n`;
    if (pacing) prompt += `**Pacing:** ${pacing}\n`;
    if (targetAudience) prompt += `**Target Audience:** ${targetAudience}\n`;
    if (keyTerminology) prompt += `**Key Terminology to Use:** ${keyTerminology}\n`;
    if (thingsToAvoid) prompt += `**Things to Avoid:** ${thingsToAvoid}\n`;
    if (outroMessage) prompt += `**Standard Outro Message:** ${outroMessage}\n\n`;
    if(visualStyle) prompt += `**Visual Style:** ${visualStyle}\n`;
    if(musicStyle) prompt += `**Music Style:** ${musicStyle}\n`;
    if (prompt === "## Creator's Style Guide & Tone\n\n") {
        prompt += "No specific style guide provided. Use a generally engaging, clear, and informative tone suitable for a YouTube travel documentary.";
    }
    return prompt;
};

const callLocalGeminiAPI = async (prompt, settings, jsonSchema = null) => {
    const apiKey = settings?.geminiApiKey || window.CREATOR_HUB_CONFIG.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("Gemini API key is not configured.");
    }
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
    const requestBody = { contents: [{ parts: [{ text: prompt }] }], generationConfig: {} };
    if (jsonSchema) {
        requestBody.generationConfig.response_mime_type = "application/json";
        requestBody.generationConfig.response_schema = jsonSchema;
    }
    try {
        const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) });
        if (!response.ok) {
            const errorBody = await response.json();
            console.error("Gemini API Error Response:", errorBody);
            throw new Error(`API request failed with status ${response.status}: ${errorBody.error?.message || 'Unknown error'}`);
        }
        const data = await response.json();
        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!responseText) {
            console.error("Invalid response structure from Gemini API:", data);
            throw new Error("Failed to parse response from the AI. The response was empty or in an unexpected format.");
        }
        if (jsonSchema) {
            return JSON.parse(responseText);
        }
        return responseText;
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        throw error;
    }
};


window.enrichBlueprintAI = async ({ shot, video, settings }) => {
    console.log(`Researching shot: ${shot.shot_description}`);

    const styleGuidePrompt = getLocalStyleGuidePrompt(settings);

    const prompt = `
        You are an expert research assistant for a YouTube documentarian. Your task is to find interesting, verifiable facts and talking points for a specific video shot.

        **Creator's Style Guide (for tone and type of facts):**
        ${styleGuidePrompt}

        **Video Title:** ${video.title}

        **Shot Details:**
        - **Location:** ${shot.location_name}
        - **Shot Type:** ${shot.shot_type}
        - **Shot Description:** ${shot.shot_description}
        - **Narrative Purpose of the Scene:** ${shot.scene_narrative_purpose}

        **Your Task:**
        Based on the shot details, find 2-4 interesting and relevant facts or talking points about the location. The facts should be concise and suitable for a voiceover script. Focus on information that is directly related to the narrative purpose of the scene. Avoid generic or widely-known information.

        **Example Topics:**
        - Unique historical events
        - Interesting geological features
        - Lesser-known cultural significance
        - Specific architectural details
        - A surprising statistic

        **Output Format:**
        Your final output MUST be a JSON object with a single key "research_notes", which is an array of strings.
        Example: { "research_notes": ["This castle was once a royal mint.", "The main tower was struck by lightning in 1742."] }
    `;

    const responseSchema = {
        type: "OBJECT",
        properties: {
            research_notes: {
                type: "ARRAY",
                items: { type: "STRING" }
            }
        },
        required: ["research_notes"]
    };

    const response = await callLocalGeminiAPI(prompt, settings, responseSchema);

    return response;
};
