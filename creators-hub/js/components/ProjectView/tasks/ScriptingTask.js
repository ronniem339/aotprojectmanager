// js/components/ProjectView/tasks/ScriptingTask.js

window.ScriptingTask = ({ video, settings, onUpdateTask, isLocked }) => {
    const { useState, useEffect } = React;
    const [scriptContent, setScriptContent] = useState('');
    const [generating, setGenerating] = useState(false);
    const [showFullScreenScript, setShowFullScreenScript] = useState(false);
    const [error, setError] = useState('');

    const taskStatus = video.tasks?.scripting || 'pending';

    useEffect(() => {
        setScriptContent(video.script || '');
        setError(''); // Clear error when video changes
    }, [video.script, video.id]);

    /**
     * Calls the Gemini API to generate a video script.
     * This logic now lives directly within the component.
     */
    const handleGenerateScript = async () => {
        setGenerating(true);
        setError('');

        const apiKey = settings.geminiApiKey;
        if (!apiKey) {
            setError("Gemini API Key is not set. Please set it in the settings.");
            setGenerating(false);
            return;
        }

        const prompt = `Act as a professional YouTuber and scriptwriter.
        Based on the video title and concept below, write a complete, engaging video script.
        The script should have clear sections (intro, main content, outro) and include placeholders for visuals or on-screen text where appropriate (e.g., "[B-roll of the cliffs]").
        Adopt the persona described in the "Who Am I" knowledge base if provided.

        Video Title: "${video.chosenTitle || video.title}"
        Video Concept: "${video.concept}"
        My Persona: "${settings.knowledgeBases?.youtube?.whoAmI || 'An engaging and informative travel vlogger.'}"
        My Style Guide: "${settings.styleGuideText || 'Friendly, slightly witty, and knowledgeable.'}"

        Please provide the response as a raw text script, ready to be used.`;
        
        try {
            // We call the Gemini API directly from the utility, but ask for a text response
            const payload = {
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: {
                    // Important: For a text script, we should expect plain text.
                    responseMimeType: "text/plain", 
                }
            };
    
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
    
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err?.error?.message || 'API Error');
            }
            const result = await response.json();
            
            // For text/plain responses, the content is directly in the text field
            const generatedScript = result.candidates[0].content.parts[0].text;
            setScriptContent(generatedScript);

        } catch (err) {
            console.error("Error generating script:", err);
            setError(`Failed to generate script: ${err.message}`);
        } finally {
            setGenerating(false);
        }
    };

    const handleConfirmScript = () => {
        onUpdateTask('scripting', 'complete', { script: scriptContent });
    };

    return (
        <div>
            {error && <p className="text-red-400 mb-2 text-sm bg-red-900/50 p-3 rounded-lg">{error}</p>}
            <h4 className="text-sm font-semibold text-gray-400 mb-2">Script Content</h4>
            <textarea
                value={scriptContent}
                onChange={(e) => setScriptContent(e.target.value)}
                rows="10"
                className="w-full form-textarea bg-gray-800/50"
                placeholder="Paste your script here, or click the button below to generate one with AI."
                readOnly={taskStatus === 'complete'}
            />
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
                {!scriptContent && (
                    <button onClick={handleGenerateScript} disabled={generating || isLocked} className="flex-grow px-5 py-2.5 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                        {generating ? <window.LoadingSpinner isButton={true} /> : '✨ Generate Script with AI'}
                    </button>
                )}
                {scriptContent && (
                    <>
                        <button onClick={() => setShowFullScreenScript(true)} className="flex-grow px-5 py-2.5 bg-secondary-accent hover:bg-secondary-accent-darker rounded-lg font-semibold">View Fullscreen Script</button>
                        {taskStatus !== 'complete' ? (
                            <button onClick={handleConfirmScript} className="flex-grow px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg font-semibold">Confirm & Lock Script</button>
                        ) : (
                            <p className="flex-grow text-gray-400 text-sm flex items-center justify-center p-2 border border-gray-700 rounded-lg">Script is locked. Use "Revisit" to edit.</p>
                        )}
                    </>
                )}
            </div>
            {showFullScreenScript && (
                <window.FullScreenScriptView
                    scriptContent={scriptContent}
                    onClose={() => setShowFullScreenScript(false)}
                />
            )}
        </div>
    );
};
