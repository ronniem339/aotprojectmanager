// creators-hub/js/utils/ai/scriptingV2/enrichBlueprintAI.js

// This AI utility function performs targeted research for a specific shot.
// It uses the shot's location and narrative purpose to find interesting
// facts, historical notes, or talking points to enrich the voiceover.

window.enrichBlueprintAI = async ({ shot, video, settings }) => {
    console.log(`Researching shot: ${shot.shot_description}`);

    const styleGuidePrompt = window.getStyleGuidePrompt(settings);

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

    const response = await window.callGeminiAPI(prompt, responseSchema);

    return response;
};
