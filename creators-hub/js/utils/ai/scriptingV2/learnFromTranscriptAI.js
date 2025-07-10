// creators-hub/js/utils/ai/scriptingV2/learnFromTranscriptAI.js

window.aiUtils.learnFromTranscriptAI = async ({ fullTranscript, settings }) => {
    console.log("Analyzing transcript to learn writing style...");

    if (!fullTranscript || typeof fullTranscript !== 'string' || fullTranscript.trim().length < 100) {
        console.warn("Transcript is too short for meaningful style analysis. Skipping.");
        return null;
    }

    const prompt = 'You are an expert linguistic analyst and writing coach. You have been given a transcript of a content creator\'s on-camera dialogue. Your task is to analyze this transcript and extract the key elements of their communication style to help them build a consistent brand voice.' +
    '\n\n**Transcript to Analyze:**\n---' + fullTranscript + '\n---' +
    '\n\n**Your Task:**' +
    '\nAnalyze the transcript and determine the creator\'s style across several key dimensions. Provide your analysis in a structured JSON format. For each dimension, provide a concise label (e.g., "Conversational," "Energetic," "Witty").' +
    '\n\n**JSON Output Format:**' +
    '\nYour final output MUST be a single, valid JSON object with the following structure. Do not include any text or formatting outside of this JSON object.' +
    '\n{' +
    '\n    "suggestedBrandVoice": "A one-sentence summary of the overall voice (e.g., \'A friendly and approachable expert who simplifies complex topics.\')",' +
    '\n    "suggestedPacing": "A label describing the speed and rhythm (e.g., \'Fast-paced and energetic\' or \'Calm and deliberate\').",' +
    '\n    "suggestedHumorLevel": "A label for the type and frequency of humor (e.g., \'Witty and sarcastic,\' \'Uses puns and wordplay,\' or \'Minimal to no humor\').",' +
    '\n    "suggestedTone": "A label for the overall feeling or attitude (e.g., \'Inspirational and motivational,\' \'Objective and informative,\' or \'Enthusiastic and passionate\').",' +
    '\n    "suggestedAudience": "A label describing the likely target audience (e.g., \'Beginners and hobbyists,\' \'Industry experts,\' or \'General audience\')."' +
    '\n}' +
    '\n\n**JSON Output:**';

    const responseSchema = {
        type: "OBJECT",
        properties: {
            suggestedBrandVoice: { type: "STRING" },
            suggestedPacing: { type: "STRING" },
            suggestedHumorLevel: { type: "STRING" },
            suggestedTone: { type: "STRING" },
            suggestedAudience: { type: "STRING" },
        },
        required: ["suggestedBrandVoice", "suggestedPacing", "suggestedHumorLevel", "suggestedTone", "suggestedAudience"]
    };

    try {
        const response = await window.aiUtils.callGeminiAPI(prompt, settings, { taskTier: 'lite' }, { responseSchema });
        return response;
    } catch (err) {
        console.error("Error learning from transcript with AI:", err);
        throw new Error(`Failed to analyze transcript style: ${err.message || "An unknown AI error occurred."}`);
    }
};