// creators-hub/js/components/ProjectView/tasks/ThumbnailTask.js

window.ThumbnailTask = ({ video, settings, onUpdateTask, isLocked, project }) => {
    const { useState, useEffect } = React;
    const [generating, setGenerating] = useState(false);
    // Initialize from the correct location in the video's tasks object
    const [ideas, setIdeas] = useState(video.tasks?.generatedThumbnails || []);
    const [error, setError] = useState('');
    const [finalUrl, setFinalUrl] = useState(video.thumbnailUrl || '');

    // Effect to update local state if the video prop changes from elsewhere
    useEffect(() => {
        setIdeas(video.tasks?.generatedThumbnails || []);
        setFinalUrl(video.thumbnailUrl || '');
    }, [video.tasks?.generatedThumbnails, video.thumbnailUrl]);

    const handleGenerateIdeas = async () => {
        setGenerating(true);
        setError('');

        // Get the Thumbnail Ideas knowledge base from settings.
        const thumbnailKnowledgeBase = settings?.knowledgeBases?.youtube?.thumbnailIdeas || 'Design compelling, high-CTR thumbnails.';

        // The prompt is updated to use the knowledge base.
        const prompt = `
            **CONTEXT: THUMBNAIL BEST PRACTICES**
            ${thumbnailKnowledgeBase}

            ---

            **YOUR TASK**
            You are a viral YouTube thumbnail designer. Following the best practices outlined in the context above, generate 4 distinct, compelling thumbnail ideas for the following video.
            For each idea, provide a detailed description of the visuals, text, and overall mood.

            **VIDEO DETAILS**
            - Video Title: "${video.chosenTitle || video.title}"
            - Video Concept: "${video.concept}"

            Return a valid JSON object like: {"ideas": ["Detailed description of idea 1...", "Detailed description of idea 2...", ...]}.
        `;
        try {
            const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings);
            const generatedIdeas = parsedJson.ideas || [];
            setIdeas(generatedIdeas);
            // Use the standard onUpdateTask function to save progress
            onUpdateTask('thumbnailsGenerated', 'in-progress', { 'tasks.generatedThumbnails': generatedIdeas });

        } catch (err) {
            setError(`Failed to generate ideas: ${err.message}`);
        } finally {
            setGenerating(false);
        }
    };

    const handleSave = () => {
        // Use onUpdateTask to save the final URL and mark the task as complete
        onUpdateTask('thumbnailsGenerated', 'complete', { thumbnailUrl: finalUrl, 'tasks.generatedThumbnails': ideas });
    };

    if (isLocked) {
        return <p className="text-gray-400 text-center py-2 text-sm">Please complete the previous steps first.</p>;
    }
    
    return (
        <div className="task-content space-y-4">
            <button onClick={handleGenerateIdeas} disabled={generating} className="button-primary-small w-full justify-center">
                {generating ? <window.LoadingSpinner isButton={true} /> : '🤖 Generate Thumbnail Ideas'}
            </button>
            {error && <p className="error-message">{error}</p>}
            {ideas.length > 0 && (
                <div className="mt-4 space-y-3">
                    <h4 className="font-semibold text-sm">Generated Ideas:</h4>
                    {ideas.map((idea, i) => (
                        <div key={i} className="p-3 bg-gray-800/50 rounded-md text-sm">{idea}</div>
                    ))}
                </div>
            )}
            <div className="mt-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">Final Thumbnail URL</label>
                <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Paste URL of final thumbnail image"
                    value={finalUrl}
                    onChange={(e) => setFinalUrl(e.target.value)}
                />
            </div>
            <div className="pt-6 border-t border-gray-700 text-center">
                <button onClick={handleSave} disabled={!finalUrl} className="w-full max-w-xs mx-auto px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg font-semibold text-white disabled:bg-gray-500 disabled:cursor-not-allowed">
                    Save URL and Mark Complete
                </button>
            </div>
        </div>
    );
};
