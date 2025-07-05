// creators-hub/js/utils/ai/scriptingV2/mapTranscriptToBlueprintAI.js
window.mapTranscriptToBlueprintAI = async (options) => {
    const { fullTranscript, blueprint, video, settings } = options;

    const shotDescriptions = blueprint.shots.map(shot => {
        // Include shot_type and shot_description for AI's context
        return `- ${shot.shot_type} (${shot.shot_id}): ${shot.shot_description}`;
    }).join('\n');

    const prompt = `
        You are an expert video script editor and content analyst. Your task is to take a raw, combined on-location audio transcript and a creative blueprint (a list of planned shots), and then intelligently map the dialogue segments to the most relevant shots in the blueprint. You MUST categorize the dialogue for each shot as either 'on_camera_dialogue' or 'voiceover_script' based on the shot's type and description.

        **CRITICAL RULES:**
        1.  **Strict JSON Output:** Your entire response MUST be a single, valid JSON object.
        2.  **No Explanations:** Do NOT include any conversational text, explanations, or markdown outside of the JSON. Only the JSON object.
        3.  **Diacritics:** For all text you generate (dialogue segments), you MUST NOT use diacritics (e.g., use 'cafe' instead of 'café', 'Cordoba' instead of 'Cordoba').
        4.  **Dialogue Cleaning:** Clean up the transcript segments: remove filler words (like "um", "uh", "you know"), correct obvious typos, and improve sentence flow. Do not change the core meaning.
        5.  **Accurate Mapping & Categorization:** For each shot, analyze its type and description. Then, from the 'Full On-Camera Transcript', extract the most relevant dialogue segment and categorize it into either 'on_camera_dialogue' or 'voiceover_script'. Prioritize populating only one field per shot if possible, based on the guidelines below.

        **Dialogue Mapping Guidelines based on Shot Type and Content:**
        * **'On-Camera' Shots:**
            * **Populate 'on_camera_dialogue':** Extract dialogue where the creator is speaking directly to the camera, addressing the audience. This field should contain what is seen being spoken on screen.
            * **Leave 'voiceover_script' empty:** Unless there is a very clear and distinct, separate voiceover segment intended to overlay this on-camera footage (which is rare for 'On-Camera' types).
        * **'B-Roll', 'Location', 'Activity', 'Product', 'Footage_Only' etc. Shots (Non-On-Camera Camera Footage):**
            * **Populate 'voiceover_script':** Extract dialogue where the creator is speaking *on location* but likely *off-camera*, narrating or describing the visual content of the shot. This is dialogue that was recorded on location but is intended to be heard *over* the visual.
            * **Leave 'on_camera_dialogue' empty:** These shot types generally do not have the creator speaking directly to the camera during this footage.
        * **'Drone' Shots:**
            * **Leave BOTH 'on_camera_dialogue' and 'voiceover_script' empty:** Drone footage typically requires post-recorded narration and does not usually have relevant on-location audio.

        **Empty if No Match:** If no part of the transcript seems to fit a particular shot's 'on_camera_dialogue' or 'voiceover_script' based on the guidelines, the respective value for that field should be an empty string. Do not guess or assign unrelated dialogue.

        **Return Format:** The result must be a JSON object. The keys of the object must be the 'shot_id' from the provided blueprint. The value for each key must be an object containing both 'on_camera_dialogue' and 'voiceover_script' fields.

        **Creative Blueprint (Shot List):**
        ---
        ${shotDescriptions}
        ---

        **Full On-Camera Transcript (all audio recorded on location from camera footage):**
        ---
        ${fullTranscript}
        ---

        **Example Output Format:**
        \`\`\`json
        {
            "shot_1_1": {
                "on_camera_dialogue": "Wow, look at all the lights! Its absolutely buzzing here. I cant believe how many people are here, even this late at night.",
                "voiceover_script": ""
            },
            "shot_1_2": {
                "on_camera_dialogue": "",
                "voiceover_script": "This bustling market, with its vibrant colors and fragrant spices, truly captures the spirit of the city."
            },
            "shot_1_3": {
                "on_camera_dialogue": "",
                "voiceover_script": "" // For a drone shot, or if no relevant dialogue
            },
            "shot_2_1": {
                "on_camera_dialogue": "Alright, so here we are at the ancient ruins, absolutely breathtaking.",
                "voiceover_script": ""
            },
            "shot_2_2": {
                "on_camera_dialogue": "",
                "voiceover_script": "The intricate carvings on these stones tell tales of a civilization long past, a truly humbling experience to walk among them."
            }
        }
        \`\`\`

        **JSON Output:**
    `;

    const aiResponse = await window.aiUtils.callGeminiAPI(
        prompt,
        settings,
        { taskTier: 'heavy' }, // Complex task requiring nuanced understanding
        {
            temperature: 0.3, // Structured output, so lower temperature
            response_mime_type: "application/json",
        }
    );

    // The aiResponse is already a parsed JSON object due to response_mime_type
    return aiResponse;
};
