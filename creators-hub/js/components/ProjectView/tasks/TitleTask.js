window.TitleTask = ({ video, onUpdate, onCompletion, settings }) => {
    const { useState, useEffect } = React;
    const [title, setTitle] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [refinement, setRefinement] = useState('');

    useEffect(() => {
        setTitle(video.title || '');
        setSuggestions(video.titleSuggestions || []);
    }, [video]);

    const handleSave = () => {
        onUpdate({ ...video, title, titleSuggestions: suggestions });
    };

    const handleGenerateSuggestions = async () => {
        setIsGenerating(true);
        const apiKey = settings.geminiApiKey;
        if (!apiKey) {
            alert("Please set Gemini API key in settings.");
            setIsGenerating(false);
            return;
        }

        const prompt = `
        Video Concept: "${video.concept}"
        Keywords: ${(video.keywords || []).join(', ')}
        Creator Persona: "${settings.creatorPersona}"
        Existing Title Suggestions: ${suggestions.join('; ')}

        Based on the video concept, keywords, and creator persona, generate 5 clickable and SEO-friendly YouTube titles. Do not repeat any of the existing suggestions.

        Return a single JSON object with one key: "titles", which is an array of strings.
        Example:
        {
          "titles": ["New Title 1", "New Title 2", "New Title 3", "New Title 4", "New Title 5"]
        }
        `;
        try {
            const parsedJson = await window.aiUtils.callGeminiAPI(
                prompt,
                settings.geminiApiKey,
                {},
                'generateTitleSuggestions', // Task type
                settings.useProModel, // Pass the setting
                settings.geminiFlashModelName, // Pass the setting
                settings.geminiProModelName // Pass the setting
            );

            if (parsedJson.titles) {
                setSuggestions(prev => [...new Set([...prev, ...parsedJson.titles])]);
            }
        } catch (err) {
            console.error(err);
            alert("Failed to generate titles. Check console for details.");
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleRefineTitle = async () => {
        if (!refinement.trim()) return;
        setIsGenerating(true);
        const apiKey = settings.geminiApiKey;
        
        const prompt = `
        Original Title: "${title}"
        Refinement Request: "${refinement}"

        Refine the title based on the user's request.

        Return a single JSON object with one key: "refinedTitle".
        `;
        try {
             const parsedJson = await window.aiUtils.callGeminiAPI(
                prompt,
                settings.geminiApiKey,
                {},
                'refineTitle', // Task type
                settings.useProModel, // Pass the setting
                settings.geminiFlashModelName, // Pass the setting
                settings.geminiProModelName // Pass the setting
            );
            if (parsedJson.refinedTitle) {
                setTitle(parsedJson.refinedTitle);
                setRefinement('');
            }
        } catch(err) {
            console.error(err);
            alert("Failed to refine title.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleComplete = () => {
        handleSave();
        onCompletion(video.id, 'title', { title });
    };

    return (
        <div className="bg-gray-800 p-4 rounded-lg space-y-4">
            <h3 className="text-lg font-bold">Title</h3>
            <div>
                <label className="block text-sm font-medium mb-1">Chosen Title</label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={handleSave}
                    className="form-input w-full bg-gray-700"
                    placeholder="Your final video title"
                />
            </div>
            
            <div className="space-y-2 pt-2 border-t border-gray-700">
                <label className="block text-sm font-medium">Refine with AI</label>
                <textarea
                    value={refinement}
                    onChange={(e) => setRefinement(e.target.value)}
                    rows="2"
                    className="form-textarea w-full bg-gray-700"
                    placeholder="e.g., 'Make it sound more mysterious', 'Add the year'"
                />
                <button onClick={handleRefineTitle} disabled={isGenerating || !refinement.trim()} className="btn-secondary w-full">
                    {isGenerating ? 'Refining...' : 'Refine'}
                </button>
            </div>

            <div className="space-y-2 pt-2 border-t border-gray-700">
                <label className="block text-sm font-medium">AI Suggestions</label>
                <button onClick={handleGenerateSuggestions} disabled={isGenerating} className="btn-secondary w-full">
                    {isGenerating ? 'Generating...' : 'Generate New Suggestions'}
                </button>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                    {suggestions.map((s, index) => (
                        <div key={index} className="flex items-center p-2 bg-gray-700 rounded-md">
                            <p className="flex-grow text-sm">{s}</p>
                            <button onClick={() => setTitle(s)} className="btn-secondary btn-sm ml-2">Use</button>
                        </div>
                    ))}
                </div>
            </div>

            <button onClick={handleComplete} className="btn-primary w-full">Mark as Complete</button>
        </div>
    );
};
