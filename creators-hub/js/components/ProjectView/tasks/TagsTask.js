// js/components/ProjectView/tasks/TagsTask.js

window.TagsTask = ({ video, onUpdate, onCompletion, project, settings }) => {
    const { useState } = React;
    const [generating, setGenerating] = useState(false);
    const [tags, setTags] = useState(video.metadata?.tags || '');
    const [error, setError] = useState('');

    const handleGenerateTags = async () => {
        setGenerating(true);
        setError('');
        try {
            // FIXED: Pass the entire 'settings' object instead of just the apiKey.
            const result = await window.aiUtils.generateKeywordsAI({
                title: video.title,
                concept: video.concept,
                locationsFeatured: video.locations_featured,
                projectTitle: project.playlistTitle,
                projectDescription: project.playlistDescription,
                settings: settings, // This is the corrected part
            });

            const uniqueTags = [...new Set(result)].join(', ');
            setTags(uniqueTags);

        } catch (err) {
            console.error("Error generating tags:", err);
            setError(`Failed to generate tags: ${err.message}`);
        } finally {
            setGenerating(false);
        }
    };

    const handleSave = () => {
        const updatedVideo = { 
            ...video, 
            metadata: { ...video.metadata, tags: tags }
        };
        onUpdate(updatedVideo);
        if (tags && tags.trim().length > 0) {
            onCompletion(true);
        }
    };

    const isComplete = video.tasks.tagsGenerated === 'complete';

    return (
        <div className="task-container">
            <h3 className="task-title">Generate Tags</h3>
            {isComplete && <span className="task-badge-complete">✓ Completed</span>}
            <div className="task-content">
                <p className="task-description">Generate a list of SEO-optimized tags based on the video's content, title, and description.</p>
                <button onClick={handleGenerateTags} disabled={generating} className="button-primary-small w-full justify-center">
                    {generating ? <window.LoadingSpinner isButton={true} /> : '🤖 Generate Tag Suggestions'}
                </button>
                {error && <p className="error-message">{error}</p>}
                <textarea
                    className="form-textarea mt-4 h-32"
                    value={tags}
                    onChange={(e) => {
                        setTags(e.target.value);
                        onCompletion(false); // Mark as incomplete if user edits
                    }}
                    placeholder="e.g., travel vlog, cyprus travel, what to do in limassol..."
                />
                <button onClick={handleSave} className="button-secondary-small mt-4 w-full justify-center">
                    {isComplete ? 'Save Changes' : 'Save and Mark Complete'}
                </button>
            </div>
        </div>
    );
};
