import { callGeminiAPI } from '../core/callGeminiAPI.js';
// MODIFICATION: Added logStyleGuideRefinement to imports. I'll assume this function exists in your db utility.
import { getStyleGuide, updateStyleGuide, logStyleGuideRefinement } from '../../../db.js';

/**
 * Analyzes a transcript to learn about the user's style and updates the style guide.
 * This runs as a secondary, non-blocking process.
 *
 * @param {string} transcript The user's transcript.
 * @param {string} projectId The ID of the current project.
 */
export const learnFromTranscriptAI = async (transcript, projectId) => {
  console.log('--- learnFromTranscriptAI process started ---');

  const prompt = `
    Analyze the following transcript to understand the user's communication style, personality, and expertise.
    Based on this analysis, you will update two key areas: the "style guide" and the "who am I" knowledge base.

    - The "style guide" should capture the user's tone, common phrases, sentence structure, and sense of humor.
    - The "who am I" section should describe the user's personality, their areas of expertise, and their unique perspective.

    Transcript:
    ---
    ${transcript}
    ---

    Based on your analysis, provide a JSON object with the updated "who_am_i" and "style_guide" fields.
    For example:
    {
      "who_am_i": "The creator is a knowledgeable and enthusiastic expert in vintage synthesizers. They have a friendly and approachable demeanor, often using humor to explain complex topics. They are passionate about preserving the history of electronic music.",
      "style_guide": "The creator's style is conversational and educational. They use rhetorical questions to engage the audience and often use analogies to simplify technical details. They have a recurring sign-off: 'Stay creative and keep innovating.'"
    }
  `;

  try {
    const analysisResultString = await callGeminiAPI(prompt);
    const analysisResult = JSON.parse(analysisResultString);

    if (analysisResult && analysisResult.style_guide && analysisResult.who_am_i) {
      const currentStyleGuide = await getStyleGuide(projectId);
      
      const updatedStyleGuide = {
        ...currentStyleGuide,
        whoAmI: analysisResult.who_am_i,
        styleGuide: analysisResult.style_guide,
      };

      await updateStyleGuide(projectId, updatedStyleGuide);
      
      // MODIFICATION: Log the refinement.
      const refinementLog = {
        whoAmI: analysisResult.who_am_i,
        styleGuide: analysisResult.style_guide,
        timestamp: new Date().toISOString(), // Use ISO string for consistent formatting.
        source: 'Transcript Analysis'
      };
      await logStyleGuideRefinement(projectId, refinementLog);

      console.log('--- Style guide and who am I knowledge base updated successfully ---');
      
      if (window.showNotification) {
        window.showNotification('Style guide and "who am I" knowledge base have been updated based on your transcript.', 'success');
      }
    }
  } catch (error) {
    console.error('--- Error in learnFromTranscriptAI ---', error);
    if (window.showNotification) {
      window.showNotification('Could not automatically update the style guide.', 'error');
    }
  }
};
