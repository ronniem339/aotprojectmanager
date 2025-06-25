window.aiUtils = window.aiUtils || {};

window.aiUtils.generateKeywordsAI = async ({ title, concept, locationsFeatured, projectTitle, projectDescription, settings }) => {
    const videoLocations = (locationsFeatured || []).join(', ');
    const youtubeSeoKb = settings.knowledgeBases?.youtube?.youtubeSeoKnowledgeBase || '';
    const videoTitlesKb = settings.knowledgeBases?.youtube?.videoTitles || '';
    const videoDescriptionsKb = settings.knowledgeBases?.youtube?.videoDescriptions || '';
    const prompt = `Act as a YouTube SEO expert. Generate a list of 25-30 potential search terms.
    Context:
    - Main Title/Topic: "${title}"
    - Concept/Description: "${concept}"
    - Featured Locations: ${videoLocations.length > 0 ? videoLocations : 'None specified'}
    - Project Title: "${projectTitle}"
    - Project Description: "${projectDescription}"
    ${youtubeSeoKb ? `SEO Best Practices: ${youtubeSeoKb}` : ''}
    ${videoTitlesKb ? `Title Guidelines: ${videoTitlesKb}` : ''}
    ${videoDescriptionsKb ? `Description Guidelines: ${videoDescriptionsKb}` : ''}
    Provide a mix of short-tail, long-tail, and question-based keywords.
    Return the list as a JSON object like: {"keywords": ["keyword one", "keyword two", ...]}.`;
    const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings);
    if (parsedJson && Array.isArray(parsedJson.keywords)) {
        return parsedJson.keywords;
    } else {
        throw new Error("AI returned an invalid keyword format.");
    }
};
