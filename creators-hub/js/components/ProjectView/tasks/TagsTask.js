// creators-hub/js/components/ProjectView/tasks/TagsTask.js

window.TagsTask = ({ video, settings, onUpdateTask, isLocked, project }) => {
    const { useState, useEffect } = React;
    const [tags, setTags] = useState([]);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState('');
    const [copySuccess, setCopySuccess] = useState(''); // For "Copied!" feedback

    // Load existing tags from metadata when the component loads or video changes.
    useEffect(() => {
        try {
            // FIX: Check if metadata is a string before parsing.
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

        // Re-applying the metadata parsing fix here as well to be safe.
        const currentMetadata = (typeof video.metadata === 'string' && video.metadata)
            ? JSON.parse(video.metadata)
            : video.metadata || {};
        const description = currentMetadata.description || '';

        const prompt = `You are a YouTube SEO expert. Based on the video title and description, generate a list of 15-20 relevant SEO tags.
        Include a mix of broad and specific long-tail keywords.
        Video Title: "${video.chosenTitle || video.title}"
        Video Description: "${description}"
        Return the tags as a JSON array like: {"tags": ["tag1", "tag2", "tag3", ...]}.`;

        try {
            const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings, {});
            if (parsedJson.tags && Array.isArray(parsedJson.tags)) {
                setTags(parsedJson.tags);
                // Also update the task status to in-progress when tags are generated.
                onUpdateTask('tagsGenerated', 'in-progress', { 'metadata.tags': parsedJson.tags });
            }
        } catch (err) {
            setError(`Error generating tags: ${err.message}`);
            console.error(err);
        } finally {
            setGenerating(false);
        }
    };

    // NEW: Function to remove a tag.
    const handleRemoveTag = (indexToRemove) => {
        const newTags = tags.filter((_, index) => index !== indexToRemove);
        setTags(newTags);
        // Persist the change immediately.
        onUpdateTask('tagsGenerated', 'in-progress', { 'metadata.tags': newTags });
    };

    // NEW: Function to copy all tags to the clipboard.
    const handleCopyTags = () => {
        const tagsString = tags.join(', ');
        navigator.clipboard.writeText(tagsString).then(() => {
            setCopySuccess('Copied!');
            setTimeout(() => setCopySuccess(''), 2000); // Reset after 2 seconds
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
                <button onClick={handleGenerateTags} disabled={generating} className="button-primary-small w-full justify-center">
                    {generating ? <window.LoadingSpinner isButton={true}/> : '🤖 Generate Tags'}
                </button>
                {error && <p className="error-message">{error}</p>}
                
                {/* NEW: UI for displaying and managing tags */}
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
                            <button onClick={handleCopyTags} className="button-secondary-small">
                                {copySuccess || '📋 Copy All Tags'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Final Save Button */}
                <div className="pt-6 border-t border-gray-700 text-center">
                    <button onClick={handleSave} disabled={generating} className="w-full max-w-xs mx-auto px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg font-semibold text-white">
                        Confirm Tags & Mark Complete
                    </button>
                </div>
            </div>
        </div>
    );
};
