window.aiUtils = window.aiUtils || {};

/**
 * Generates blog post ideas from a variety of sources (text, video).
 * It automatically includes hotel-monetized ideas if a destination is detected.
 */
window.aiUtils.generateBlogIdeasAI = async ({ topic, destination, video, settings }) => {
    const styleGuidePrompt = window.aiUtils.getStyleGuidePrompt(settings);

    let context_prompt = "";

    if (video) {
        if (video.transcript) {
            context_prompt = `**Primary Content Source (Video Transcript):**\n"""\n${video.transcript.substring(0, 4000)}\n"""\nThis video is about "${video.title}". From this transcript, identify the primary destination and key topics to generate blog post ideas.`;
        } else {
            const videoConcept = video.concept || video.description || '';
            context_prompt = `**Primary Content Source (Video Details):**\n- Video Title: "${video.title}"\n- Video Concept/Description: "${videoConcept}"\n\nBased on these video details, identify the core themes, locations, and topics to generate relevant blog post ideas.`;
        }
    } else {
        context_prompt = `**Primary Content Source (User Input):**\n- Destination: "${destination || 'Not specified'}"\n- General Topic: "${topic}"`;
    }

    const prompt = `You are an expert SEO content strategist for a travel blog.
Your task is to generate a list of 10-15 highly specific and compelling blog post ideas based on the provided content source.

${context_prompt}

${styleGuidePrompt}

**Your Task & Output Instructions:**
1.  Analyze the provided content source to understand the core themes, locations, and topics.
2.  Generate 10-15 blog post ideas. The ideas should be a mix of post types (e.g., Listicle Post, Destination Guide, How-To Guide, Personal Story).
3.  **Hotel-Specific Ideas:** If a specific destination is mentioned or can be inferred, you MUST include 2-4 ideas that are hotel-focused listicles. These should target different traveler types (e.g., "Best Budget Hostels," "Most Romantic Boutique Hotels," "Top Family-Friendly Resorts"). For these specific hotel listicles, the "monetizationOpportunities" field should be "Hotel affiliate links."
4.  For all other ideas, suggest 1-3 clear, actionable monetization opportunities (e.g., "Affiliate links for hiking gear," "Sponsored post by a local cafe," "Digital travel guide for sale").
5.  Each idea must be SEO-optimized with a compelling, clickable title.
6.  Your response MUST be a valid JSON object with a single key "ideas" which is an array of blog post idea objects. Each object must have the keys: "title", "description", "primaryKeyword", "postType", "monetizationOpportunities".
7.  **CRITICAL OUTPUT FORMAT:** This is legacy, but for this call, please wrap your entire JSON object in "~~~json" and "~~~" delimiters.
`;

    try {
        const rawResponseText = await window.aiUtils.callGeminiAPI(prompt, settings, { responseMimeType: "text/plain" }, true);
        const jsonBlockRegex = /~~~\s*json\s*\n([\s\S]*?)\n\s*~~~/;
        const match = rawResponseText.match(jsonBlockRegex);
        if (match && match[1]) {
            const parsedJson = JSON.parse(match[1]);
            if (parsedJson && Array.isArray(parsedJson.ideas)) {
                return parsedJson.ideas;
            }
        }
        throw new Error("AI returned an invalid format for blog post ideas.");
    } catch (error) {
        console.error("Error generating blog post ideas:", error);
        throw new Error(`AI failed to generate ideas: ${error.message || error}`);
    }
};
