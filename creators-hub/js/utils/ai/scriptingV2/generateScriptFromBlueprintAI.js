// creators-hub/js/utils/ai/scriptingV2/generateScriptFromBlueprintAI.js

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


window.generateScriptFromBlueprintAI = async ({ blueprint, video, settings }) => {
    console.log("Assembling final script from blueprint...");

    const styleGuidePrompt = getLocalStyleGuidePrompt(settings);

    const blueprintString = JSON.stringify(blueprint.shots, null, 2);

    const prompt = `
        You are a master scriptwriter for a top-tier YouTube documentarian. You have been provided with a complete "Creative Blueprint" for an upcoming video. The blueprint contains a sequence of shots, each populated with research notes, the creator's personal experiences, and any on-camera dialogue.

        **Creator's Style Guide & Tone:**
        ${styleGuidePrompt}

        **Storytelling Principles to Follow:**
        ${settings.knowledgeBases?.storytelling?.videoStorytellingPrinciples || 'Create a clear hook, a developing middle, and a satisfying conclusion.'}

        **Video Title:** ${video.title}

        **The Creative Blueprint (in JSON format):**
        ---
        ${blueprintString}
        ---

        **Your Task:**
        Your sole task is to write the voiceover script for every shot that needs one.
        1.  **Synthesize Information:** For each shot, read the 'shot_description', 'ai_research_notes', and 'creator_experience_notes'. Synthesize these points into a natural, engaging voiceover.
        2.  **Create Smooth Transitions:** The script must flow seamlessly from one shot to the next. Use transitional phrases to connect ideas between shots and scenes.
        3.  **Integrate On-Camera Dialogue:** If a shot has 'on_camera_dialogue', the voiceover for the preceding shot should lead into it naturally, and the voiceover for the following shot should pick up from it. **Do not repeat the on-camera dialogue in the voiceover.** The voiceover should complement it.
        4.  **Match the Tone:** The entire script must strictly adhere to the creator's style guide.
        5.  **Populate the 'voiceover_script' field:** Your output must be a JSON object containing the updated list of shots, with the 'voiceover_script' field filled in for every shot that requires narration. You must return the entire blueprint structure, not just the script text.

        **Output Format:**
        Your final output MUST be a JSON object that strictly matches the input blueprint schema. The only difference is that the 'voiceover_script' fields should now be populated with your generated script.
    `;

    const responseSchema = {
      type: "OBJECT",
      properties: {
        shots: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              shot_id: { type: "STRING" },
              scene_id: { type: "STRING" },
              scene_narrative_purpose: { type: "STRING" },
              location_name: { type: "STRING" },
              shot_type: { type: "STRING" },
              shot_description: { type: "STRING" },
              voiceover_script: { type: "STRING" },
              on_camera_dialogue: { type: "STRING" },
              ai_research_notes: { type: "ARRAY", items: { type: "STRING" } },
              creator_experience_notes: { type: "STRING" },
              estimated_time_seconds: { type: "NUMBER" },
            },
            required: ["shot_id", "scene_id", "scene_narrative_purpose", "location_name", "shot_type", "shot_description", "voiceover_script", "estimated_time_seconds"]
          }
        }
      },
      required: ["shots"]
    };

    const response = await callLocalGeminiAPI(prompt, settings, responseSchema);

    if (response && blueprint.initialThoughts) {
        response.initialThoughts = blueprint.initialThoughts;
    }

    return response;
};
