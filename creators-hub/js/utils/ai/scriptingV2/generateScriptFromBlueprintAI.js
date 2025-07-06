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
        You are a master scriptwriter for a top-tier YouTube documentarian with a knack for making history and facts feel exciting and fun. You have been provided with a complete "Creative Blueprint" for an upcoming video. The blueprint contains a sequence of shots, each populated with research notes, the creator's personal experiences, on-camera dialogue, and on-location voiceover segments.

        **Creator's Style Guide & Tone:**
        ${styleGuidePrompt}

        **Storytelling Principles to Follow:**
        ${settings.knowledgeBases?.storytelling?.videoStorytellingPrinciples || 'Create a clear hook, a developing middle, and a satisfying conclusion.'}

        **Video Title:** ${video.title}

        **The Creative Blueprint (in JSON format, including existing on-location dialogue):**
        ---
        ${blueprintString}
        ---

        **Your Task:**
        Your sole task is to produce two distinct scripts based on the provided blueprint.

        **CRITICAL INSTRUCTION FOR NARRATIVE ENRICHMENT:**
        For each shot, you MUST analyze the \`ai_research_notes\`. If that array contains facts, you are required to skillfully weave the **single most interesting, surprising, or quirky fact** into the new voiceover segments you are writing. Do NOT just list facts. The goal is to make the video more engaging and entertaining, not a boring documentary. Seamlessly integrate the chosen fact to enhance the story. This is not optional.

        1.  **Full Video Script (Cohesive Narrative):**
            * Integrate all existing 'on_camera_dialogue' and 'voiceover_script_on_location' from the blueprint shots.
            * Write new, connecting voiceover segments (introductions, transitions, conclusions, hooks) that create a seamless, flowing narrative for the entire video, incorporating the most interesting facts as instructed above.
            * Ensure smooth transitions between shots and scenes, leading into and out of on-camera dialogue.
            * Do NOT repeat existing on-camera dialogue. The new voiceover should complement it.
            * Adhere strictly to the 'Creator's Style Guide & Tone' and 'Storytelling Principles'.

        2.  **Voiceover Script for Recording (Post-Production Only):**
            * This script MUST ONLY contain dialogue that needs to be recorded *post-facto*.
            * It should include the generated **hook, intro segments, conclusion, and any new narrative links, transitions, or interesting facts** that were *not* present in the original 'on_camera_dialogue' or 'voiceover_script_on_location' fields of the blueprint.
            * Essentially, this is the "glue" script: the parts you write to bridge the existing, on-location audio.
            * Format this script with clear paragraph breaks between distinct sections to make it easy to record.

        **CRITICAL INSTRUCTION FOR updated_shots:**
        For each shot object within the 'updated_shots' array in your JSON response, you MUST populate the 'voiceover_script' field with the complete spoken narrative intended for that shot.
        - **For 'On-Camera' shots:** If 'on_camera_dialogue' is present, this content MUST be included in 'voiceover_script' for that shot, potentially combined with any new overlaying voiceover you generate for that specific segment. The 'voiceover_script' should NOT be an empty string if there is relevant 'on_camera_dialogue' or any newly generated voiceover for that shot.
        - **For other shot types:** Combine 'voiceover_script_on_location' and any newly generated voiceover to form the full voiceover for that shot.
        - The goal is for 'voiceover_script' to represent *all* spoken content (whether on-camera dialogue or voiceover) for that specific shot, making the ShotCard a complete reference. ONLY provide an empty string for 'voiceover_script' if a shot genuinely has no spoken content whatsoever.

        **Output Format:**
        Your final output MUST be a JSON object with the following structure.
        \`\`\`json
        {
            "updated_shots": [
                {
                    "shot_id": "shot_1_1",
                    "shot_type": "On-Camera",
                    "shot_description": "...",
                    "location_tag": "...",
                    "on_camera_dialogue": "...",
                    "voiceover_script": "This field contains the complete spoken narrative for this specific shot. For 'On-Camera' shots, this should include the 'on_camera_dialogue' if that is the primary audio, potentially combined with any new overlaying voiceover for this segment. For other shot types, it combines 'voiceover_script_on_location' and any newly generated voiceover to form the full voiceover for this shot. Ensure this field is always populated with relevant dialogue or an empty string ONLY if absolutely no spoken content is intended for this shot.",
                    "ai_research_notes": [],
                    "creator_experience_notes": "...",
                    "estimated_time_seconds": 0
                }
                // ... all shots from the blueprint, with updated voiceover_script fields
            ],
            "full_video_script_text": "This is the complete, cohesive narrative for the entire video, combining all on-camera, on-location voiceover, and newly generated transitional/hook/conclusion dialogue. This is a single string.",
            "recording_voiceover_script_text": "This is ONLY the dialogue that needs to be recorded in post-production: the hook, intro, conclusion, and any new connecting narrative that was not part of the original on-location transcript. Format this script with clear paragraph breaks between distinct sections to make it easy to record."
        }
        \`\`\`

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
