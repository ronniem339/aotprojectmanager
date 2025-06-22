// js/components/ProjectView/tasks/TagsTask.js

window.TagsTask = ({ video, settings, onUpdateTask, isLocked, project }) => {
    const { useState, useEffect } = React;
    const [tags, setTags] = useState([]);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        try {
            // FIX: Check if metadata is a string before parsing. If it's an object, use it directly.
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
        try {
            const result = await window.aiUtils.generateKeywordsAI({
                title: video.chosenTitle || video.title,
                concept: video.concept,
                locationsFeatured: video.locations_featured,
                projectTitle: project.playlistTitle,
                projectDescription: project.playlistDescription,
                settings: settings,
            });

            const uniqueTags = [...new Set(result)].join(', ');
            setTags(uniqueTags);

            // Immediately save the generated tags and set status to 'in-progress'
            const currentMeta = video.metadata ? JSON.parse(video.metadata) : {};
            const newMeta = JSON.stringify({ ...currentMeta, tags: uniqueTags });
            onUpdateTask('tagsGenerated', 'in-progress', { metadata: newMeta });

        } catch (err) {
            console.error("Error generating tags:", err);
            setError(`Failed to generate tags: ${err.message}`);
        } finally {
            setGenerating(false);
        }
    };

    const handleSave = () => {
        try {
            const currentMeta = video.metadata ? JSON.parse(video.metadata) : {};
            // Update the tags property within the metadata object
            const newMeta = JSON.stringify({ ...currentMeta, tags });
            // Save the updated metadata and mark the task as complete
            onUpdateTask('tagsGenerated', 'complete', { metadata: newMeta });
        } catch (e) {
            console.error("Failed to parse and update metadata:", e);
            setError("Could not save tags due to a metadata issue.");
        }
    };

    // Locks the component until the previous task is complete
    if (isLocked) {
        return <p className="text-gray-400 text-center py-2 text-sm">Please finalize the chapters first.</p>;
    }

    const isComplete = video.tasks.tagsGenerated === 'complete';

    return (
        <div className="task-container">
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
