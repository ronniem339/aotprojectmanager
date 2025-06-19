// js/components/ProjectView/tasks/DescriptionTask.js

window.DescriptionTask = ({ video, onUpdateTask, isLocked, project, settings }) => {
    const { useState, useEffect } = React;
    // Use the description from video.metadata, which is the single source of truth
    const [description, setDescription] = useState(video.metadata?.description || '');
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState('');

    // When the video changes, update the description in the textarea
    useEffect(() => {
        setDescription(video.metadata?.description || '');
    }, [video.metadata?.description]);

    const handleGenerateDescription = async () => {
        setGenerating(true);
        setError('');
        // The prompt is improved to include project context for better results
        const prompt = `You are a YouTube SEO expert. Write an engaging and SEO-optimized YouTube description.
        It should be around 200-300 words. Include keywords naturally.
        The first 2-3 sentences are the most important for CTR.
        Video Title: "${video.chosenTitle || video.title}"
        Video Concept: "${video.concept}"
        Locations Featured: ${(video.locations_featured || []).join(', ')}
        Keywords: ${(video.targeted_keywords || []).join(', ')}
        Project Context: "${project.playlistTitle} - ${project.playlistDescription}"
        Return the description as a JSON object like: {"description": "The full text of the description..."}.`;

        try {
            const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings, {}, true); // Complex task
            const generatedDescription = parsedJson.description || '';
            setDescription(generatedDescription);
            // This updates the database immediately after generation and sets the task status to 'in-progress'
            onUpdateTask('descriptionGenerated', 'in-progress', { 'metadata.description': generatedDescription });
        } catch (err) {
            setError(`Failed to generate description: ${err.message}`);
            console.error(err);
        } finally {
            setGenerating(false);
        }
    };

    const handleSave = () => {
        // This marks the task as complete
        onUpdateTask('descriptionGenerated', 'complete', { 'metadata.description': description });
    };

    // This checks if the previous task is complete before allowing interaction
    if (isLocked) {
        return <p className="text-gray-400 text-center py-2 text-sm">Please finalize the title first.</p>;
    }

    return (
        <div className="task-container">
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
