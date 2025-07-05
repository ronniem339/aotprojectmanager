// creators-hub/js/utils/ai/scriptingV2/mapTranscriptToBlueprintAI.js
window.aiUtils.mapTranscriptToBlueprintAI = async (options) => { // CHANGED: Attached to window.aiUtils
    const { fullTranscript, blueprint, video, settings } = options;

    // --- Input Validation ---
    if (!fullTranscript || typeof fullTranscript !== 'string' || fullTranscript.trim() === '') {
        throw new Error("Full transcript is required and cannot be empty for mapping.");
    }
    if (!blueprint || !Array.isArray(blueprint.shots) || blueprint.shots.length === 0) {
        throw new Error("Blueprint is required and must contain shots for mapping.");
    }
    if (!video || !video.title) {
        // 'video' is used for context in the prompt, so its title is important.
        throw new Error("Video context (title) is missing for transcript mapping.");
    }
    if (!settings || !settings.knowledgeBases) {
        throw new Error("User settings are incomplete for transcript mapping.");
    }

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

    let aiResponse;
    try {
        aiResponse = await window.aiUtils.callGeminiAPI(
            prompt,
            settings,
            { taskTier: 'heavy' }, // Complex task requiring nuanced understanding
            {
                temperature: 0.3, // Structured output, so lower temperature
                response_mime_type: "application/json",
            }
        );

        // --- Output Validation ---
        if (!aiResponse || typeof aiResponse !== 'object' || Array.isArray(aiResponse)) {
            console.error("AI response is not a valid JSON object:", aiResponse);
            throw new Error("AI returned an invalid response format for transcript mapping. Expected a JSON object.");
        }

        // Validate that each shot_id from the blueprint has an entry in the AI response
        // and that its values conform to the expected structure.
        blueprint.shots.forEach(shot => {
            const mappedContent = aiResponse[shot.shot_id];
            if (!mappedContent) {
                console.warn(`AI response missing entry for shot_id: ${shot.shot_id}.`);
                // Optionally initialize with empty strings if missing
                aiResponse[shot.shot_id] = { on_camera_dialogue: "", voiceover_script: "" };
            } else {
                if (typeof mappedContent.on_camera_dialogue !== 'string') {
                    console.warn(`Invalid 'on_camera_dialogue' for shot_id: ${shot.shot_id}. Setting to empty string.`);
                    mappedContent.on_camera_dialogue = "";
                }
                if (typeof mappedContent.voiceover_script !== 'string') {
                    console.warn(`Invalid 'voiceover_script' for shot_id: ${shot.shot_id}. Setting to empty string.`);
                    mappedContent.voiceover_script = "";
                }
            }
        });

    } catch (err) {
        console.error("Error mapping transcript to blueprint with AI:", err);
        // Re-throw a more user-friendly error message
        throw new Error(`Failed to map transcript to blueprint: ${err.message || "An unknown AI error occurred."}`);
    }

    // The aiResponse is already a parsed JSON object due to response_mime_type and validated
    return aiResponse;
};
