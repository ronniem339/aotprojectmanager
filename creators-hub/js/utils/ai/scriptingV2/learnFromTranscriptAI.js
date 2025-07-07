// creators-hub/js/utils/ai/scriptingv2/learnFromTranscriptAI.js

window.learnFromTranscriptAI = async (transcript, projectId) => {
  // Access utilities from the global window object.
  const { callGeminiAPI } = window.aiUtils;
  // We'll need functions to interact with the V2 style guide.
  const { getV2StyleGuide, updateV2StyleGuide, logV2StyleGuideRefinement } = window.db;

  if (!callGeminiAPI || !getV2StyleGuide || !updateV2StyleGuide || !logV2StyleGuideRefinement) {
    console.error("learnFromTranscriptAI: Missing required V2 style guide database functions.");
    return;
  }

  console.log('--- V2 Style Guide learning process started ---');

  const prompt = `
    You are an expert style analyst. Analyze the following transcript to understand the creator's communication style for their YouTube videos.
    Based on your analysis, provide values for the following detailed style guide attributes.
    If you cannot confidently determine a value for a specific attribute from the text, omit it from the final JSON object.

    - **speakingStyle:** How does the person speak? (e.g., "Conversational, like talking to a friend," "Uses storytelling and rhetorical questions").
    - **videoTone:** What is the overall tone? (e.g., "Educational but entertaining," "Humorous and lighthearted," "Serious and investigative").
    - **humorLevel:** Describe the type and frequency of humor. (e.g., "Witty and dry, uses puns sparingly," "No humor," "Uses observational comedy").
    - **keyTerminology:** List any specific, recurring words or phrases the creator uses.

    Transcript:
    ---
    ${transcript}
    ---

    Return the analysis in a JSON object. Only include the fields you are confident about. For example:
    {
      "speakingStyle": "Conversational and uses simple, direct language.",
      "videoTone": "Upbeat and encouraging.",
      "keyTerminology": "[\"keep exploring\", \"let's dive in\"]"
    }
  `;

  try {
    const analysisResultString = await callGeminiAPI(prompt);
    const analysisResult = JSON.parse(analysisResultString);

    if (analysisResult && Object.keys(analysisResult).length > 0) {
      // Get the current V2 style guide.
      const currentStyleGuide = await getV2StyleGuide(projectId);
      
      // Merge the newly learned attributes with the existing ones.
      const updatedStyleGuide = {
        ...currentStyleGuide,
        ...analysisResult, // The new findings will overwrite existing fields if they conflict.
      };

      // Save the updated V2 style guide.
      await updateV2StyleGuide(projectId, updatedStyleGuide);
      
      // Log only the fields that were changed in this refinement.
      const refinementLog = {
        ...analysisResult,
        timestamp: new Date().toISOString(),
        source: 'Transcript Analysis'
      };
      await logV2StyleGuideRefinement(projectId, refinementLog);

      console.log('--- V2 Style Guide updated successfully ---', refinementLog);
      
      if (window.showNotification) {
        window.showNotification('Successfully refined the V2 Style Guide based on your transcript.', 'success');
      }
    }
  } catch (error) {
    console.error('--- Error in learnFromTranscriptAI ---', error);
    if (window.showNotification) {
      window.showNotification('Could not automatically update the V2 Style Guide.', 'error');
    }
  }
};
