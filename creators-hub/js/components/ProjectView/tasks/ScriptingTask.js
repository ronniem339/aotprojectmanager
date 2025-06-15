// js/components/ProjectView/tasks/ScriptingTask.js

window.ScriptingTask = ({ video, settings, onUpdateTask, isLocked }) => {
    const { useState, useEffect } = React;
    const [scriptContent, setScriptContent] = useState('');
    const [generating, setGenerating] = useState(false);
    const [showFullScreenScript, setShowFullScreenScript] = useState(false);
    const [error, setError] = useState('');
    const [refinementPrompt, setRefinementPrompt] = useState('');

    const taskStatus = video.tasks?.scripting || 'pending';

    useEffect(() => {
        setScriptContent(video.script || '');
        setError(''); // Clear error when video changes
        setRefinementPrompt(''); // Clear refinement prompt
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

        IMPORTANT: Your response must be only the raw text of the script. Do not include any introductory phrases, titles, or explanations outside of the script itself.`;
        
        try {
            const payload = {
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "text/plain" }
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
            
            const generatedScript = result.candidates[0].content.parts[0].text;
            setScriptContent(generatedScript);

        } catch (err) {
            console.error("Error generating script:", err);
            setError(`Failed to generate script: ${err.message}`);
        } finally {
            setGenerating(false);
        }
    };
    
    /**
     * Calls the Gemini API to refine the existing script based on user feedback.
     */
    const handleRefineScript = async () => {
        if (!refinementPrompt) return;
        setGenerating(true);
        setError('');

        const apiKey = settings.geminiApiKey;
        if (!apiKey) {
            setError("Gemini API Key is not set.");
            setGenerating(false);
            return;
        }

        const prompt = `You are a professional script editor. The user has provided an existing video script and an instruction to refine it.
        Your task is to rewrite the script based on the instruction.

        Original Script:
        ---
        ${scriptContent}
        ---
        
        User's Refinement Instruction: "${refinementPrompt}"

        IMPORTANT: Please provide only the complete, rewritten, raw text script as your response. Do not include any explanations, apologies, or conversational text.`;

        try {
            const payload = {
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "text/plain" }
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
            const refinedScript = result.candidates[0].content.parts[0].text;
            setScriptContent(refinedScript);
            setRefinementPrompt(''); // Clear the prompt after use
        } catch (err) {
            console.error("Error refining script:", err);
            setError(`Failed to refine script: ${err.message}`);
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
            
            {/* --- Refinement UI --- */}
            {scriptContent && taskStatus !== 'complete' && (
                 <div className="mt-4 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Refine with AI</label>
                    <textarea 
                        value={refinementPrompt}
                        onChange={(e) => setRefinementPrompt(e.target.value)}
                        rows="2" 
                        className="w-full form-textarea" 
                        placeholder="e.g., 'Make the intro more exciting', 'Add a section about the local food', 'Make it 2 minutes longer'"
                    />
                    <div className="text-right mt-2">
                         <button onClick={handleRefineScript} disabled={generating || !refinementPrompt} className="px-4 py-2 text-sm bg-secondary-accent hover:bg-secondary-accent-darker rounded-lg font-semibold disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center ml-auto gap-2">
                            {generating ? <window.LoadingSpinner isButton={true} /> : '✍️ Refine Script'}
                        </button>
                    </div>
                </div>
            )}

            {/* --- Main Action Buttons --- */}
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
