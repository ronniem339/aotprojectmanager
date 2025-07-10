// creators-hub/js/utils/ai/style/updateStyleGuideAI.js

window.aiUtils.updateStyleGuideAI = async ({ suggestions, currentStyleGuide, settings }) => {
    console.log("Updating style guide with new suggestions...");

    if (!suggestions || typeof suggestions !== 'object' || Object.keys(suggestions).length === 0) {
        throw new Error("Valid suggestions are required to update the style guide.");
    }

    const styleGuideForPrompt = typeof currentStyleGuide === 'object' ? JSON.stringify(currentStyleGuide, null, 2) : currentStyleGuide;

    const prompt = 'You are an expert brand strategist and copywriter. A content creator has analyzed one of their transcripts and extracted key style elements. Your task is to integrate these new findings into their existing style guide and provide a log of the change.' +
    '\n\n**Existing Style Guide Narrative:**\n---' + (styleGuideForPrompt || "No existing style guide provided.") + '\n---' +
    '\n\n**New Style Insights from Transcript Analysis:**\n---' +
    '\n- **Brand Voice:** ' + suggestions.suggestedBrandVoice +
    '\n- **Pacing:** ' + suggestions.suggestedPacing +
    '\n- **Humor Level:** ' + suggestions.suggestedHumorLevel +
    '\n- **Tone:** ' + suggestions.suggestedTone +
    '\n- **Audience:** ' + suggestions.suggestedAudience + '\n---' +
    '\n\n**Your Task:**' +
    '\n1.  **Synthesize Narrative:** Create a single, cohesive, and updated paragraph that synthesizes the "Existing Style Guide Narrative" with the "New Style Insights". This new paragraph should replace the old style guide, seamlessly incorporating the new insights.' +
    '\n2.  **Create Log Entry:** Write a concise, one-sentence log entry describing the change. This log should start with "Refined style guide to be more..." and summarize the key changes. For example: "Refined style guide to be more witty and fast-paced, targeting an expert audience."' +
    '\n\n**Output Format:**' +
    '\nYour final output MUST be a single, valid JSON object with the following structure.' +
    '\n{' +
    '\n    "newStyleGuideNarrative": "The updated, single-paragraph description of the creator\'s brand voice.",' +
    '\n    "logEntry": "The concise, one-sentence summary of the changes made."' +
    '\n}' +
    '\n\n**JSON Output:**';

    const responseSchema = {
        type: "OBJECT",
        properties: {
            newStyleGuideNarrative: { type: "STRING" },
            logEntry: { type: "STRING" },
        },
        required: ["newStyleGuideNarrative", "logEntry"]
    };

    try {
        const response = await window.aiUtils.callGeminiAPI(prompt, settings, { taskTier: 'standard' }, { responseSchema });
        if (!response || typeof response.newStyleGuideNarrative !== 'string' || typeof response.logEntry !== 'string') {
            throw new Error("AI did not return a valid new style guide package.");
        }
        return response;
    } catch (err) {
        console.error("Error updating style guide with AI:", err);
        throw new Error(`Failed to update style guide: ${err.message || "An unknown AI error occurred."}`);
    }
};