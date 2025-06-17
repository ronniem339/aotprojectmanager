window.EditVideoTask = ({ video, onUpdate, onCompletion, settings }) => {
    const { useState, useEffect } = React;
    const [editedScript, setEditedScript] = useState('');
    const [changeLog, setChangeLog] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        // We track the edited script separately from the main video script
        // until the user explicitly saves it.
        setEditedScript(video.script || '');
    }, [video.script]);

    const handleGenerateUpdatedScript = async () => {
        if (!changeLog.trim()) {
            alert("Please describe the changes you want to make.");
            return;
        }
        setIsGenerating(true);
        const apiKey = settings.geminiApiKey;

        let model = settings.geminiFlashModelName || 'gemini-1.5-flash-latest';
        const taskType = 'generateUpdatedScript';
        if (settings.useProModel && window.CREATOR_HUB_CONFIG.PRO_MODEL_TASKS.includes(taskType)) {
            model = settings.geminiProModelName || 'gemini-1.5-pro-latest';
        }

        const prompt = `
        Original Script:
        ---
        ${video.script}
        ---
        Requested Changes: "${changeLog}"

        Please rewrite the original script to incorporate the requested changes. Maintain the original tone and style unless specified otherwise in the request.
        Return ONLY the full, rewritten script as plain text. Do not include any other commentary or JSON formatting.
        `;

        try {
            const payload = {
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "text/plain" }
            };
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                 const errorBody = await response.text();
                 throw new Error(`API Error: ${errorBody}`);
            }

            const result = await response.json();
            const newScript = result.candidates[0].content.parts[0].text;
            setEditedScript(newScript);

        } catch (err) {
            console.error(err);
            alert("Failed to generate updated script. Check console for details.");
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleSave = () => {
         onUpdate({
            ...video,
            script: editedScript,
            // Log the change request for history
            editHistory: [
                ...(video.editHistory || []),
                { request: changeLog, timestamp: new Date().toISOString() }
            ]
        });
        alert("Script updated!");
    };

    const handleComplete = () => {
        handleSave();
        onCompletion(video.id, 'edit', { script: editedScript });
    };

    return (
        <div className="bg-gray-800 p-4 rounded-lg space-y-4">
            <h3 className="text-lg font-bold">Edit Video Script</h3>
            <div className="p-4 bg-gray-900 rounded-md">
                <h4 className="font-semibold text-gray-300">Current Script (for reference)</h4>
                <pre className="text-xs text-gray-400 whitespace-pre-wrap max-h-40 overflow-y-auto font-mono mt-2 p-2 bg-black rounded">
                    {video.script || "No script available."}
                </pre>
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">Describe Changes</label>
                <textarea
                    value={changeLog}
                    onChange={(e) => setChangeLog(e.target.value)}
                    rows="3"
                    className="form-textarea w-full bg-gray-700"
                    placeholder="e.g., 'Cut the intro in half', 'Add a joke about alpacas in the second paragraph', 'Rewrite the conclusion to be more energetic.'"
                />
            </div>
            <button onClick={handleGenerateUpdatedScript} disabled={isGenerating || !changeLog.trim()} className="btn-secondary w-full">
                {isGenerating ? 'Generating New Script...' : 'Generate New Script with AI'}
            </button>
            <div>
                <label className="block text-sm font-medium mb-1">Proposed New Script</label>
                <textarea
                    value={editedScript}
                    onChange={(e) => setEditedScript(e.target.value)}
                    rows="10"
                    className="form-textarea w-full bg-gray-700 font-mono text-sm"
                    placeholder="The AI-generated script will appear here."
                />
            </div>
            <button onClick={handleSave} className="btn-primary w-full">Save Updated Script</button>
             <button onClick={handleComplete} className="btn-primary w-full bg-green-700 hover:bg-green-800">Mark as Complete</button>
        </div>
    );
};
