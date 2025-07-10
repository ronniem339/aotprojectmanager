// creators-hub/js/components/ProjectView/tasks/TitleTask.js

window.TitleTask = ({ video, onUpdateTask, isLocked, project, settings }) => {
    const { useState, useEffect } = React;
    const [generating, setGenerating] = useState(false);
    const [editableTitle, setEditableTitle] = useState(video.chosenTitle || video.title);
    const [titleSuggestions, setTitleSuggestions] = useState([]);
    const [error, setError] = useState('');
    const [titleRefinement, setTitleRefinement] = useState('');

    useEffect(() => {
        setEditableTitle(video.chosenTitle || video.title);
    }, [video.chosenTitle, video.title]);

    const handleGenerateSuggestions = async () => {
        setGenerating(true);
        setError('');

        const titlesKnowledgeBase = settings?.knowledgeBases?.youtube?.videoTitles || 'Craft clickable, SEO-friendly titles.';

        // --- FIX: Intelligently select the best context from V2 or V1 workflows ---
        const videoContentContext = video.full_video_script_text || video.concept;

        const prompt = `
            **PRIMARY CONTEXT: TITLE BEST PRACTICES**
            ${titlesKnowledgeBase}

            ---

            **YOUR TASK**
            You are a YouTube title expert. Following the best practices outlined in the primary context above, generate 5 clickable, SEO-friendly titles for the following video.

            **VIDEO DETAILS**
            - Core Video Content: "${videoContentContext}"

            **BACKGROUND CONTEXT (Less Important):**
            - The video is part of a series called "${project.playlistTitle}", which is about "${project.playlistDescription}".

            Return the titles as a JSON object like: {"suggestions": ["Title 1", "Title 2", ...]}.
        `;

        try {
            const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings);
            if (parsedJson.suggestions) {
                setTitleSuggestions(parsedJson.suggestions);
            }
        } catch (err) {
            setError(`Failed to generate titles: ${err.message}`);
        } finally {
            setGenerating(false);
        }
    };

    const handleRefineTitle = async () => {
        setGenerating(true);
        setError('');

        // --- FIX: Add the same rich context to the refinement prompt ---
        const titlesKnowledgeBase = settings?.knowledgeBases?.youtube?.videoTitles || 'Craft clickable, SEO-friendly titles.';
        const videoContentContext = video.full_video_script_text || video.concept;

        const prompt = `
            **YOUR TASK**
            You are a YouTube title expert. Your primary goal is to rewrite a video title based on specific instructions from the creator. You MUST follow their instructions.

            **CRITICAL: CREATOR'S INSTRUCTIONS**
            You must follow these instructions to refine the title: "${titleRefinement}"

            ---

            **CONTEXT FOR THE REFINEMENT**

            **Original Title to Refine:**
            "${editableTitle}"

            **Core Video Content (for context):**
            "${videoContentContext}"

            **Overall Series Context (less important):**
            - The video is part of a series called "${project.playlistTitle}", which is about "${project.playlistDescription}".

            **STYLE GUIDE (Follow these best practices):**
            ${titlesKnowledgeBase}

            ---

            **OUTPUT**
            Return only the new, refined title in a JSON object like: {"newTitle": "The new improved title"}.
        `;

        try {
            const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings);
            if (parsedJson.newTitle) {
                const newTitle = parsedJson.newTitle;
                setEditableTitle(newTitle);
                // Do not clear the refinement box so the user can iterate
                // setTitleRefinement(''); 
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
        onUpdateTask('titleGenerated', 'in-progress', { chosenTitle: suggestion });
    };

    const handleSave = () => {
        onUpdateTask('titleGenerated', 'complete', { chosenTitle: editableTitle });
    };

    if (isLocked) {
        return <p className="text-gray-400 text-center py-2 text-sm">Please complete the previous step first.</p>;
    }

    return (
        <div className="space-y-6">
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

            <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 space-y-4">
                <button onClick={handleGenerateSuggestions} disabled={generating} className="btn btn-primary btn-sm w-full justify-center">
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

            <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 space-y-3">
               <label className="block text-sm font-medium text-gray-300">Refine Current Title</label>
               <div className="flex items-center gap-2">
                   <input
                        type="text"
                        className="form-input flex-grow"
                        placeholder="Refinement instructions (e.g., make it shorter)"
                        value={titleRefinement}
                        onChange={(e) => setTitleRefinement(e.target.value)}
                    />
                   <button 
                        onClick={handleRefineTitle} 
                        disabled={generating || !titleRefinement} 
                        className="btn btn-secondary btn-sm flex-shrink-0"
                   >
                        {generating ? <window.LoadingSpinner isButton={true} /> : '✍️ Refine'}
                   </button>
               </div>
            </div>
            
            <div className="pt-6 border-t border-gray-700 text-center">
                <button onClick={handleSave} className="w-full max-w-xs mx-auto px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg font-semibold text-white">
                    Confirm Title & Mark Complete
                </button>
            </div>
        </div>
    );
};
