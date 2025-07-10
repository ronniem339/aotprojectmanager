// creators-hub/js/components/ProjectView/tasks/TagsTask.js

window.TagsTask = ({ video, settings, onUpdateTask, isLocked, project }) => {
    const { useState, useEffect } = React;
    const [tags, setTags] = useState([]);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState('');
    const [copySuccess, setCopySuccess] = useState('');

    useEffect(() => {
        try {
            const metadata = (typeof video.metadata === 'string' && video.metadata)
                ? JSON.parse(video.metadata)
                : video.metadata || {};

            if (metadata.tags && Array.isArray(metadata.tags)) {
                setTags(metadata.tags);
            }
        } catch (e) {
            console.error("Failed to parse video metadata for tags:", e);
        }
    }, [video.metadata]);

    const handleGenerateTags = async () => {
        setGenerating(true);
        setError('');
        setCopySuccess('');

        const tagsKnowledgeBase = settings?.knowledgeBases?.youtube?.videoTags || 'Generate relevant SEO tags.';

        let bestContext = video.concept || '';
        if (video.metadata?.description) {
            bestContext = video.metadata.description;
        }
        if (video.full_video_script_text) {
            bestContext = video.full_video_script_text;
        }

        const prompt = `
            **YOUR TASK**
            You are a YouTube SEO expert. Your mission is to generate a comprehensive and highly strategic list of YouTube tags for a video, aiming to use as much of the 500-character limit as possible without exceeding it.

            **CRITICAL INSTRUCTIONS**
            1.  **Maximize Character Count:** Generate a large number of diverse tags.
            2.  **Diverse Tag Types:** Your list MUST include a mix of the following:
                - **Broad Tags:** High-level topics (e.g., "travel guide", "history documentary").
                - **Specific, Long-Tail Tags:** Detailed phrases directly from the video content (e.g., "best food in florence italy", "how to use a gopro hero 12").
                - **Synonyms & Variations:** Alternative ways people might search for the topic.
                - **Common Misspellings:** Include common, plausible misspellings of key terms (e.g., "florece" for "florence").
            3.  **Prioritize Relevance:** All tags must be highly relevant to the video content.

            ---

            **CONTEXT: TAGGING BEST PRACTICES**
            ${tagsKnowledgeBase}

            ---

            **VIDEO DETAILS**
            - **Video Title:** "${video.chosenTitle || video.title}"
            - **Video Content:** "${bestContext}"

            ---

            **OUTPUT FORMAT**
            Return the tags as a single JSON array. The combined length of all tags plus commas should be as close to 500 characters as possible.
            Example: {"tags": ["tag1", "tag2", "tag3", ...]}
        `;

        try {
            const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings, {});
            if (parsedJson.tags && Array.isArray(parsedJson.tags)) {
                // Enforce the 500 character limit client-side as a safeguard
                let finalTags = [];
                let totalLength = 0;
                for (const tag of parsedJson.tags) {
                    // YouTube counts the comma as a character
                    const tagLength = tag.length + 1; 
                    if (totalLength + tagLength <= 500) {
                        finalTags.push(tag);
                        totalLength += tagLength;
                    } else {
                        break; // Stop if we exceed the limit
                    }
                }
                setTags(finalTags);
                onUpdateTask('tagsGenerated', 'in-progress', { 'metadata.tags': finalTags });
            }
        } catch (err) {
            setError(`Error generating tags: ${err.message}`);
            console.error(err);
        } finally {
            setGenerating(false);
        }
    };

    const handleRemoveTag = (indexToRemove) => {
        const newTags = tags.filter((_, index) => index !== indexToRemove);
        setTags(newTags);
        onUpdateTask('tagsGenerated', 'in-progress', { 'metadata.tags': newTags });
    };

    const handleCopyTags = () => {
        const tagsString = tags.join(', ');
        navigator.clipboard.writeText(tagsString).then(() => {
            setCopySuccess('Copied!');
            setTimeout(() => setCopySuccess(''), 2000);
        }, (err) => {
            console.error('Could not copy tags: ', err);
            setCopySuccess('Failed!');
            setTimeout(() => setCopySuccess(''), 2000);
        });
    };

    const handleSave = () => {
        onUpdateTask('tagsGenerated', 'complete', { 'metadata.tags': tags });
    };

    if (isLocked) {
        return <p className="text-gray-400 text-center py-2 text-sm">Please complete the previous steps first.</p>;
    }

    return (
        <div className="task-container">
            <div className="task-content space-y-4">
                <button onClick={handleGenerateTags} disabled={generating} className="btn btn-primary btn-sm w-full justify-center">
                    {generating ? <window.LoadingSpinner isButton={true}/> : '🤖 Generate Tags'}
                </button>
                {error && <p className="error-message">{error}</p>}
                
                {tags.length > 0 && (
                    <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 space-y-4">
                        <div className="flex flex-wrap gap-2">
                            {tags.map((tag, index) => (
                                <div key={index} className="flex items-center bg-gray-700 rounded-full px-3 py-1 text-sm font-medium text-white">
                                    <span>{tag}</span>
                                    <button 
                                        onClick={() => handleRemoveTag(index)} 
                                        className="ml-2 text-gray-400 hover:text-white"
                                        aria-label={`Remove ${tag}`}
                                    >
                                        &times;
                                    </button>
                                </div>
                            ))}
                        </div>
                        
                        <div className="pt-4 border-t border-gray-600 flex items-center justify-end gap-4">
                            <button onClick={handleCopyTags} className="btn btn-secondary btn-sm">
                                {copySuccess || '📋 Copy All Tags'}
                            </button>
                        </div>
                    </div>
                )}

                <div className="pt-6 border-t border-gray-700 text-center">
                    <button 
                        onClick={handleSave} 
                        disabled={generating || tags.length === 0} 
                        className="w-full max-w-xs mx-auto px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg font-semibold text-white disabled:bg-gray-500 disabled:cursor-not-allowed"
                    >
                        Confirm Tags & Mark Complete
                    </button>
                </div>
            </div>
        </div>
    );
};
