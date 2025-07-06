// creators-hub/js/utils/ai/scriptingV2/findPlaceIdAI.js

window.aiUtils.findPlaceIdAI = async ({ locationName, settings }) => {
    console.log(`Searching for Place ID for: ${locationName}`);

    if (!locationName) {
        throw new Error("A location name is required to find a Place ID.");
    }

    const prompt = `
        You have access to a Google Search tool.
        Your task is to find the official Google Maps Place ID for a given location name.
        
        Location Name: "${locationName}"

        Perform a Google search to find the correct Place ID for this location.
        Your final output MUST be a single, valid JSON object with a single key, "place_id".
        If you cannot find a definitive Place ID, return null for the value.

        Example:
        {
            "place_id": "ChIJ-Y-i1f114BQRmI5sRz44L1o"
        }

        JSON Output:
    `;

    const responseSchema = {
        type: "OBJECT",
        properties: {
            place_id: {
                type: "STRING",
                description: "The Google Maps Place ID."
            }
        },
        required: ["place_id"]
    };

    try {
        const response = await window.aiUtils.callGeminiAPI(
            prompt,
            settings,
            { taskTier: 'lite' }, // This is a simple lookup, so a lite model is fine
            { responseSchema }
        );
        
        if (!response || !response.place_id) {
             throw new Error(`Could not find a Place ID for "${locationName}".`);
        }

        return response;

    } catch (err) {
        console.error(`Error finding Place ID for "${locationName}":`, err);
        throw new Error(`AI search failed for Place ID of "${locationName}". ${err.message}`);
    }
};
