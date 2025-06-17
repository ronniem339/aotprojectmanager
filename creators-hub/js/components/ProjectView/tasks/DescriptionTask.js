window.DescriptionTask = ({ video, onUpdate, onCompletion, settings }) => {
    const { useState, useEffect } = React;
    const [description, setDescription] = useState('');
    const [chapters, setChapters] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [refinement, setRefinement] = useState('');

    useEffect(() => {
        setDescription(video.description || '');
        setChapters(video.chapters?.join('\n') || '');
    }, [video]);

    const handleSave = () => {
        const updatedVideo = {
            ...video,
            description,
            chapters: chapters.split('\n').filter(Boolean)
        };
        onUpdate(updatedVideo);
    };

    const handleGenerateDescription = async () => {
        setIsGenerating(true);
        const apiKey = settings.geminiApiKey;
        if (!apiKey) {
            alert("Please set Gemini API key in settings.");
            setIsGenerating(false);
            return;
        }

        const prompt = `
        Video Title: "${video.title}"
        Video Concept: "${video.concept}"
        Video Script:
        ---
        ${video.script || 'No script provided.'}
        ---
        Creator Persona: "${settings.creatorPersona}"
        Creator Style Guide: "${settings.creatorStyleGuide}"

        Based on the provided information, generate an engaging YouTube video description and a list of timestamps (chapters).
        The description should be SEO-friendly, include a strong hook, and a call to action.
        The chapters should identify the main sections of the video from the script.

        Return a single JSON object with two keys: "description" (a string) and "chapters" (an array of strings in "HH:MM:SS - Chapter Title" format).
        Example:
        {
          "description": "Your generated description here...",
          "chapters": ["00:00 - Intro", "01:23 - Main Topic", "05:10 - Conclusion"]
        }
        `;
        try {
            const parsedJson = await window.aiUtils.callGeminiAPI(
                prompt,
                settings.geminiApiKey,
                {},
                'generateDescription', // Task type
                settings.useProModel, // Pass the setting
                settings.geminiFlashModelName, // Pass the setting
                settings.geminiProModelName // Pass the setting
            );
            if (parsedJson.description) setDescription(parsedJson.description);
            if (parsedJson.chapters) setChapters(parsedJson.chapters.join('\n'));
        } catch (err) {
            console.error(err);
            alert("Failed to generate description. Check console for details.");
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleRefineDescription = async () => {
        if (!refinement.trim()) return;
        setIsGenerating(true);
        const apiKey = settings.geminiApiKey;
        
        const prompt = `
        Original Description: "${description}"
        Original Chapters: "${chapters}"
        Refinement Request: "${refinement}"

        Refine the description and chapters based on the user's request.

        Return a single JSON object with two keys: "description" and "chapters" (an array of strings).
        `;
        try {
             const parsedJson = await window.aiUtils.callGeminiAPI(
                prompt,
                settings.geminiApiKey,
                {},
                'refineDescription', // Task type
                settings.useProModel, // Pass the setting
                settings.geminiFlashModelName, // Pass the setting
                settings.geminiProModelName // Pass the setting
            );
            if (parsedJson.description) setDescription(parsedJson.description);
            if (parsedJson.chapters) setChapters(parsedJson.chapters.join('\n'));
            setRefinement('');
        } catch(err) {
            console.error(err);
            alert("Failed to refine description.");
        } finally {
            setIsGenerating(false);
        }
    };


    const handleComplete = () => {
        handleSave();
        onCompletion(video.id, 'description', { description, chapters: chapters.split('\n').filter(Boolean) });
    };

    return (
        <div className="bg-gray-800 p-4 rounded-lg space-y-4">
            <h3 className="text-lg font-bold">Description & Chapters</h3>
            <button onClick={handleGenerateDescription} disabled={isGenerating} className="btn-secondary w-full">
                {isGenerating ? 'Generating...' : 'Generate with AI'}
            </button>
            <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onBlur={handleSave}
                    rows="8"
                    className="form-textarea w-full bg-gray-700"
                    placeholder="YouTube video description..."
                />
            </div>
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
             <div className="space-y-2 pt-2 border-t border-gray-700">
                <label className="block text-sm font-medium">Refine with AI</label>
                <textarea
                    value={refinement}
                    onChange={(e) => setRefinement(e.target.value)}
                    rows="2"
                    className="form-textarea w-full bg-gray-700"
                    placeholder="e.g., 'Make it shorter and funnier', 'add more emojis'"
                />
                <button onClick={handleRefineDescription} disabled={isGenerating || !refinement.trim()} className="btn-secondary w-full">
                    {isGenerating ? 'Refining...' : 'Refine'}
                </button>
            </div>
            <button onClick={handleComplete} className="btn-primary w-full">Mark as Complete</button>
        </div>
    );
};
