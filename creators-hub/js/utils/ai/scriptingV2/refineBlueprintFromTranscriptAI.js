// creators-hub/js/utils/ai/scriptingV2/refineBlueprintFromTranscriptAI.js
window.aiUtils.refineBlueprintFromTranscriptAI = async (options) => { // CHANGED: Attached to window.aiUtils
    const { fullTranscript, blueprint, settings } = options;

    // --- Input Validation ---
    if (!fullTranscript || typeof fullTranscript !== 'string' || fullTranscript.trim() === '') {
        throw new Error("Full transcript is required and cannot be empty for blueprint refinement.");
    }
    if (!blueprint || !Array.isArray(blueprint.shots) || blueprint.shots.length === 0) {
        throw new Error("Blueprint is required and must contain shots for refinement.");
    }
    if (!settings || !settings.knowledgeBases) {
        throw new Error("User settings are incomplete for AI blueprint refinement.");
    }

    const currentBlueprintJson = JSON.stringify(blueprint, null, 2);
    const styleGuidePrompt = window.aiUtils.getStyleGuidePromptV2(settings);

    // FIX: Escaped backticks within the example JSON to prevent SyntaxError
    const prompt = `
        You are an expert video script editor and content strategist. Your task is to analyze a raw on-camera transcript alongside an existing creative blueprint. Your goal is to identify how the personal experience and detailed narrative within the transcript can enrich, expand, or refine the blueprint.

        Based on the transcript, suggest concrete modifications to the blueprint, adhering to the following rules:

        **CRITICAL RULES:**
        1.  **Strict JSON Output:** Your entire response MUST be a single, valid JSON object.
        2.  **No Explanations:** Do NOT include any conversational text, explanations, or markdown outside of the JSON. Only the JSON object.
        3.  **Diacritics:** For all text you generate (descriptions, reasons, etc.), you MUST NOT use diacritics (e.g., use 'cafe' instead of 'café', 'Cordoba' instead of 'Cordoba').
        4.  **Blueprint Structure:** Maintain the core structure of the blueprint. Only suggest changes to 'shots' array and its properties.
        5.  **Shot IDs:** For modifications, use the existing 'shot_id'. For new shots, generate unique temporary IDs (e.g., "new_shot_1", "new_shot_2").

        **Detailed Instructions:**
        * Analyze the 'Full On-Camera Transcript' in relation to the 'Current Creative Blueprint'.
        * Identify areas where the transcript provides:
            * **New, significant details or anecdotes** that could warrant a new shot or a major update to an existing one.
            * **A different emotional tone or emphasis** than initially planned for a shot.
            * **Discrepancies** between the planned shot and the actual dialogue.
            * **Opportunities to clarify or expand** on a point mentioned in the blueprint.
        * Based on your analysis, propose a list of blueprint modifications.
        * Each modification should be an object with:
            * \`type\`: "add", "modify", or "remove".
            * \`shot_id\`: (Required for "modify" and "remove", optional/placeholder for "add") The ID of the shot being affected.
            * \`shot_type\`: (Required for "add") e.g., "On-Camera", "B-Roll", "Drone".
            * \`shot_description\`: (Required for "add" and "modify") The new or updated description.
            * \`reason\`: A brief, clear explanation for the suggested change, referencing specific parts of the transcript if possible.
            * \`placement_suggestion\`: (OPTIONAL, for type "add" only) If adding a new shot, suggest where it should be inserted in the blueprint. This should be an object with:
                * \`relative_to_shot_id\`: The 'shot_id' of an EXISTING shot in the blueprint.
                * \`position\`: "before" or "after" the \`relative_to_shot_id\`.
                * If no specific logical placement is found, omit this field.

        **Example Output Format:**
        \`\`\`json
        {
            "suggestions": [
                {
                    "type": "add",
                    "shot_id": "new_shot_1",
                    "shot_type": "On-Camera",
                    "shot_description": "Creator shares a funny anecdote about losing their passport at the airport.",
                    "reason": "Transcript includes a detailed and humorous story about passport loss not covered in existing blueprint.",
                    "placement_suggestion": {
                        "relative_to_shot_id": "shot_2_1",
                        "position": "after"
                    }
                },
                {
                    "type": "modify",
                    "shot_id": "shot_2_3",
                    "shot_description": "Updated: Creator expresses strong emotional connection to the ancient ruins, specifically mentioning the sense of history.",
                    "reason": "Transcript reveals a deeper emotional sentiment about the ruins than initially planned, focusing on historical connection."
                },
                {
                    "type": "remove",
                    "shot_id": "shot_3_1",
                    "reason": "Transcript indicates this planned B-roll shot on 'local markets' is no longer relevant as the creator did not visit any."
                }
            ]
        }
        \`\`\`

        ${styleGuidePrompt}

        ---
        **Current Creative Blueprint (JSON):**
        \`\`\`json
        ${currentBlueprintJson}
        \`\`\`

        ---
        **Full On-Camera Transcript:**
        ---
        ${fullTranscript}
        ---

        **JSON Output:**
    `;

    let aiResponse;
    try {
        aiResponse = await window.aiUtils.callGeminiAPI(
            prompt,
            settings,
            { taskTier: 'heavy' }, // This is a complex analysis task
            {
                temperature: 0.7, // Allow some creativity in identifying new opportunities
                response_mime_type: "application/json",
            }
        );

        // --- Output Validation ---
        if (!aiResponse || typeof aiResponse !== 'object' || !Array.isArray(aiResponse.suggestions)) {
            console.error("AI response for blueprint refinement is malformed:", aiResponse);
            throw new Error("AI returned an invalid blueprint refinement structure. Expected an object with a 'suggestions' array.");
        }

        // Validate each suggestion in the array
        aiResponse.suggestions.forEach((suggestion, index) => {
            if (typeof suggestion !== 'object' || suggestion === null) {
                throw new Error(`Suggestion at index ${index} is not a valid object.`);
            }

            if (!['add', 'modify', 'remove'].includes(suggestion.type)) {
                throw new Error(`Invalid 'type' for suggestion at index ${index}. Must be 'add', 'modify', or 'remove'.`);
            }

            if (suggestion.type !== 'add' && (!suggestion.shot_id || typeof suggestion.shot_id !== 'string')) {
                throw new Error(`'shot_id' is required and must be a string for '${suggestion.type}' suggestion at index ${index}.`);
            }

            if (suggestion.type === 'add') {
                if (!suggestion.shot_type || typeof suggestion.shot_type !== 'string') {
                    throw new Error(`'shot_type' is required and must be a string for 'add' suggestion at index ${index}.`);
                }
                if (!suggestion.shot_description || typeof suggestion.shot_description !== 'string') {
                    throw new Error(`'shot_description' is required and must be a string for 'add' suggestion at index ${index}.`);
                }
                if (suggestion.placement_suggestion) {
                    if (typeof suggestion.placement_suggestion !== 'object' || suggestion.placement_suggestion === null) {
                        throw new Error(`'placement_suggestion' for 'add' suggestion at index ${index} must be an object.`);
                    }
                    if (!suggestion.placement_suggestion.relative_to_shot_id || typeof suggestion.placement_suggestion.relative_to_shot_id !== 'string') {
                        throw new Error(`'relative_to_shot_id' is required and must be a string for 'placement_suggestion' at index ${index}.`);
                    }
                    if (!['before', 'after'].includes(suggestion.placement_suggestion.position)) {
                        throw new Error(`Invalid 'position' for 'placement_suggestion' at index ${index}. Must be 'before' or 'after'.`);
                    }
                }
            } else if (suggestion.type === 'modify') {
                if (!suggestion.shot_description || typeof suggestion.shot_description !== 'string') {
                    throw new Error(`'shot_description' is required and must be a string for 'modify' suggestion at index ${index}.`);
                }
            }

            if (!suggestion.reason || typeof suggestion.reason !== 'string') {
                throw new Error(`'reason' is required and must be a string for suggestion at index ${index}.`);
            }
        });

    } catch (err) {
        console.error("Error refining blueprint from transcript with AI:", err);
        // Re-throw a more user-friendly error message
        throw new Error(`Failed to refine blueprint from transcript: ${err.message || "An unknown AI error occurred."}`);
    }

    return aiResponse;
};
