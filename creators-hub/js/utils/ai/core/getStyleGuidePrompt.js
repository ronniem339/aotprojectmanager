window.aiUtils = window.aiUtils || {};

/**
 * Helper function to gather and format the creator's style guide information.
 */
window.aiUtils.getStyleGuidePrompt = (settings, videoTone) => {
    const whoAmI = settings.knowledgeBases?.creator?.whoAmI || 'A knowledgeable and engaging content creator.';
    const styleGuideText = settings.knowledgeBases?.creator?.styleGuideText || 'Clear, concise, and captivating.';
    const toneText = videoTone ? `
Video Tone: "${videoTone}"` : '';

    return `**Creator Style Guide & Context:**
Creator Persona (Who AmI): "${whoAmI}"
Creator Style Guide: "${styleGuideText}"${toneText}`;
};
