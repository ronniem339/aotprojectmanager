// creators-hub/js/components/ProjectView/tasks/DescriptionTask.js

// The component now correctly receives `studioDetails` as a prop.
window.DescriptionTask = ({ video, onUpdateTask, isLocked, project, settings, studioDetails }) => {
    const { useState, useEffect } = React;
    const [description, setDescription] = useState(video.metadata?.description || '');
    const [refinementPrompt, setRefinementPrompt] = useState('');
    const [generating, setGenerating] = useState(false);
    const [isRefining, setIsRefining] = useState(false);
    const [error, setError] = useState('');

    const socialLinks = "\n\n---\n\nINSTAGRAM: https://www.instagram.com/allout.travel\nBLOG: https://www.allout.travel";

    useEffect(() => {
        setDescription(video.metadata?.description || '');
    }, [video.metadata?.description]);

    const handleGenerateDescription = async () => {
        setGenerating(true);
        setError('');

        const whoAmI = settings?.knowledgeBases?.youtube?.whoAmI || 'I am a solo creator.';
        const styleGuideV2 = settings?.knowledgeBases?.styleV2?.detailedStyleGuide;
        const styleGuidePrompt = styleGuideV2 
            ? `\n- Brand Voice: ${styleGuideV2.brandVoice || 'Not specified'}\n- Target Audience: ${styleGuideV2.targetAudience || 'Not specified'}\n- Key-Value Props: ${styleGuideV2.keyValueProps || 'Not specified'}\n- Pacing: ${styleGuideV2.pacing || 'Not specified'}\n- Tone: ${styleGuideV2.tone || 'Not specified'}\n- Humor Level: ${styleGuideV2.humorLevel || 'Not specified'}\n- Punctuation Style: ${styleGuideV2.punctuationStyle || 'Not specified'}\n- Emoji Usage: ${styleGuideV2.emojiUsage || 'Not specified'}\n            `
            : 'No specific style guide provided.';
        const videoContentContext = video.full_video_script_text || video.concept;
        const descriptionsKnowledgeBase = settings?.knowledgeBases?.youtube?.videoDescriptions || 'No specific guidance on descriptions provided.';

        const prompt = `\n            **YOUR TASK**\n            You are a world-class YouTube SEO and copywriter. Your mission is to create a comprehensive, keyword-rich, and engaging YouTube description.\n            **The primary goal is to describe the VIDEO and its value to the VIEWER.** Do not talk excessively about the creator. Focus on what the viewer will see, learn, and experience.\n
            ---\n
            **PRIMARY CONTEXT: THE VIDEO**\n            - Video Title: "${video.chosenTitle || video.title}"\n            - Full Video Script: "${videoContentContext}"\n            - Target Keywords: ${(video.targeted_keywords || []).join(', ')}\n            - Project Context: This video is part of the "${project.playlistTitle}" series, which is about "${project.playlistDescription}".\n
            ---\n
            **CRITICAL: DESCRIPTION STRUCTURE**\n            You must follow this three-part structure precisely:\n
            **Part 1: The Hook (2-3 compelling sentences)**\n            Start with a captivating hook that makes people want to watch the video immediately. This should be the most engaging part of the description, appearing "above the fold".\n
            **Part 2: The TL;DR Summary (1-2 paragraphs)**\n            Provide a concise summary of the video's key takeaways and what the viewer will learn or experience.\n
            **Part 3: Detailed Video Walkthrough (The SEO Powerhouse)**\n            This is the most important section. Write a detailed, narrative-style walkthrough of the video's content based on the provided script. Go through it chronologically. Describe key scenes, topics discussed, questions answered, and locations visited. Your main goal here is to naturally weave in as many relevant keywords and long-tail search terms as possible from the video script. Be descriptive and thorough.\n
            ---\n
            **GUIDANCE (Less Important - for tone and style only)**\n            - Author's Note: ${whoAmI} (Write in the first-person singular: I, my, me, but keep the focus on the video's content).\n            - Detailed Style Guide: \n${styleGuidePrompt}\n            - General Rules for Descriptions: ${descriptionsKnowledgeBase}\n
            ---\n
            **OUTPUT FORMAT**\n            Return the complete description as a single string in a JSON object: {"description": "Part 1 Hook...\n\nPart 2 Summary...\n\nPart 3 Detailed Walkthrough..."}.\n        `;

        try {
            const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings, {}, true);
            let generatedDescription = parsedJson.description || '';
            
            generatedDescription += socialLinks;

            setDescription(generatedDescription);
            onUpdateTask('descriptionGenerated', 'in-progress', { 'metadata.description': generatedDescription });
        } catch (err) {
            setError(`Failed to generate description: ${err.message}`);
            console.error(err);
        } finally {
            setGenerating(false);
        }

    const handleRefineDescription = async () => {
        if (!refinementPrompt) return;
        setIsRefining(true);
        setError('');

        const separator = "\n\n---\n\n";
        let cleanDescription = description;
        if (description.includes(separator)) {
            cleanDescription = description.split(separator)[0];
        }

        const whoAmI = settings?.knowledgeBases?.youtube?.whoAmI || 'I am a solo creator.';
        const styleGuideV2 = settings?.knowledgeBases?.styleV2?.detailedStyleGuide;
        const styleGuidePrompt = styleGuideV2
            ? `\n- Brand Voice: ${styleGuideV2.brandVoice || 'Not specified'}\n- Target Audience: ${styleGuideV2.targetAudience || 'Not specified'}\n- Key-Value Props: ${styleGuideV2.keyValueProps || 'Not specified'}\n- Pacing: ${styleGuideV2.pacing || 'Not specified'}\n- Tone: ${styleGuideV2.tone || 'Not specified'}\n- Humor Level: ${styleGuideV2.humorLevel || 'Not specified'}\n- Punctuation Style: ${styleGuideV2.punctuationStyle || 'Not specified'}\n- Emoji Usage: ${styleGuideV2.emojiUsage || 'Not specified'}\n            `
            : 'No specific style guide provided.';
        const videoContentContext = video.full_video_script_text || video.concept;
        const descriptionsKnowledgeBase = settings?.knowledgeBases?.youtube?.videoDescriptions || 'No specific guidance on descriptions provided.';

        const prompt = `\n            **YOUR TASK**\n            You are a YouTube copy editor. Your primary goal is to refine a video description based on specific instructions from the creator, while preserving its core SEO structure and adhering to all style guides.\n\n            **CRITICAL: CREATOR'S INSTRUCTIONS**\n            You must follow these instructions: "${refinementPrompt}"\n\n            ---\n\n            **CONTEXT FOR THE REFINEMENT**\n\n            **Original Description to Refine:**\n            (This description follows a 3-part structure: Hook, Summary, Detailed Walkthrough)\n            ---\n            ${cleanDescription}\n            ---\n\n            **Core Video Content (for context, use this to inform your refinement):**\n            "${videoContentContext}"\n\n            **Video Title (for context):**\n            "${video.chosenTitle || video.title}"\n\n            **STYLE GUIDE (Your writing must adhere to this):**\n            - My Identity: ${whoAmI} (Write in the first-person singular: I, my, me).\n            - My Detailed Style Guide: \n${styleGuidePrompt}\n            - My Rules for Writing Descriptions: ${descriptionsKnowledgeBase}\n\n            ---\n\n            **OUTPUT**\n            Apply the user's instructions to the original description, maintaining the 3-part structure. Return only the new, refined description in a JSON object like: {"refinedDescription": "The full text of the refined description..."}.\n        `;

        try {
            const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings, {}, true);
            let refinedDescription = parsedJson.refinedDescription || '';

            if (refinedDescription) {
                refinedDescription += socialLinks;

                setDescription(refinedDescription);
                onUpdateTask('descriptionGenerated', 'in-progress', { 'metadata.description': refinedDescription });
            } else {
                 setError('The AI did not return a refined description. Please try again.');
            }
        } catch (err) {
            setError(`Failed to refine description: ${err.message}`);
            console.error(err);
        } finally {
            setIsRefining(false);
        }
    };

    const handleSave = () => {
        onUpdateTask('descriptionGenerated', 'complete', { 'metadata.description': description });
    };

    if (isLocked) {
        return <p className="text-gray-400 text-center py-2 text-sm">Please finalize the title first.</p>;
    }

    const anyLoading = generating || isRefining;

    return (
        <div className="task-container">
            <div className="task-content space-y-4">
                <button onClick={handleGenerateDescription} disabled={anyLoading} className="btn btn-primary btn-sm w-full justify-center">
                    {generating ? <window.LoadingSpinner isButton={true}/> : '🤖 Generate Description'}
                </button>
                {error && <p className="error-message">{error}</p>}

                <textarea
                    className="form-textarea h-64"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onBlur={() => onUpdateTask('descriptionGenerated', 'in-progress', { 'metadata.description': description })}
                    placeholder="Write or generate the video description here..."
                    disabled={anyLoading}
                />

                <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 space-y-3">
                    <label className="block text-sm font-medium text-gray-300">Refine Description</label>
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            className="form-input flex-grow"
                            placeholder="e.g., make it more casual, add emojis"
                            value={refinementPrompt}
                            onChange={(e) => setRefinementPrompt(e.target.value)}
                            disabled={anyLoading}
                        />
                        <button
                            onClick={handleRefineDescription}
                            disabled={anyLoading || !refinementPrompt}
                            className="btn btn-secondary btn-sm flex-shrink-0"
                        >
                            {isRefining ? <window.LoadingSpinner isButton={true}/> : '✍️ Refine'}
                        </button>
                    </div>
                </div>

                <div className="pt-6 border-t border-gray-700 text-center">
                    <button onClick={handleSave} disabled={anyLoading} className="w-full max-w-xs mx-auto px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg font-semibold text-white">
                        Confirm Description & Mark Complete
                    </button>
                </div>
            </div>
        </div>
    );
};
