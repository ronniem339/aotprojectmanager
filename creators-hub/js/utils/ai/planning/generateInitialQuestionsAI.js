window.aiUtils = window.aiUtils || {};

window.aiUtils.generateInitialQuestionsAI = async (params) => {
    const { initialThoughts, locations, description, storytellingKnowledge, settings } = params;
    const styleGuidePrompt = window.aiUtils.getStyleGuidePrompt(settings);
    const prompt = `You are an expert video scriptwriter and storyteller.
    **Your Internal Guide: Core Storytelling Principles**
    Read and internalize these principles. This is your expert knowledge for how to build a good story.
    \`\`\`
    ${storytellingKnowledge}
    \`\`\`
    **User's Project Information:**
    - Video Description: ${description}
    - Creator's Notes: ${initialThoughts}
    - Available Locations: ${JSON.stringify(locations.map(loc => loc.name))}
    ${styleGuidePrompt}
    **Your Task:**
    Your goal is to become the storytelling expert for the user. Use your internal guide to figure out what you need to ask to build a great narrative.
    **Critically Important:** DO NOT ask the user questions using the jargon from the principles.
    Instead, you must **translate** those storytelling concepts into simple, direct, and personal questions about the user's actual experience.
    Ask 3-5 of these simple, experience-focused questions.
    **Output Format:**
    Your response MUST be a valid JSON object with a single key "questions", which must be an array of strings.`;
    return await window.aiUtils.callGeminiAPI(prompt, settings, {}, true);
};
