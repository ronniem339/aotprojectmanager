// js/components/ProjectView/tasks/ThumbnailTask.js

window.ThumbnailTask = ({ video, onUpdate, onCompletion, project, settings }) => {
    const { useState } = React;
    const [generating, setGenerating] = useState(false);
    const [ideas, setIdeas] = useState(video.generatedThumbnails || []);
    const [error, setError] = useState('');
    const [finalUrl, setFinalUrl] = useState(video.thumbnailUrl || '');

    const handleGenerateIdeas = async () => {
        setGenerating(true);
        setError('');
        const prompt = `You are a viral YouTube thumbnail designer.
        Based on the video title and concept, generate 4 distinct, compelling thumbnail ideas.
        For each idea, provide a detailed description of the visuals, text, and overall mood.
        Video Title: "${video.chosenTitle || video.title}"
        Video Concept: "${video.concept}"
        Return a valid JSON object like: {"ideas": ["Detailed description of idea 1...", "Detailed description of idea 2...", ...]}.`;
        try {
            // FIXED: Pass the 'settings' object
            const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings);
            setIdeas(parsedJson.ideas || []);
            onUpdate({ ...video, generatedThumbnails: parsedJson.ideas || [] });

        } catch (err) {
            setError(`Failed to generate ideas: ${err.message}`);
        } finally {
            setGenerating(false);
        }
    };

    const handleSave = () => {
        onUpdate({ ...video, thumbnailUrl: finalUrl });
        onCompletion(true);
    };
    
    return (
        <div className="task-container">
            <h3 className="task-title">Generate Thumbnails</h3>
             {video.tasks.thumbnailsGenerated === 'complete' && <span className="task-badge-complete">✓ Completed</span>}
            <div className="task-content">
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
                        onChange={(e) => {
                            setFinalUrl(e.target.value);
                            onCompletion(false);
                        }}
                    />
                </div>
                <button onClick={handleSave} disabled={!finalUrl} className="button-secondary-small mt-4 w-full justify-center">
                    Save URL and Mark Complete
                </button>
            </div>
        </div>
    );
};
