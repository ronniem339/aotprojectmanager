// creators-hub/js/components/ProjectView/tasks/ThumbnailTask.js

window.ThumbnailTask = ({ video, settings, onUpdateTask, isLocked, project }) => {
    const { useState, useEffect } = React;
    const [generating, setGenerating] = useState(false);
    const [ideas, setIdeas] = useState(video.tasks?.generatedThumbnails || []);
    const [error, setError] = useState('');

    useEffect(() => {
        setIdeas(video.tasks?.generatedThumbnails || []);
    }, [video.tasks?.generatedThumbnails]);

    const handleGenerateIdeas = async () => {
        setGenerating(true);
        setError('');

        const thumbnailKnowledgeBase = settings?.knowledgeBases?.youtube?.thumbnailIdeas || 'Design compelling, high-CTR thumbnails.';

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
            onUpdateTask('thumbnailsGenerated', 'in-progress', { 'tasks.generatedThumbnails': generatedIdeas });

        } catch (err) {
            setError(`Failed to generate ideas: ${err.message}`);
        } finally {
            setGenerating(false);
        }
    };

    const handleSave = () => {
        // This button now just confirms the user has their thumbnail ready for upload.
        // The generated ideas were already saved, so we just update the status.
        onUpdateTask('thumbnailsGenerated', 'complete', {});
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
                    <h4 className="font-semibold text-sm">Use these ideas to create your thumbnail in an external tool like Canva or Photoshop.</h4>
                    {ideas.map((i, index) => (
                        <div key={index} className="p-3 bg-gray-800/50 rounded-md text-sm">{idea}</div>
                    ))}
                </div>
            )}
            
            <div className="pt-6 border-t border-gray-700 text-center">
                <p className="text-sm text-gray-400 mb-4">Once you have created your thumbnail and it's ready for upload, mark this step as complete.</p>
                <button 
                    onClick={handleSave} 
                    disabled={generating} 
                    className="w-full max-w-xs mx-auto px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg font-semibold text-white disabled:bg-gray-500"
                >
                    I Have My Thumbnail, Mark as Complete
                </button>
            </div>
        </div>
    );
};
