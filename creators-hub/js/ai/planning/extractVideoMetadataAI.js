window.aiUtils = window.aiUtils || {};

window.aiUtils.extractVideoMetadataAI = async ({ videoTitle, videoDescription, settings }) => {
    const youtubeSeoKb = settings.knowledgeBases?.youtube?.youtubeSeoKnowledgeBase || '';
    const prompt = `Analyze the YouTube video title and description. Infer geographical locations and important keywords/tags for SEO.
    Video Title: "${videoTitle}"
    Video Description: "${videoDescription}"
    ${youtubeSeoKb ? `SEO Best Practices Context: ${youtubeSeoKb}` : ''}
    Provide output as a JSON object with two keys:
    - "locations_featured": An array of location strings. Return empty array if none inferred.
    - "targeted_keywords": An array of 10-15 SEO keyword strings.`;
    const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings);
    if (parsedJson && Array.isArray(parsedJson.locations_featured) && Array.isArray(parsedJson.targeted_keywords)) {
        return {
            locations_featured: parsedJson.locations_featured,
            targeted_keywords: parsedJson.targeted_keywords
        };
    } else {
        throw new Error("AI returned an invalid format for metadata extraction.");
    }
};
