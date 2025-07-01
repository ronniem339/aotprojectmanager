// creators-hub/js/utils/ai/planning/parseTranscriptAI.js

window.aiUtils = window.aiUtils || {};
window.aiUtils.parseTranscriptAI = async (options) => {
    const { fullTranscript, onCameraLocations, settings } = options;

    const prompt = `
        You are an expert video script analyst. Your task is to take a raw on-camera transcript and a list of potential locations, and then structure the transcript by assigning dialogue to the correct location.

        **Input Transcript:**
        ---
        ${fullTranscript}
        ---

        **On-Camera Locations:**
        ${onCameraLocations.map(loc => `- ${loc.name}`).join('\n')}

        **Instructions:**
        1.  Read the entire transcript carefully.
        2.  Clean up the transcript: remove filler words (like "um", "uh", "you know"), correct obvious typos, and improve sentence flow. Do not change the core meaning.
        3.  Analyze the cleaned transcript to identify distinct segments of dialogue.
        4.  For each segment, determine which of the provided On-Camera Locations it most likely corresponds to. A segment might be spoken at one specific location.
        5.  If you cannot confidently determine a location for a piece of dialogue, assign it to a location named "Unknown".
        6.  Return the result as a JSON object. The keys of the object should be the location names from the provided list, and the values should be an array of strings, where each string is a cleaned-up dialogue segment from the transcript that belongs to that location.

        **Example Output Format:**
        {
            "Times Square": [
                "Wow, look at all the lights! It's absolutely buzzing here.",
                "I can't believe how many people are here, even this late at night."
            ],
            "Central Park": [
                "It's so peaceful here, a real oasis in the middle of the city.",
                "Let's take a walk down to the lake."
            ],
            "Unknown": [
                "And next, we're heading to another famous spot."
            ]
        }

        **JSON Output:**
    `;

    const aiResponse = await window.aiUtils.callGeminiAPI(prompt, settings, {
        temperature: 0.2, // Lower temperature for more deterministic, structured output
        response_mime_type: "application/json",
    });

    try {
        // The response should be a JSON string, so we parse it.
        return JSON.parse(aiResponse);
    } catch (error) {
        console.error("Error parsing AI response for transcript analysis:", error);
        throw new Error("The AI returned an invalid format for the transcript analysis.");
    }
};