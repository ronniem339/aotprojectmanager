window.FirstCommentTask = ({ video, onUpdate, onCompletion, settings }) => {
    const { useState, useEffect } = React;
    const [firstComment, setFirstComment] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        setFirstComment(video.firstComment || '');
    }, [video]);

    const handleSave = () => {
        onUpdate({ ...video, firstComment });
    };

    const handleGenerate = async () => {
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
        Creator Persona: "${settings.creatorPersona}"

        Based on the video details, write an engaging "first comment" to post on the video. The comment should spark conversation, ask a question related to the video content, and match the creator's persona.

        Return a single JSON object with one key: "firstComment".
        Example:
        {
          "firstComment": "Your generated comment here..."
        }
        `;
        try {
            const parsedJson = await window.aiUtils.callGeminiAPI(
                prompt,
                settings.geminiApiKey,
                {},
                'generateFirstComment', // Task type
                settings.useProModel, // Pass the setting
                settings.geminiFlashModelName, // Pass the setting
                settings.geminiProModelName // Pass the setting
            );
            if (parsedJson.firstComment) {
                setFirstComment(parsedJson.firstComment);
            }
        } catch (error) {
            console.error(error);
            alert("Failed to generate first comment. Check console for details.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleComplete = () => {
        handleSave();
        onCompletion(video.id, 'firstComment', { firstComment });
    };

    return (
        <div className="bg-gray-800 p-4 rounded-lg space-y-4">
            <h3 className="text-lg font-bold">First Comment</h3>
            <button onClick={handleGenerate} disabled={isGenerating} className="btn-secondary w-full">
                {isGenerating ? 'Generating...' : 'Generate with AI'}
            </button>
            <div>
                <label className="block text-sm font-medium mb-1">Comment Text</label>
                <textarea
                    value={firstComment}
                    onChange={(e) => setFirstComment(e.target.value)}
                    onBlur={handleSave}
                    rows="4"
                    className="form-textarea w-full bg-gray-700"
                    placeholder="The first comment to pin on your video..."
                />
            </div>
            <button onClick={handleComplete} className="btn-primary w-full">Mark as Complete</button>
        </div>
    );
};
