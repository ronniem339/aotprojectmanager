// js/components/ProjectView/tasks/TitleTask.js

window.TitleTask = ({ video, settings, onUpdateTask, isLocked }) => {
    const { useState, useEffect } = React;

    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState('');
    const [editableTitle, setEditableTitle] = useState('');
    const [titleRefinement, setTitleRefinement] = useState('');
    const [titleSuggestions, setTitleSuggestions] = useState([]);

    useEffect(() => {
        setEditableTitle(video.chosenTitle || video.title || '');
        setTitleSuggestions([]);
        setError('');
        setTitleRefinement('');
    }, [video.id, video.chosenTitle, video.title]);

    const handleGenerateSuggestions = async () => {
        setGenerating(true);
        setError('');
        const prompt = `Act as a YouTube title expert. Based on the script, generate 3 new, distinct title suggestions. Avoid titles similar to "${editableTitle}".
Script:
---
${video.script}
---
YouTube Video Title Guidelines: "${settings.knowledgeBases?.youtube?.videoTitles || 'Create catchy and relevant titles.'}"
Return a JSON object: {"suggestions": ["title1", "title2", "title3"]}`;
        try {
            const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings.geminiApiKey);
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
        const prompt = `Rewrite the following YouTube title based on the user's feedback, adhering to the provided guidelines.
Original Title: "${editableTitle}"
User Feedback: "${titleRefinement}"
YouTube Video Title Guidelines: "${settings.knowledgeBases?.youtube?.videoTitles || 'Create catchy and relevant titles.'}"
Return a JSON object: {"newTitle": "..."}`;
        try {
            const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings.geminiApiKey);
            if (parsedJson.newTitle) {
                setEditableTitle(parsedJson.newTitle);
                setTitleRefinement('');
            }
        } catch (err) {
            setError(`Failed to refine title: ${err.message}`);
        } finally {
            setGenerating(false);
        }
    };

    const handleConfirmTitle = () => {
        onUpdateTask('titleGenerated', 'complete', { 'chosenTitle': editableTitle });
    };

    if (isLocked) {
        return <p className="text-gray-400 text-center py-2 text-sm">Please complete previous steps first.</p>;
    }
    
    if (video.tasks?.titleGenerated === 'complete') {
        return <p className="text-gray-400 text-center py-2 text-sm">Title has been finalized.</p>;
    }

    return (
         <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Current Title</label>
                <input type="text" value={editableTitle} onChange={(e) => setEditableTitle(e.target.value)} className="w-full form-input" />
            </div>

            <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700 space-y-2">
                <label className="block text-sm font-medium text-gray-300">Refine or Replace Title</label>
                 <textarea value={titleRefinement} onChange={(e) => setTitleRefinement(e.target.value)} rows="2" className="w-full form-textarea" placeholder="e.g., 'Make it catchier' or 'Focus on the history aspect'"/>
                <div className="flex gap-2">
                    <button onClick={handleRefineTitle} disabled={generating || !titleRefinement} className="px-3 py-1 text-xs bg-secondary-accent hover:bg-secondary-accent-darker rounded-md font-semibold disabled:opacity-50">Refine Current</button>
                    <button onClick={handleGenerateSuggestions} disabled={generating} className="px-3 py-1 text-xs bg-secondary-accent hover:bg-secondary-accent-darker rounded-md font-semibold disabled:opacity-50">Get New Suggestions</button>
                </div>
            </div>

            {titleSuggestions.length > 0 && (
                <div className="space-y-2">
                    {titleSuggestions.map((title, i) => (
                         <div key={i} onClick={() => setEditableTitle(title)} className="p-2 bg-gray-800/60 rounded-md cursor-pointer hover:bg-gray-700/60 text-center">
                            <p className="text-white">{title}</p>
                        </div>
                    ))}
                </div>
            )}
            
            <div className="pt-4 border-t border-gray-700 text-right">
                 <button onClick={handleConfirmTitle} className="px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg font-semibold">
                    Confirm Title
                </button>
            </div>
             {error && <p className="text-red-400 mt-2 text-sm text-right">{error}</p>}
        </div>
    );
};
