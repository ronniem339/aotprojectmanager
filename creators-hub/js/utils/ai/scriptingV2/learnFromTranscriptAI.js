// creators-hub/js/utils/ai/scriptingV2/learnFromTranscriptAI.js

// This utility function is triggered after a transcript is imported.
// It analyzes the transcript to refine the V2 Style Guide, helping the AI
// better understand the creator's unique voice, tone, and common phrasing.

window.learnFromTranscriptAI = async (transcript, projectId, settings) => {
    // **FIX APPLIED HERE**
    // The aiUtils are now accessed inside the function call (Just-In-Time).
    // This ensures that the window.aiUtils object is available when the function is
    // actually invoked, solving the script loading order problem.
    const { callGeminiAPI, getV2StyleGuide, updateV2StyleGuide } = window.aiUtils;

    console.log("Learning from new transcript to refine V2 Style Guide...");

    // Basic validation
    if (!transcript || typeof transcript !== 'string' || transcript.trim().length < 100) {
        console.warn("Transcript is too short or invalid for learning. Skipping refinement.");
        return;
    }
    if (!projectId) {
        console.error("Project ID is missing. Cannot save style guide refinements.");
        return;
    }
    if (!settings) {
        console.error("Settings object is missing. Cannot retrieve current style guide for refinement.");
        return;
    }

    try {
        const currentStyleGuide = getV2StyleGuide(settings);

        const prompt = `
            You are an AI assistant specializing in linguistic analysis and content strategy for YouTubers.
            Your task is to analyze a video transcript and refine a creator's style guide based on it.

            **Current V2 Style Guide:**
            \`\`\`json
            ${JSON.stringify(currentStyleGuide, null, 2)}
            \`\`\`

            **New Video Transcript:**
            ---
            ${transcript.substring(0, 3500)}
            ---

            **Instructions:**
            1.  Read the new transcript carefully.
            2.  Compare its language, tone, and structure to the "Current V2 Style Guide".
            3.  Identify new patterns, recurring phrases, specific tones (e.g., more humorous, more academic), or content focus areas (e.g., historical details, personal anecdotes) that are not fully captured in the current guide.
            4.  Update the values in the style guide to better reflect the new transcript.
            5.  It is crucial to only *refine* the existing guide. Do NOT add or remove any keys from the JSON object. Maintain the exact original structure.
            6.  If the transcript provides no new insights or is too generic to draw conclusions, return the current style guide completely unchanged.

            Your final output MUST be a valid JSON object representing the refined style guide.
        `;

        const responseSchema = {
            type: "OBJECT",
            properties: {
                tone_and_style: { type: "STRING" },
                common_phrases_or_idioms: { type: "ARRAY", items: { type: "STRING" } },
                content_focus: { type: "STRING" },
                structural_patterns: { type: "STRING" }
            },
            required: ["tone_and_style", "common_phrases_or_idioms", "content_focus", "structural_patterns"]
        };

        const refinedGuide = await callGeminiAPI(prompt, settings, { taskTier: 'background' }, { responseSchema });
        
        await updateV2StyleGuide(projectId, refinedGuide, transcript);

        console.log("V2 Style Guide successfully refined and saved.");

    } catch (err) {
        console.error("Error while learning from transcript:", err);
        // We don't throw here to avoid breaking the user's flow.
        // The error is logged for debugging.
    }
};
