// js/components/ProjectView/tasks/ScriptingTask.js
window.ScriptingTask = ({ video, settings, onUpdateTask, onGenerate, isLocked }) => {
    const { useState, useEffect } = React;
    const [scriptContent, setScriptContent] = useState(video.script || '');
    const [generating, setGenerating] = useState(false);
    const [showFullScreenScript, setShowFullScreenScript] = useState(false);

    const taskStatus = video.tasks?.scripting || 'pending';

    useEffect(() => {
        setScriptContent(video.script || '');
    }, [video.script]);

    const handleGenerateScript = async () => {
        setGenerating(true);
        try {
            // This function would call the AI utility, but for simplicity, we pass it up
            const generatedScript = await onGenerate('script');
            if(generatedScript) {
                 setScriptContent(generatedScript);
            }
        } catch (error) {
            console.error("Error generating script:", error);
        } finally {
            setGenerating(false);
        }
    };

    const handleConfirmScript = () => {
        onUpdateTask('scripting', 'complete', { script: scriptContent });
    };

    return (
        <div>
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
