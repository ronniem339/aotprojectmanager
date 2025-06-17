// creators-hub/js/utils/ai/youtube.js
(function(window) {
    "use strict";

    if (!window.aiUtils) {
        console.error("aiUtils.core.js must be loaded first.");
        return;
    }

    /**
     * Generates YouTube keywords (tags) for a video.
     * @param {string} videoConcept - The concept of the video.
     * @param {string} script - The video script.
     * @returns {Promise<object>} - An object containing an array of keywords.
     */
    async function generateKeywordsAI(videoConcept, script) {
        const prompt = `Analyze the video concept and script to generate a list of 20-30 relevant YouTube keywords (tags). Include a mix of broad and specific terms.

Video Concept:
---
${videoConcept}
---

Script:
---
${script.substring(0, 4000)}
---

Respond with a JSON object with a single key "keywords" which is an array of strings.
{
  "keywords": ["keyword1", "keyword2", "keyword3", ...]
}`;

        return window.aiUtils.callGeminiAPI(prompt);
    }

    /**
     * Extracts all necessary YouTube metadata from a video concept and script.
     * @param {string} videoConcept - The concept of the video.
     * @param {string} script - The video script.
     * @returns {Promise<object>} - An object containing title, description, and tags.
     */
    async function extractVideoMetadataAI(videoConcept, script) {
        const prompt = `From the video concept and script, generate optimized metadata for a YouTube video. Create 3 title variations, a compelling description, and a list of relevant tags.

Video Concept:
---
${videoConcept}
---

Script:
---
${script.substring(0, 8000)}
---

Respond with a JSON object with the following structure:
{
  "titles": [
    "Catchy Title Option 1",
    "SEO-friendly Title Option 2",
    "Intriguing Title Option 3"
  ],
  "description": "A well-written YouTube description, including a summary, timestamps (if applicable, use placeholders like 00:00), and relevant links (use placeholders like [Your Link Here]).",
  "tags": ["tag1", "tag2", "tag3"]
}`;
        return window.aiUtils.callGeminiAPI(prompt);
    }

    /**
     * Generates ideas for YouTube Shorts based on a longer video.
     * @param {string} videoTitle - The title of the main video.
     * @param {string} videoScript - The script of the main video.
     * @returns {Promise<object>} - An object containing a list of Shorts ideas.
     */
    async function generateShortsIdeasAI(videoTitle, videoScript) {
        const prompt = `Based on the following video script, generate 5 creative ideas for YouTube Shorts. Each idea should be a self-contained, engaging vertical video concept that can be derived from the main content.

Original Video Title: ${videoTitle}

Original Video Script:
---
${videoScript.substring(0, 8000)}
---

For each idea, provide a catchy title, a brief concept, and suggest the start and end point from the original script that could be used.
Respond with a JSON object:
{
  "shorts_ideas": [
    {
      "title": "Shorts Title 1",
      "concept": "A quick explanation of the most surprising fact from the video.",
      "script_segment": "The key sentences or part of the script for this short."
    }
  ]
}`;
        return window.aiUtils.callGeminiAPI(prompt);
    }

    /**
     * Generates metadata (title, description) for a specific YouTube Short idea.
     * @param {object} shortIdea - The idea object from generateShortsIdeasAI.
     * @param {string} originalVideoTitle - The title of the source video.
     * @returns {Promise<object>} - An object with metadata for the Short.
     */
    async function generateShortsMetadataAI(shortIdea, originalVideoTitle) {
        const prompt = `Generate a catchy title and a description for a YouTube Short. The short is based on the following idea, which was derived from a longer video.

Original Video Title: ${originalVideoTitle}

Short Idea:
---
Title: ${shortIdea.title}
Concept: ${shortIdea.concept}
---

The description should be concise and include relevant hashtags.
Respond with a JSON object:
{
  "title": "Final Shorts Title (max 100 characters)",
  "description": "A short, engaging description with hashtags. #shorts #[yourniche] #[relevanttopic]"
}`;
        return window.aiUtils.callGeminiAPI(prompt);
    }


    // Expose functions
    Object.assign(window.aiUtils, {
        generateKeywordsAI,
        extractVideoMetadataAI,
        generateShortsIdeasAI,
        generateShortsMetadataAI
    });

})(window);
