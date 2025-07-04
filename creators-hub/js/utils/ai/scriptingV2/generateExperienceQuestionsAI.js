// creators-hub/js/utils/ai/scriptingV2/generateExperienceQuestionsAI.js

// This AI utility function acts as a creative partner, generating targeted
// questions to help the creator inject their personal experience and
// unique perspective into the script for a specific shot.

window.generateExperienceQuestionsAI = async ({ shot, video, settings }) => {
    console.log(`Generating experience questions for shot: ${shot.shot_description}`);

    const styleGuidePrompt = window.getStyleGuidePrompt(settings);

    const prompt = `
        You are an insightful video producer helping a YouTube creator flesh out their script. Your goal is to ask targeted, open-ended questions that will elicit the creator's personal experiences, feelings, and unique takeaways for a specific shot. The answers to these questions will be used to make the final script more authentic and engaging.

        **Creator's Style Guide (for tone and type of questions):**
        ${styleGuidePrompt}

        **Video Title:** ${video.title}

        **Shot Details:**
        - **Location:** ${shot.location_name}
        - **Shot Description:** ${shot.shot_description}
        - **Narrative Purpose of the Scene:** ${shot.scene_narrative_purpose}
        - **Existing Research Notes:** ${(shot.ai_research_notes || []).join(', ')}

        **Your Task:**
        Based on the shot details provided, generate 2-3 insightful questions for the creator.
        - The questions should be specific to the shot and its context.
        - They should encourage storytelling, not just simple answers.
        - They should align with the creator's style guide (e.g., if the style is factual, ask for analytical takeaways; if it's emotive, ask about feelings).
        - **Do not** ask generic questions like "What did you think?" or "How did it feel?".

        **Good Question Examples:**
        - "Beyond the historical facts, what was the one detail about the castle architecture that personally caught your eye?"
        - "You've listed the key features. What's the one thing you think most visitors would miss but is essential to understanding this place?"
        - "How did the atmosphere of this market change from when you first arrived to when you were leaving?"

        **Output Format:**
        Your final output MUST be a JSON object with a single key "questions", which is an array of strings.
        Example: { "questions": ["What was the most surprising sound you heard at this location?", "What's a common misconception about this place that you can now debunk?"] }
    `;

    const responseSchema = {
        type: "OBJECT",
        properties: {
            questions: {
                type: "ARRAY",
                items: { type: "STRING" }
            }
        },
        required: ["questions"]
    };

    const response = await window.callGeminiAPI(prompt, responseSchema);

    return response;
};
