// creators-hub/js/utils/ai/blog.js
(function(window) {
    "use strict";

    if (!window.aiUtils) {
        console.error("aiUtils.core.js must be loaded first.");
        return;
    }

    /**
     * Generates blog post ideas based on a project's data.
     * @param {object} projectData - The data object for the project.
     * @param {object} settings - The user's settings, including blog style.
     * @returns {Promise<object>} - An object containing a list of blog post ideas.
     */
    async function generateBlogPostIdeasAI(projectData, settings) {
        const prompt = `You are a content strategist. Based on the following YouTube project data and brand settings, generate 5 distinct blog post ideas that repurpose the video content for a blog.

Project Data:
---
Title: ${projectData.title}
Description: ${projectData.description}
Video Count: ${projectData.videos.length}
---

Brand Settings:
---
Blog Style: ${settings.blogStyle || 'Informative and helpful'}
Target Audience: ${settings.targetAudience || 'General audience'}
---

For each blog post idea, provide a compelling headline and a short paragraph explaining the angle and what the post will cover.

Respond with a JSON object:
{
    "blog_ideas": [
        {
            "headline": "Blog Post Headline 1",
            "angle": "A summary of the key concepts discussed in the blog post."
        },
        {
            "headline": "Blog Post Headline 2",
            "angle": "A different perspective or a deep dive into one aspect of the video."
        }
    ]
}`;
        return window.aiUtils.callGeminiAPI(prompt);
    }


    // Expose functions
    Object.assign(window.aiUtils, {
        generateBlogPostIdeasAI
    });

})(window);
