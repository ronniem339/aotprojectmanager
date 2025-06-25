window.aiUtils = window.aiUtils || {};

window.aiUtils.generateFinalScriptAI = async ({ scriptPlan, userAnswers, videoTitle, settings, refinementText, onCameraDescriptions, videoTone, existingScript = '' }) => {
    const styleGuide = window.aiUtils.getStyleGuidePrompt(settings, videoTone);
    let prompt;
    if (existingScript) {
        prompt = `You are a professional script editor. Refine the following video script based on my request AND my style guide.
        ${styleGuide}
        You must apply the requested changes directly to the provided script. The voiceover and on-camera dialogue are from the SAME PERSON. Preserve the structure and tone unless asked to change it.
        MY REFINEMENT REQUEST: --- "${refinementText}" ---
        EXISTING SCRIPT TO REFINE: --- ${existingScript} ---
        Now, return only the full, complete, and updated script text. Do not add any extra commentary, headers, or speaker names.`;
    } else {
        const onCameraPromptSection = (onCameraDescriptions && Object.keys(onCameraDescriptions).length > 0)
            ? `**On-Camera Segments (CRITICAL CONTEXT):**
            At certain points, I (the creator) will be speaking directly to the camera. Your most important job is to write a voiceover script that seamlessly integrates with these moments.
            - The voiceover and on-camera dialogue are from the SAME PERSON.
            - DO NOT repeat information I've already said on-camera. Your script should provide the missing context.
            - Your script MUST serve as a natural bridge INTO and OUT OF these on-camera moments.
            Here are my notes on what I say/do when I'm on camera:
            ${Object.entries(onCameraDescriptions).filter(([, desc]) => desc && desc.trim() !== '').map(([loc, desc]) => `- At ${loc}, I am on camera to say/do the following: "${desc}"`).join('\n')}`
            : '';
        const answersPromptSection = `Creator's Detailed Answers: --- ${userAnswers} ---`;
        const refinementPromptSection = refinementText ? `**Refinement Feedback:** You MUST incorporate this feedback: "${refinementText}".\n---\n` : '';
        prompt = `You are a professional scriptwriter for YouTube. Write my complete, final voiceover script based on all provided materials.
        Video Title: "${videoTitle}"
        ${styleGuide}
        Approved Script Outline: --- ${scriptPlan} ---
        ${onCameraPromptSection}
        ${answersPromptSection}
        ${refinementPromptSection}
        **Your Final Instructions:**
        1. Write the final, complete video script.
        2. The output must be ONLY my spoken voiceover dialogue, ready to record.
        3. Do not include scene numbers, camera directions, speaker names, or any text not part of the dialogue.
        4. **Crucially, treat the voiceover and on-camera segments as a single, continuous monologue from me.**
        Now, write my complete voiceover script.`;
    }
    const responseText = await window.aiUtils.callGeminiAPI(prompt, settings, { responseMimeType: "text/plain" }, true);
    return { finalScript: responseText };
};
