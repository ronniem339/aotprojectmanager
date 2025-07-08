// creators-hub/js/utils/ai/scriptingV2/learnFromTranscriptAI.js

// This utility function is triggered after a transcript is imported.
// It analyzes the transcript to refine the V2 Style Guide, helping the AI
// better understand the creator's unique voice, tone, and common phrasing.

window.learnFromTranscriptAI = async (transcript, projectId, settings) => {
    // **FIX**: We only need the 'callGeminiAPI' utility here. The database update
    // function does not exist on this object and has been removed.
    const { callGeminiAPI } = window.aiUtils;

    console.log("Learning from new transcript to refine V2 Style Guide...");

    // Basic validation
    if (!transcript || typeof transcript !== 'string' || transcript.trim().length < 100) {
        console.warn("Transcript is too short or invalid for learning. Skipping refinement.");
        return null; // Return null if there's nothing to do.
    }
    if (!projectId) {
        console.error("Project ID is missing. Cannot save style guide refinements.");
        return null;
    }
    if (!settings) {
        console.error("Settings object is missing. Cannot retrieve current style guide for refinement.");
        return null;
    }

    try {
        // Correctly access the style guide from the settings object.
        const currentStyleGuide = settings.ai?.v2StyleGuide || {
            tone_and_style: "Default tone",
            common_phrases_or_idioms: [],
            content_focus: "General",
            structural_patterns: "Standard video structure"
        };

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
        
        // **FIX**: The function now returns the result instead of trying to save it.
        return refinedGuide;

    } catch (err) {
        console.error("Error while learning from transcript:", err);
        // Return null on error so the calling function knows the process failed.
        return null;
    }
};
