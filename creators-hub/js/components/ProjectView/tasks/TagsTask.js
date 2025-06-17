window.TagsTask = ({ video, onUpdate, onCompletion, settings }) => {
    const { useState, useEffect } = React;
    const [tags, setTags] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        setTags(video.tags || []);
    }, [video]);

    const handleTagsChange = (newTags) => {
        setTags(newTags);
        onUpdate({ ...video, tags: newTags });
    };
    
    const handleGenerateTags = async () => {
        setIsGenerating(true);
        const apiKey = settings.geminiApiKey;
        if (!apiKey) {
            alert("Please set Gemini API key in settings.");
            setIsGenerating(false);
            return;
        }

        const prompt = `
        Video Title: "${video.title}"
        Video Description:
        ---
        ${video.description}
        ---
        Existing Tags: ${tags.join(', ')}

        Analyze the video title and description. Generate a list of 20-30 relevant YouTube tags (keywords). Include a mix of broad, specific, and long-tail keywords. Do not repeat the existing tags.

        Return a single JSON object with one key: "tags", which is an array of strings.
        Example:
        {
          "tags": ["new tag 1", "new tag 2", "another relevant keyword"]
        }
        `;
        try {
            const parsedJson = await window.aiUtils.callGeminiAPI(
                prompt,
                settings.geminiApiKey,
                {},
                'generateTags', // Task type
                settings.useProModel, // Pass the setting
                settings.geminiFlashModelName, // Pass the setting
                settings.geminiProModelName // Pass the setting
            );
            if (parsedJson.tags) {
                const combinedTags = [...new Set([...tags, ...parsedJson.tags])];
                handleTagsChange(combinedTags);
            }
        } catch (err) {
            console.error(err);
            alert("Failed to generate tags. Check console for details.");
        } finally {
            setIsGenerating(false);
        }
    };


    const handleComplete = () => {
        onUpdate({ ...video, tags }); // Ensure latest state is saved
        onCompletion(video.id, 'tags', { tags });
    };

    return (
        <div className="bg-gray-800 p-4 rounded-lg space-y-4">
            <h3 className="text-lg font-bold">Tags / Keywords</h3>
            <button onClick={handleGenerateTags} disabled={isGenerating} className="btn-secondary w-full">
                 {isGenerating ? 'Generating...' : 'Generate with AI'}
            </button>
            <window.common.EditableTagList tags={tags} onTagsChange={handleTagsChange} />
            <button onClick={handleComplete} className="btn-primary w-full">Mark as Complete</button>
        </div>
    );
};
