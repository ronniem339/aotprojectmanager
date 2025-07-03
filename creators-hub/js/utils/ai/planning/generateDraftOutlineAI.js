window.aiUtils = window.aiUtils || {};

window.aiUtils.generateDraftOutlineAI = async (params) => {
    const { videoTitle, videoConcept, initialThoughts, initialAnswers, storytellingKnowledge, settings, refinementText, videoTone, footageNotes } = params;
    const styleGuidePrompt = window.aiUtils.getStyleGuidePrompt(settings, videoTone);
    const initialAnswersPrompt = initialAnswers ? `**Creator's Answers to Initial Questions:**\n${initialAnswers}\n` : '';
    const refinementPrompt = refinementText ? `**Refinement Feedback:** The user has reviewed a previous version and provided these instructions that you MUST follow: "${refinementText}".` : '';

    const footagePrompt = footageNotes ? `**Available Footage & Locations:**
This is the inventory of footage planned for the video. The outline you create should consider how to incorporate all of these locations.
\`\`\`
${footageNotes}
\`\`\`
` : '';

    const prompt = `You are a master scriptwriter and storyteller. Your task is to create a compelling, clean, and easy-to-read draft outline for a video.

**Your Internal Guide: Core Storytelling Principles**
You MUST use these principles to structure the outline. This is your expert knowledge.
\`\`\`
${storytellingKnowledge}
\`\`\`

**Project Information:**
- Video Title: "${videoTitle}"
- Video Concept: "${videoConcept}"
${footagePrompt}
- Creator's Raw Notes: \`\`\`
${initialThoughts}
\`\`\`
${initialAnswersPrompt}
${refinementPrompt}
${styleGuidePrompt}

**Your Task & Output Instructions:**
1.  Read ALL the provided information, paying close attention to the available locations and footage.
2.  Use your "Internal Guide" to structure the user's information into a clear narrative outline that incorporates all planned locations.
3.  For each part of the outline, write a brief, engaging description.
4.  **Critically Important:** Your final output MUST NOT contain the names of the storytelling principles or any other technical jargon.

**Output Formatting Instructions:**
- You MUST use Markdown for all formatting.
- Use '###' for major parts.
- Use bold for sub-headings.
- Use a single dash (-) for bullet points.
- Use "---" as a separator between major parts.

Your response MUST be a valid JSON object with a single key "draftOutline", which is a string containing the outline.`;

    return await window.aiUtils.callGeminiAPI(prompt, settings, {}, true);
};
