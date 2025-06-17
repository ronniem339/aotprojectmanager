window.ChaptersTask = ({ video, onUpdate, onCompletion, settings }) => {
    const { useState, useEffect } = React;
    const [chapters, setChapters] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        setChapters(video.chapters?.join('\n') || '');
    }, [video]);

    const handleSave = () => {
        const updatedVideo = {
            ...video,
            chapters: chapters.split('\n').filter(Boolean)
        };
        onUpdate(updatedVideo);
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
        Video Script:
        ---
        ${video.script || 'No script provided.'}
        ---

        Based on the provided video script, generate a list of YouTube video chapters (timestamps).
        The chapters should identify the main sections of the video from the script.

        Return a single JSON object with one key: "chapters" (an array of strings in "HH:MM:SS - Chapter Title" format).
        Example:
        {
          "chapters": ["00:00 - Intro", "01:23 - Main Topic", "05:10 - Conclusion"]
        }
        `;
        try {
            const parsedJson = await window.aiUtils.callGeminiAPI(
                prompt,
                settings.geminiApiKey,
                {},
                'generateChapters', // Task type
                settings.useProModel, // Pass the setting
                settings.geminiFlashModelName, // Pass the setting
                settings.geminiProModelName // Pass the setting
            );
            if (parsedJson.chapters) {
                setChapters(parsedJson.chapters.join('\n'));
            }
        } catch (err) {
            console.error(err);
            alert("Failed to generate chapters. Check console for details.");
        } finally {
            setIsGenerating(false);
        }
    };


    const handleComplete = () => {
        handleSave();
        onCompletion(video.id, 'chapters', { chapters: chapters.split('\n').filter(Boolean) });
    };

    return (
        <div className="bg-gray-800 p-4 rounded-lg space-y-4">
            <h3 className="text-lg font-bold">Chapters</h3>
            <button onClick={handleGenerate} disabled={isGenerating} className="btn-secondary w-full">
                {isGenerating ? 'Generating...' : 'Generate with AI'}
            </button>
            <div>
                <label className="block text-sm font-medium mb-1">Chapters (one per line)</label>
                <textarea
                    value={chapters}
                    onChange={(e) => setChapters(e.target.value)}
                    onBlur={handleSave}
                    rows="5"
                    className="form-textarea w-full bg-gray-700"
                    placeholder="00:00 - Intro..."
                />
            </div>
            <button onClick={handleComplete} className="btn-primary w-full">Mark as Complete</button>
        </div>
    );
};
