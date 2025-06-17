// js/components/ProjectView/tasks/DescriptionTask.js

window.DescriptionTask = ({ video, onUpdate, onCompletion, project, settings }) => {
    const { useState, useEffect } = React;
    const [description, setDescription] = useState(video.metadata?.description || '');
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState('');

    const handleGenerateDescription = async () => {
        setGenerating(true);
        setError('');
        const prompt = `You are a YouTube SEO expert. Write an engaging and SEO-optimized YouTube description.
        It should be around 200-300 words. Include keywords naturally.
        The first 2-3 sentences are the most important for CTR.
        Video Title: "${video.chosenTitle || video.title}"
        Video Concept: "${video.concept}"
        Locations Featured: ${(video.locations_featured || []).join(', ')}
        Keywords: ${(video.targeted_keywords || []).join(', ')}
        Return the description as a JSON object like: {"description": "The full text of the description..."}.`;

        try {
            // FIXED: Pass the 'settings' object
            const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings, {}, true); // Complex task
            setDescription(parsedJson.description || '');
        } catch (err) {
            setError(`Failed to generate description: ${err.message}`);
        } finally {
            setGenerating(false);
        }
    };
    
    const handleSave = () => {
        onUpdate({ ...video, metadata: { ...video.metadata, description: description }});
        onCompletion(true);
    };

    return (
        <div className="task-container">
            <h3 className="task-title">Finalize Description</h3>
            {video.tasks.descriptionGenerated === 'complete' && <span className="task-badge-complete">✓ Completed</span>}
            <div className="task-content">
                <button onClick={handleGenerateDescription} disabled={generating} className="button-primary-small w-full justify-center">
                    {generating ? <window.LoadingSpinner isButton={true}/> : '🤖 Generate Description'}
                </button>
                {error && <p className="error-message">{error}</p>}
                <textarea
                    className="form-textarea mt-4 h-64"
                    value={description}
                    onChange={(e) => {
                        setDescription(e.target.value);
                        onCompletion(false);
                    }}
                    placeholder="Write or generate the video description here..."
                />
                <button onClick={handleSave} className="button-secondary-small mt-4 w-full justify-center">
                    Save and Mark Complete
                </button>
            </div>
        </div>
    );
};
