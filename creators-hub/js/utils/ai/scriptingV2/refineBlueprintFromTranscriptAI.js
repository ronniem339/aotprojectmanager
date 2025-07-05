// creators-hub/js/utils/ai/scriptingV2/refineBlueprintFromTranscriptAI.js
window.refineBlueprintFromTranscriptAI = async (options) => {
    const { fullTranscript, blueprint, settings } = options;

    const currentBlueprintJson = JSON.stringify(blueprint, null, 2);
    const styleGuidePrompt = window.aiUtils.getStyleGuidePromptV2(settings);

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
            * `type`: "add", "modify", or "remove".
            * `shot_id`: (Required for "modify" and "remove", optional/placeholder for "add") The ID of the shot being affected.
            * `shot_type`: (Required for "add") e.g., "On-Camera", "B-Roll", "Drone".
            * `shot_description`: (Required for "add" and "modify") The new or updated description.
            * `reason`: A brief, clear explanation for the suggested change, referencing specific parts of the transcript if possible.

        **Example Output Format:**
        \`\`\`json
        {
            "suggestions": [
                {
                    "type": "add",
                    "shot_id": "new_shot_1",
                    "shot_type": "On-Camera",
                    "shot_description": "Creator shares a funny anecdote about losing their passport at the airport.",
                    "reason": "Transcript includes a detailed and humorous story about passport loss not covered in existing blueprint."
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

    const aiResponse = await window.aiUtils.callGeminiAPI(
        prompt,
        settings,
        { taskTier: 'heavy' }, // This is a complex analysis task
        {
            temperature: 0.7, // Allow some creativity in identifying new opportunities
            response_mime_type: "application/json",
        }
    );

    // The aiResponse is already a parsed JSON object due to response_mime_type
    return aiResponse;
};
