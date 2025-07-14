// ================================================================== //
// FILE: ./creators-hub/js/utils/ai/scriptingV2/mapDialogueToLocationsAI.js
// ================================================================== //

window.aiUtils.mapDialogueToLocationsAI = async ({ transcript, footage_log, settings }) => {
    if (!transcript || !transcript.trim()) {
        throw new Error("Transcript is required for dialogue mapping.");
    }
    if (!footage_log || !Array.isArray(footage_log)) {
        throw new Error("Footage log is required for context.");
    }

    // Fetch the prompt template
    const promptTemplate = await fetch('./js/utils/ai/scriptingV2/prompts_v3/mapDialogueToLocationsAI.txt').then(res => res.text());

    // Prepare the footage log for the prompt, keeping it concise
    const locationContext = footage_log.map(item => ({ location_tag: item.location_tag }));
    const footageLogJson = JSON.stringify([...new Set(locationContext.map(item => item.location_tag))]); // Send only unique location tags

    // Replace placeholders
    const prompt = promptTemplate
        .replace('__TRANSCRIPT__', transcript)
        .replace('__FOOTAGE_LOG_JSON__', footageLogJson);

    // Define the expected JSON schema for the AI's response
    const responseSchema = {
        type: "ARRAY",
        items: {
            type: "OBJECT",
            properties: {
                dialogueChunk: { type: "STRING" },
                locationTag: { type: "STRING" }
            },
            required: ["dialogueChunk", "locationTag"]
        }
    };

    try {
        // Use the 'medium' task tier for this analysis
        const response = await window.aiUtils.callGeminiAPI(prompt, settings, { taskTier: 'medium' }, { responseSchema });

        if (!response || !Array.isArray(response)) {
            throw new Error("AI returned an invalid response format. Expected an array.");
        }
        
        // Add a status property to each item for the UI
        return response.map(item => ({ ...item, status: 'needs_review' }));

    } catch (err) {
        console.error("Error mapping dialogue with AI:", err);
        throw new Error(`Failed to map dialogue: ${err.message || "An unknown AI error occurred."}`);
    }
};
