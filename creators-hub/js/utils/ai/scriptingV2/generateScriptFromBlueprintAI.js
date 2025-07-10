// creators-hub/js/utils/ai/scriptingV2/generateScriptFromBlueprintAI.js

// This is the final and most crucial AI function in the V2 workflow.
// It acts as a master scriptwriter, taking the entire populated blueprint
// and generating a cohesive, flowing voiceover script that connects all the elements.

window.aiUtils.generateScriptFromBlueprintAI = async ({ blueprint, video, settings }) => { // CHANGED: Attached to window.aiUtils
    console.log("Assembling final script from blueprint...");

    // --- Input Validation ---
    if (!blueprint || !Array.isArray(blueprint.shots) || blueprint.shots.length === 0) {
        throw new Error("Blueprint is required and must contain shots for script generation.");
    }
    if (!video || !video.title) {
        throw new Error("Video context (title) is missing for script generation.");
    }
    if (!settings || !settings.knowledgeBases) {
        throw new Error("User settings are incomplete for AI script generation.");
    }

    // Validate essential properties for each shot before sending to AI
    blueprint.shots.forEach((shot, index) => {
        if (!shot.shot_id) throw new Error(`Shot at index ${index} is missing 'shot_id'.`);
        if (!shot.shot_type) throw new Error(`Shot at index ${index} is missing 'shot_type'.`);
        if (!shot.shot_description) throw new Error(`Shot at index ${index} is missing 'shot_description'.`);
        // location_tag, on_camera_dialogue, voiceover_script_on_location can be empty, so no strict check
    });


    const styleGuidePrompt = window.aiUtils.getStyleGuidePromptV2(settings);

    // Prepare a detailed representation of the blueprint for the AI
    const blueprintForAI = blueprint.shots.map(shot => {
        return {
            shot_id: shot.shot_id,
            shot_type: shot.shot_type,
            shot_description: shot.shot_description,
            location_tag: shot.location_tag || '', // Ensure it's a string
            on_camera_dialogue: shot.on_camera_dialogue || '',
            voiceover_script_on_location: shot.voiceover_script || '', // Clarify this is the on-location voiceover
            ai_research_notes: shot.ai_research_notes || [],
            creator_experience_notes: shot.creator_experience_notes || ''
        };
    });
    const blueprintString = JSON.stringify(blueprintForAI, null, 2);

    const prompt = `
        You are a master scriptwriter and film director for a top-tier YouTube documentarian. Your job is to take a "Creative Blueprint" and transform it into a complete, engaging video script. You must be meticulous and follow all instructions to the letter.

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
        Your goal is to produce a final, polished script and an updated blueprint. You will deliver two script versions and an updated list of shots.

        **--- CORE SCRIPTING INSTRUCTIONS ---**

        1.  **Narrative Structure:** The final `full_video_script_text` MUST follow a clear, four-part structure:
            *   **Hook:** A compelling opening (15-30 seconds) that grabs the viewer's attention.
            *   **Introduction:** Briefly introduce the topic and what the video will cover.
            *   **Main Content:** The body of the video, logically flowing from one scene to the next.
            *   **Conclusion:** A summary of the key points and a strong call to action or concluding thought.

        2.  **Narrative Enrichment:** For each shot, you MUST analyze the 'ai_research_notes'. If that array contains facts, you are required to skillfully weave the **single most interesting, surprising, or quirky fact** into the new voiceover segments you are writing. Do NOT just list facts. Seamlessly integrate the chosen fact to enhance the story. This is not optional.

        3.  **Generate Two Scripts:**
            *   **`full_video_script_text`:** A single string containing the complete, cohesive narrative for the entire video. It should combine all on-camera dialogue and all newly generated voiceover text into a seamless script.
            *   **`recording_voiceover_script_text`:** This script is for post-production recording. It MUST ONLY contain the new voiceover dialogue you generate (the hook, intro, transitions, facts, conclusion). **CRITICAL:** Format this script with double newlines ("\n\n") between paragraphs for readability during recording.

        **--- BLUEPRINT UPDATE INSTRUCTIONS (updated_shots) ---**

        You will return a new `updated_shots` array in your JSON response. Every single shot from the original blueprint MUST be included, with the following strict rules applied:

        1.  **Scene & Location Integrity:**
            *   Every shot MUST have a `scene_id` and a `location_tag`.
            *   Shots at the same location should share the same `scene_id`.
            *   The `location_tag` must be a simple, descriptive name (e.g., "Eiffel Tower", "Louvre Museum").

        2.  **Dialogue Integrity (CRITICAL):**
            *   **If `shot_type` is "On-Camera":**
                *   The `on_camera_dialogue` field MUST contain the original dialogue from the blueprint.
                *   The `voiceover_script` field for this shot MUST be an empty string (`""`). **On-Camera shots NEVER have a voiceover.**
            *   **If `shot_type` is "B-Roll" or "Drone":**
                *   The `on_camera_dialogue` field MUST be an empty string (`""`).
                *   The `voiceover_script` field should contain the NEW voiceover text you generate for that specific shot. If no voiceover is needed, it MUST be an empty string (`""`).

        3.  **Completeness:** Every field in each shot object must be present and correctly typed as specified in the output format.

        **Output Format:**
        Your final output MUST be a single, valid JSON object with the following structure. Do NOT include any text or formatting outside of this JSON object.
        ```json
        {
            "updated_shots": [
                {
                    "shot_id": "shot_1_1",
                    "scene_id": "scene-uuid-1",
                    "shot_type": "On-Camera",
                    "shot_description": "...",
                    "location_tag": "Eiffel Tower",
                    "on_camera_dialogue": "This is the original on-camera dialogue. It should not be changed.",
                    "voiceover_script": "",
                    "ai_research_notes": [],
                    "creator_experience_notes": "...",
                    "estimated_time_seconds": 15
                },
                {
                    "shot_id": "shot_1_2",
                    "scene_id": "scene-uuid-1",
                    "shot_type": "B-Roll",
                    "shot_description": "...",
                    "location_tag": "Eiffel Tower",
                    "on_camera_dialogue": "",
                    "voiceover_script": "This is the NEW voiceover text generated for this B-Roll shot.",
                    "ai_research_notes": [],
                    "creator_experience_notes": "...",
                    "estimated_time_seconds": 10
                }
            ],
            "full_video_script_text": "This is the complete, cohesive narrative for the entire video...",
            "recording_voiceover_script_text": "This is ONLY the dialogue that needs to be recorded in post-production..."
        }
        ```

        **JSON Output:**
    `;

    // Updated response schema to match the new dual output requirement
    const responseSchema = {
        type: "OBJECT",
        properties: {
            updated_shots: {
                type: "ARRAY",
                items: {
                    type: "OBJECT",
                    properties: {
                        shot_id: { type: "STRING" },
                        shot_type: { type: "STRING" },
                        shot_description: { type: "STRING" },
                        location_tag: { type: "STRING" },
                        on_camera_dialogue: { type: "STRING" },
                        voiceover_script: { type: "STRING" }, // This will now hold the integrated full VO for the shot
                        ai_research_notes: { type: "ARRAY", items: { type: "STRING" } },
                        creator_experience_notes: { type: "STRING" },
                        estimated_time_seconds: { type: "NUMBER" },
                    },
                    required: ["shot_id", "shot_type", "shot_description", "location_tag", "on_camera_dialogue", "voiceover_script", "estimated_time_seconds"]
                }
            },
            full_video_script_text: { type: "STRING" },
            recording_voiceover_script_text: { type: "STRING" }
        },
        required: ["updated_shots", "full_video_script_text", "recording_voiceover_script_text"]
    };

    let response;
    try {
        // Call the upgraded global function with the 'heavy' task tier and correct generationConfig structure.
        response = await window.aiUtils.callGeminiAPI(prompt, settings, { taskTier: 'heavy' }, { responseSchema });

        // --- Output Validation ---
        if (!response || typeof response !== 'object') {
            console.error("AI response for script generation is malformed:", response);
            throw new Error("AI returned an invalid response format. Expected a JSON object with script data.");
        }
        if (!Array.isArray(response.updated_shots)) {
            throw new Error("AI response missing 'updated_shots' array.");
        }
        if (typeof response.full_video_script_text !== 'string' || typeof response.recording_voiceover_script_text !== 'string') {
            throw new Error("AI response missing 'full_video_script_text' or 'recording_voiceover_script_text'.");
        }

        // Validate each updated_shot in the array
        response.updated_shots.forEach((shot, index) => {
            if (typeof shot !== 'object' || shot === null) {
                throw new Error(`Updated shot at index ${index} is not a valid object.`);
            }
            const requiredShotFields = ["shot_id", "shot_type", "shot_description", "location_tag", "on_camera_dialogue", "voiceover_script", "estimated_time_seconds"];
            for (const field of requiredShotFields) {
                if (shot[field] === undefined || shot[field] === null) {
                    throw new Error(`Updated shot at index ${index} is missing required field: '${field}'.`);
                }
            }
            if (typeof shot.shot_id !== 'string' || shot.shot_id.trim() === '') {
                throw new Error(`Updated shot at index ${index} has an invalid 'shot_id'.`);
            }
            if (typeof shot.voiceover_script !== 'string') {
                throw new Error(`Updated shot at index ${index} has an invalid 'voiceover_script'.`);
            }
            if (typeof shot.estimated_time_seconds !== 'number' || shot.estimated_time_seconds < 0) {
                console.warn(`Invalid estimated_time_seconds for updated shot_id: ${shot.shot_id}. Setting to 5 seconds.`);
                shot.estimated_time_seconds = 5; // Provide a default if invalid
            }
        });

    } catch (err) {
        console.error("Error generating script from blueprint with AI:", err);
        // Re-throw a more user-friendly error message
        throw new Error(`Failed to generate script from blueprint: ${err.message || "An unknown AI error occurred."}`);
    }

    // Ensure initialThoughts and other top-level blueprint properties are carried over
    // The AI returns 'updated_shots', but the overall blueprint structure needs to be maintained.
    // This part should only be done if the calling function expects the entire blueprint object back.
    // Assuming the calling function expects the 'updated_shots', full_video_script_text, and recording_voiceover_script_text
    // and will merge them into its local blueprint state.
    
    // The previous 'FIX' comment was correct, 'updated_shots' should remain for Step5.
    // However, if the `setBlueprint` in the calling component (like in Step5_FinalAssembly.js) expects
    // the blueprint to have a 'shots' property, we need to map it.
    // For now, return the AI's direct response, and let the calling component handle the merge.
    // The `window.generateScriptFromBlueprintAI` function's return value will be the AI's parsed JSON.
    return response;
};
