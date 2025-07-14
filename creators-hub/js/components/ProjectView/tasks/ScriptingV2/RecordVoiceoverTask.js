const { useState: useStateVO, useEffect: useEffectVO } = React;

window.RecordVoiceoverTask = ({ video, handlers, task }) => {
    const blueprint = video?.tasks?.scriptingV2_blueprint || {};
    const recordableVoiceover = blueprint.recordableVoiceover || 'No recordable voiceover found.';
    const [isProcessing, setIsProcessing] = useStateVO(false);

    const handleCompleteTask = async () => {
        setIsProcessing(true);
        try {
            await handlers.updateVideo(video.id, { 
                tasks: { 
                    ...video.tasks, 
                    [task.id]: 'complete' 
                }
            });
            handlers.displayNotification("Voiceover recording task marked as complete!", 'success');
        } catch (error) {
            handlers.displayNotification(`Error marking task complete: ${error.message}`, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="p-4 border border-gray-700 rounded-lg">
            <h2 className="text-xl font-bold text-white mb-3">{task.title}</h2>
            <p className="mb-4 text-gray-400">Read the script below to record your voiceover. Once done, mark the task as complete.</p>
            <textarea
                value={recordableVoiceover}
                readOnly
                className="w-full h-96 p-4 border border-gray-600 rounded bg-gray-900 text-white font-mono text-lg leading-relaxed"
            />
            <div className="mt-4 flex justify-end">
                <button
                    onClick={handleCompleteTask}
                    disabled={isProcessing || video.tasks?.[task.id] === 'complete'}
                    className="btn btn-primary disabled:opacity-50"
                >
                    {isProcessing ? 'Completing...' : (video.tasks?.[task.id] === 'complete' ? '✅ Task Completed' : 'Mark as Complete')}
                </button>
            </div>
        </div>
    );
};
