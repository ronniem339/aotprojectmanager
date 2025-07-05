// creators-hub/js/utils/ai/scriptingV2/mapTranscriptToBlueprintAI.js
window.mapTranscriptToBlueprintAI = async (options) => {
    const { fullTranscript, blueprint, video, settings } = options;

    const shotDescriptions = blueprint.shots.map(shot => `- ${shot.shot_type} (${shot.shot_id}): ${shot.shot_description}`).join('\n');

    const prompt = `
        You are an expert video script editor. Your task is to take a raw on-camera transcript and a creative blueprint (a list of planned shots), and then intelligently map the dialogue from the transcript to the most relevant shots in the blueprint.

        **Creative Blueprint (Shot List):**
        ---
        ${shotDescriptions}
        ---

        **Full On-Camera Transcript:**
        ---
        ${fullTranscript}
        ---

        **Instructions:**
        1.  Read the entire transcript and the shot list carefully.
        2.  Clean up the transcript: remove filler words (like "um", "uh", "you know"), correct obvious typos, and improve sentence flow. Do not change the core meaning.
        3.  Analyze the cleaned transcript and the blueprint's shot descriptions.
        4.  For each shot in the blueprint, identify the segment(s) of the transcript that best match the shot's description and intent.
        5.  Return the result as a JSON object. The keys of the object must be the 'shot_id' from the provided blueprint. The value for each key should be a single string containing the cleaned-up and relevant dialogue for that specific shot.
        6.  If no part of the transcript seems to fit a particular shot, the value for that shot_id should be an empty string. Do not guess or assign unrelated dialogue.

        **Example Output Format:**
        {
            "shot_1_1": "Wow, look at all the lights! It's absolutely buzzing here. I can't believe how many people are here, even this late at night.",
            "shot_1_2": "It's so peaceful here, a real oasis in the middle of the city. Let's take a walk down to the lake.",
            "shot_1_3": ""
        }

        **JSON Output:**
    `;

    // Corrected AI call: Pass taskTier in the options object and generationConfig separately
    const aiResponse = await window.aiUtils.callGeminiAPI(
        prompt,
        settings,
        { taskTier: 'heavy' }, // Pass the taskTier here, setting to 'heavy' as suggested
        {
            temperature: 0.3, // Now correctly part of generationConfig
            response_mime_type: "application/json",
        }
    );

    // The aiResponse is already a parsed JSON object due to response_mime_type
    return aiResponse;
};
