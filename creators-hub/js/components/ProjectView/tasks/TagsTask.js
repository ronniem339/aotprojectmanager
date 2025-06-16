// js/components/ProjectView/tasks/TagsTask.js

window.TagsTask = ({ video, settings, onUpdateTask, isLocked }) => {
    const { useState, useEffect, useMemo } = React;
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState('');
    const [editableTags, setEditableTags] = useState('');

    const metadata = useMemo(() => {
        try {
            return video.metadata ? JSON.parse(video.metadata) : {};
        } catch { return {}; }
    }, [video.metadata]);

    useEffect(() => {
        setEditableTags(metadata.tags || '');
        setError('');
    }, [video.id, metadata]);

    const handleGenerateTags = async () => {
        setGenerating(true);
        setError('');
        const prompt = `Act as a YouTube SEO expert. Based on the video script, title, and description, generate a comma-separated list of 20-30 SEO tags.
Video Title: "${video.chosenTitle}"
Video Description:
---
${metadata.description || video.concept}
---
YouTube Tagging Guidelines: "${settings.knowledgeBases?.youtube?.videoTags || 'Use a mix of broad and specific long-tail keywords.'}"

Return a JSON object with one key: "tags" (a single string of comma-separated tags).`;

        try {
            const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings.geminiApiKey);
            if (parsedJson.tags) {
                setEditableTags(parsedJson.tags);
            }
        } catch (err) {
            setError(`Failed to generate tags: ${err.message}`);
        } finally {
            setGenerating(false);
        }
    };

    const handleConfirmTags = () => {
        const newMetadata = { ...metadata, tags: editableTags };
        onUpdateTask('tagsGenerated', 'complete', { 
            metadata: JSON.stringify(newMetadata) 
        });
    };

    if (isLocked) {
        return <p className="text-gray-400 text-center py-2 text-sm">Please complete previous steps first.</p>;
    }
    
    if (video.tasks?.tagsGenerated === 'complete') {
        return (
            <div>
                 <textarea readOnly value={editableTags} rows="5" className="w-full form-textarea bg-gray-800/50 resize-y"/>
                 <div className="text-right mt-2">
                    <window.CopyButton textToCopy={editableTags} />
                 </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <textarea 
                value={editableTags} 
                onChange={(e) => setEditableTags(e.target.value)} 
                rows="5" 
                className="w-full form-textarea bg-gray-800/50 resize-y"
                placeholder="Click generate, or manually enter your comma-separated tags here..."
            />
            <div className="flex justify-between items-center">
                <button onClick={handleGenerateTags} disabled={generating} className="px-4 py-2 text-sm bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold disabled:opacity-75">
                    {generating ? <window.LoadingSpinner isButton={true} /> : '✨ Generate Tags'}
                </button>
                <button onClick={handleConfirmTags} disabled={!editableTags} className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 rounded-lg font-semibold disabled:opacity-75">
                    Confirm Tags
                </button>
            </div>
            {error && <p className="text-red-400 mt-2 text-sm text-right">{error}</p>}
        </div>
    );
};
