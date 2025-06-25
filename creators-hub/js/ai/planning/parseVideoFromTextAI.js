window.aiUtils = window.aiUtils || {};

window.aiUtils.parseVideoFromTextAI = async ({ textInput, projectLocation, settings }) => {
    const prompt = `You are an expert video project manager. Analyze the following text from a user planning a new video for a project about "${projectLocation}".
    User's text: --- ${textInput} ---
    Extract and structure this information into a single, valid JSON object.
    Fields to populate:
    - "title": (string) The best title.
    - "concept": (string) A concise summary.
    - "script": (string) The full video script if present, otherwise an empty string. Extract only spoken words.
    - "locations_featured": (array of strings) ALL distinct geographical location names mentioned.
    - "targeted_keywords": (array of strings) 10-15 relevant SEO keywords.
    - "estimatedLengthMinutes": (number) Estimated length, or infer from script word count (~150 wpm), or return null.
    Your response MUST be only the valid JSON object.`;
    const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings, {}, true);
    if (!parsedJson || typeof parsedJson.title === 'undefined' || typeof parsedJson.concept === 'undefined') {
        throw new Error("AI returned an invalid or incomplete data structure.");
    }
    return parsedJson;
};
