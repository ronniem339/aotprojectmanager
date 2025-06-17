// js/components/ProjectView/tasks/TitleTask.js

window.TitleTask = ({ video, onUpdate, onCompletion, project, settings }) => {
    const { useState } = React;
    const [generating, setGenerating] = useState(false);
    const [editableTitle, setEditableTitle] = useState(video.chosenTitle || video.title);
    const [titleSuggestions, setTitleSuggestions] = useState([]);
    const [error, setError] = useState('');
    const [titleRefinement, setTitleRefinement] = useState('');

    const handleGenerateSuggestions = async () => {
        setGenerating(true);
        setError('');
        const prompt = `Act as a YouTube title expert. Based on the video concept, generate 5 clickable, SEO-friendly titles.
        Video Concept: "${video.concept}"
        Project Context: "${project.playlistTitle} - ${project.playlistDescription}"
        Your response must be a JSON object like: {"suggestions": ["Title 1", "Title 2", ...]}.`;
        try {
            // FIXED: Pass the 'settings' object
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
            // FIXED: Pass the 'settings' object
            const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings);
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

    const handleSave = () => {
        onUpdate({ ...video, chosenTitle: editableTitle });
        onCompletion(true);
    };

    return (
        <div className="task-container">
            <h3 className="task-title">Finalize Title</h3>
            {video.tasks.titleGenerated === 'complete' && <span className="task-badge-complete">✓ Completed</span>}
            <div className="task-content">
                <input
                    type="text"
                    className="form-input"
                    value={editableTitle}
                    onChange={(e) => {
                        setEditableTitle(e.target.value);
                        onCompletion(false);
                    }}
                />
                <button onClick={handleGenerateSuggestions} disabled={generating} className="button-primary-small mt-4 w-full justify-center">
                    {generating ? <window.LoadingSpinner isButton={true} /> : '🤖 Generate Suggestions'}
                </button>
                {error && <p className="error-message">{error}</p>}
                {titleSuggestions.length > 0 && (
                    <div className="mt-4 space-y-2">
                        <p className="font-semibold text-sm">Suggestions:</p>
                        {titleSuggestions.map((s, i) => (
                            <button key={i} onClick={() => setEditableTitle(s)} className="suggestion-item">{s}</button>
                        ))}
                    </div>
                )}
                 <div className="mt-6">
                    <input
                        type="text"
                        className="form-input-small"
                        placeholder="Refinement instructions (e.g., make it shorter)"
                        value={titleRefinement}
                        onChange={(e) => setTitleRefinement(e.target.value)}
                    />
                    <button onClick={handleRefineTitle} disabled={generating || !titleRefinement} className="button-secondary-small mt-2 w-full justify-center">
                         {generating ? <window.LoadingSpinner isButton={true} /> : '✍️ Refine Current Title'}
                    </button>
                </div>
                <button onClick={handleSave} className="button-primary-small mt-6 w-full justify-center">Save and Mark Complete</button>
            </div>
        </div>
    );
};
