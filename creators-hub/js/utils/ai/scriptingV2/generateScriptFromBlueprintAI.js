// creators-hub/js/utils/ai/scriptingV2/generateScriptFromBlueprintAI.js

// This is the final and most crucial AI function in the V2 workflow.
// It acts as a master scriptwriter, taking the entire populated blueprint
// and generating a cohesive, flowing voiceover script that connects all the elements.

window.generateScriptFromBlueprintAI = async ({ blueprint, video, settings }) => {
    console.log("Assembling final script from blueprint...");

    const styleGuidePrompt = window.aiUtils.getStyleGuidePromptV2(settings);

    // Prepare a detailed representation of the blueprint for the AI
    const blueprintForAI = blueprint.shots.map(shot => {
        return {
            shot_id: shot.shot_id,
            shot_type: shot.shot_type,
            shot_description: shot.shot_description,
            location_tag: shot.location_tag, // Include location for context
            on_camera_dialogue: shot.on_camera_dialogue || '',
            voiceover_script_on_location: shot.voiceover_script || '', // Clarify this is the on-location voiceover
            ai_research_notes: shot.ai_research_notes || [],
            creator_experience_notes: shot.creator_experience_notes || ''
        };
    });
    const blueprintString = JSON.stringify(blueprintForAI, null, 2);

    const prompt = `
        You are a master scriptwriter for a top-tier YouTube documentarian. You have been provided with a complete "Creative Blueprint" for an upcoming video. The blueprint contains a sequence of shots, each populated with research notes, the creator's personal experiences, on-camera dialogue, and on-location voiceover segments.

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
        Your sole task is to produce two distinct scripts based on the provided blueprint:

        1.  **Full Video Script (Cohesive Narrative):**
            * Integrate all existing 'on_camera_dialogue' and 'voiceover_script_on_location' from the blueprint shots.
            * Write new, connecting voiceover segments (introductions, transitions, conclusions, hooks) to create a seamless, flowing narrative for the entire video.
            * Ensure smooth transitions between shots and scenes, leading into and out of on-camera dialogue.
            * Do NOT repeat existing on-camera dialogue. The new voiceover should complement it.
            * Adhere strictly to the 'Creator's Style Guide & Tone' and 'Storytelling Principles'.

        2.  **Voiceover Script for Recording (Post-Production Only):**
            * This script MUST ONLY contain dialogue that needs to be recorded *post-facto*.
            * It should include the generated **hook, intro segments, conclusion, and any new narrative links or transitions** that were *not* present in the original 'on_camera_dialogue' or 'voiceover_script_on_location' fields of the blueprint.
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

    // Call the upgraded global function with the 'heavy' task tier and correct generationConfig structure.
    const response = await window.aiUtils.callGeminiAPI(prompt, settings, { taskTier: 'heavy' }, { responseSchema });

    // Ensure initialThoughts and other top-level blueprint properties are carried over
    // The AI returns 'updated_shots', but the overall blueprint structure needs to be maintained.
    if (response && blueprint.initialThoughts) {
        response.initialThoughts = blueprint.initialThoughts;
    }
    // Set the shots in the response to the updated_shots from AI
    if (response && response.updated_shots) {
        response.shots = response.updated_shots;
        // FIX: Removed the line 'delete response.updated_shots;'
        // The 'updated_shots' field should remain in the response for Step5_FinalAssembly to access.
    }

    return response;
};
