// creators-hub/js/utils/ai/scriptingV2/getStyleGuidePromptV2.js

// This is a new, separate prompt generator specifically for the V2 scripting workflow.
// It reads the detailed style guide settings from the 'styleV2' knowledge base
// to create a much more granular and effective prompt for the AI.

window.aiUtils = window.aiUtils || {};

window.aiUtils.getStyleGuidePromptV2 = (settings) => {
    // Read from the new V2 style guide object in the settings.
    const styleGuide = settings.knowledgeBases?.styleV2?.detailedStyleGuide || {};
    
    const {
        brandVoice,
        videoTone,
        videoStyle,
        speakingStyle,
        humorLevel,
        pacing,
        targetAudience,
        keyTerminology,
        thingsToAvoid,
        outroMessage,
        visualStyle,
        musicStyle
    } = styleGuide;

    let prompt = "## Creator's Detailed Style Guide (V2)\n\n";
    
    if (brandVoice) prompt += `**Overall Brand Voice:** ${brandVoice}\n`;
    if (videoTone) prompt += `**Video Tone:** ${videoTone}\n`;
    if (videoStyle) prompt += `**Video Style:** ${videoStyle}\n`;
    if (speakingStyle) prompt += `**Speaking Style:** ${speakingStyle}\n`;
    if (humorLevel) prompt += `**Humor Level:** ${humorLevel}\n`;
    if (pacing) prompt += `**Pacing:** ${pacing}\n`;
    if (targetAudience) prompt += `**Target Audience:** ${targetAudience}\n`;
    if (keyTerminology) prompt += `**Key Terminology to Use:** ${keyTerminology}\n`;
    if (thingsToAvoid) prompt += `**Things to Avoid:** ${thingsToAvoid}\n`;
    if (outroMessage) prompt += `**Standard Outro Message:** ${outroMessage}\n`;
    if (visualStyle) prompt += `**Visual Style:** ${visualStyle}\n`;
    if (musicStyle) prompt += `**Music Style:** ${musicStyle}\n`;

    // If the detailed guide is completely empty, provide a sensible default.
    if (prompt === "## Creator's Detailed Style Guide (V2)\n\n") {
        prompt += "No specific V2 style guide provided. Use a generally engaging, clear, and informative tone suitable for a YouTube travel documentary.";
    }

    return prompt;
};
