window.aiUtils = window.aiUtils || {};

window.aiUtils.generateShortsIdeasAI = async ({ videoTitle, videoConcept, videoLocationsFeatured, projectFootageInventory, projectTitle, shortsIdeaGenerationKb, previouslyCreatedShorts = [], settings, videoTone }) => {
    const styleGuide = window.aiUtils.getStyleGuidePrompt(settings, videoTone);
    
    const featuredLocationsDetail = (videoLocationsFeatured || []).map(locName => {
        const locInventory = Object.values(projectFootageInventory || {}).find(inv => inv.name === locName) || {};
        const footageTypes = ['bRoll', 'onCamera', 'drone'].filter(type => locInventory[type]).map(type => type.replace('bRoll', 'B-Roll').replace('onCamera', 'On-Camera').replace('drone', 'Drone')).join(', ');
        return ` - ${locName}: ${footageTypes ? footageTypes + ' footage available' : 'No specific footage recorded'}.`;
    }).join('\n');
    
    const previouslyCreatedShortsSummary = previouslyCreatedShorts.length > 0 ? previouslyCreatedShorts.map(short => `- "${short.title}" (Status: ${short.status || 'unknown'})`).join('\n') : 'No shorts created yet.';
    
    const prompt = `You are a YouTube Shorts content strategist. Generate compelling, short-form video ideas.
    Long-Form Video:
    - Title: "${videoTitle}"
    - Concept: "${videoConcept}"
    - Locations with Footage:
    ${featuredLocationsDetail || 'No specific locations featured.'}
    Project Context:
    - Series Title: "${projectTitle}"
    ${styleGuide}
    Shorts Knowledge Base: "${shortsIdeaGenerationKb || 'Focus on quick hooks and trending sounds.'}"
    Previously created shorts (avoid overlap):
    ${previouslyCreatedShortsSummary}
    Generate 3-5 distinct YouTube Shorts ideas. For each idea, provide:
    - A catchy title.
    - A brief description.
    - A suggestion for specific footage to use.
    Your response MUST be a valid JSON object with a single key "shortsIdeas" which is an array of objects with "title", "description", and "footageToUse" properties.`;

    try {
        const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings);
        if (parsedJson && Array.isArray(parsedJson.shortsIdeas)) {
            return parsedJson.shortsIdeas;
        } else {
            throw new Error("AI returned an invalid format for shorts ideas.");
        }
    } catch (error) {
        console.error("Error generating shorts ideas:", error);
        throw new Error(`AI failed to generate shorts ideas: ${error.message || error}`);
    }
};
