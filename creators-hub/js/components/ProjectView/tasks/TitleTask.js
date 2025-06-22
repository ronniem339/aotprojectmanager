// creators-hub/js/components/ProjectView/tasks/TitleTask.js

window.TitleTask = ({ video, onUpdateTask, isLocked, project, settings }) => {
    const { useState, useEffect } = React;
    const [generating, setGenerating] = useState(false);
    // Use the 'chosenTitle' if it exists, otherwise fall back to the original video title.
    const [editableTitle, setEditableTitle] = useState(video.chosenTitle || video.title);
    const [titleSuggestions, setTitleSuggestions] = useState([]);
    const [error, setError] = useState('');
    const [titleRefinement, setTitleRefinement] = useState('');

    // When the video data changes from the parent, this effect ensures the local state is updated.
    // This is important if another part of the app updates the title.
    useEffect(() => {
        setEditableTitle(video.chosenTitle || video.title);
    }, [video.chosenTitle, video.title]);

    const handleGenerateSuggestions = async () => {
        setGenerating(true);
        setError('');
        const prompt = `Act as a YouTube title expert. Based on the video concept, generate 5 clickable, SEO-friendly titles.
        Video Concept: "${video.concept}"
        Project Context: "${project.playlistTitle} - ${project.playlistDescription}"
        Your response must be a JSON object like: {"suggestions": ["Title 1", "Title 2", ...]}.`;
        try {
            const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings);
            setTitleSuggestions(parsedJson.suggestions || []);
        } catch (err) {
            setError(`Failed to generate titles: ${err.message}`);
        } finally {
            setGenerating(false);
        }
    };

    const handleRefineTitle = async () => {
        setGenerating(true);
        setError('');
        const prompt = `You are a YouTube title expert. Rewrite the following YouTube title based on my instructions.
        Original Title: "${editableTitle}"
        Instructions: "${titleRefinement}"
        Return only the new title in a JSON object like: {"newTitle": "The new improved title"}.`;
        try {
            const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings);
            if (parsedJson.newTitle) {
                const newTitle = parsedJson.newTitle;
                setEditableTitle(newTitle);
                setTitleRefinement(''); // Clear refinement input on success
                // Update the database immediately to save the new title and mark the task as in-progress.
                onUpdateTask('titleGenerated', 'in-progress', { chosenTitle: newTitle });
            }
        } catch (err) {
            setError(`Failed to refine title: ${err.message}`);
        } finally {
            setGenerating(false);
        }
    };

    const selectSuggestion = (suggestion) => {
        setEditableTitle(suggestion);
        // Save the chosen suggestion to the database immediately and mark the task as in-progress.
        onUpdateTask('titleGenerated', 'in-progress', { chosenTitle: suggestion });
    };

    const handleSave = () => {
        // This finalizes the choice and marks the task as complete.
        onUpdateTask('titleGenerated', 'complete', { chosenTitle: editableTitle });
    };

    if (isLocked) {
        return <p className="text-gray-400 text-center py-2 text-sm">Please complete the previous step first.</p>;
    }

    return (
        <div className="space-y-6">
            {/* Main Title Input - The Single Source of Truth */}
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Final Video Title</label>
                <input
                    type="text"
                    className="form-input text-lg"
                    value={editableTitle}
                    onChange={(e) => setEditableTitle(e.target.value)}
                    onBlur={() => onUpdateTask('titleGenerated', 'in-progress', { chosenTitle: editableTitle })}
                    placeholder="Enter your final title here..."
                />
            </div>

            {/* AI Generation and Suggestions */}
            <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 space-y-4">
                <button onClick={handleGenerateSuggestions} disabled={generating} className="button-primary-small w-full justify-center">
                    {generating && !titleSuggestions.length ? <window.LoadingSpinner isButton={true} /> : '🤖 Generate Suggestions'}
                </button>
                {error && <p className="text-red-400 mt-2 text-sm">{error}</p>}
                
                {titleSuggestions.length > 0 && (
                    <div className="space-y-2 pt-4 border-t border-gray-600">
                        <p className="font-semibold text-sm text-gray-300">Click to use a suggestion:</p>
                        <div className="flex flex-wrap gap-2">
                            {titleSuggestions.map((suggestion, i) => (
                                <button
                                    key={i}
                                    onClick={() => selectSuggestion(suggestion)}
                                    className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 rounded-full transition-colors"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* AI Refinement Section */}
            <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 space-y-3">
                 <label className="block text-sm font-medium text-gray-300">Refine Current Title</label>
                 <textarea
                    className="form-textarea-small"
                    placeholder="Refinement instructions (e.g., make it shorter, add a question)"
                    value={titleRefinement}
                    onChange={(e) => setTitleRefinement(e.target.value)}
                    rows="2"
                />
                <button onClick={handleRefineTitle} disabled={generating || !titleRefinement} className="button-secondary-small w-full justify-center">
                     {generating ? <window.LoadingSpinner isButton={true} /> : '✍️ Refine'}
                </button>
            </div>
            
            {/* Final Save Button */}
            <div className="pt-6 border-t border-gray-700 text-center">
                <button onClick={handleSave} className="w-full max-w-xs mx-auto px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg font-semibold text-white">
                    Confirm Title & Mark Complete
                </button>
            </div>
        </div>
    );
};
