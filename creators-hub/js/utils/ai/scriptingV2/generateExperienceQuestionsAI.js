// creators-hub/js/utils/ai/scriptingV2/generateExperienceQuestionsAI.js

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


window.generateExperienceQuestionsAI = async ({ shot, video, settings }) => {
    console.log(`Generating experience questions for shot: ${shot.shot_description}`);

    const styleGuidePrompt = getLocalStyleGuidePrompt(settings);

    const prompt = `
        You are an insightful video producer helping a YouTube creator flesh out their script. Your goal is to ask targeted, open-ended questions that will elicit the creator's personal experiences, feelings, and unique takeaways for a specific shot. The answers to these questions will be used to make the final script more authentic and engaging.

        **Creator's Style Guide (for tone and type of questions):**
        ${styleGuidePrompt}

        **Video Title:** ${video.title}

        **Shot Details:**
        - **Location:** ${shot.location_name}
        - **Shot Description:** ${shot.shot_description}
        - **Narrative Purpose of the Scene:** ${shot.scene_narrative_purpose}
        - **Existing Research Notes:** ${(shot.ai_research_notes || []).join(', ')}

        **Your Task:**
        Based on the shot details provided, generate 2-3 insightful questions for the creator.
        - The questions should be specific to the shot and its context.
        - They should encourage storytelling, not just simple answers.
        - They should align with the creator's style guide (e.g., if the style is factual, ask for analytical takeaways; if it's emotive, ask about feelings).
        - **Do not** ask generic questions like "What did you think?" or "How did it feel?".

        **Good Question Examples:**
        - "Beyond the historical facts, what was the one detail about the castle architecture that personally caught your eye?"
        - "You've listed the key features. What's the one thing you think most visitors would miss but is essential to understanding this place?"
        - "How did the atmosphere of this market change from when you first arrived to when you were leaving?"

        **Output Format:**
        Your final output MUST be a JSON object with a single key "questions", which is an array of strings.
        Example: { "questions": ["What was the most surprising sound you heard at this location?", "What's a common misconception about this place that you can now debunk?"] }
    `;

    const responseSchema = {
        type: "OBJECT",
        properties: {
            questions: {
                type: "ARRAY",
                items: { type: "STRING" }
            }
        },
        required: ["questions"]
    };

    const response = await callLocalGeminiAPI(prompt, settings, responseSchema);

    return response;
};
