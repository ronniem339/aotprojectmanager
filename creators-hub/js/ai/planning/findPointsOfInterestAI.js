window.aiUtils = window.aiUtils || {};

/**
 * Finds points of interest.
 */
window.aiUtils.findPointsOfInterestAI = async ({ mainLocationName, currentLocations, settings }) => {
    const existingLocationNames = currentLocations.map(l => l.name).join(', ');

    const prompt = `You are a creative travel planner. Based on the main location "${mainLocationName}", suggest up to 50 specific, popular, and interesting points of interest. Avoid suggesting general areas or cities that are already in the existing list of locations: ${existingLocationNames}.

Return your answer as a JSON array of objects. Each object must have four keys:
1. "name" (a string for the place name).
2. "description" (a brief, compelling 1-sentence description).
3. "lat" (a number for the latitude).
4. "lng" (a number for the longitude).

Ensure the latitude and longitude are accurate. Do not include any locations from the existing list.

Example JSON format:
[
 {"name": "Eiffel Tower", "description": "Iconic iron tower offering breathtaking panoramic views of Paris.", "lat": 48.8584, "lng": 2.2945},
 {"name": "Louvre Museum", "description": "Home to masterpieces like the Mona Lisa and Venus de Milo.", "lat": 48.8606, "lng": 2.3376}
]`;

    try {
        const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings);
        if (!Array.isArray(parsedJson)) {
            const key = Object.keys(parsedJson).find(k => Array.isArray(parsedJson[k]));
            if (key) {
                return parsedJson[key];
            }
            throw new Error("AI response was not a valid JSON array.");
        }
        return parsedJson;
    } catch (error) {
        console.error("Error finding points of interest:", error);
        throw new Error(`AI failed to find locations: ${error.message || error}`);
    }
};
