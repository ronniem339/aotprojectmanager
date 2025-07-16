// creators-hub/js/components/ProjectView/tasks/RecordVoiceoverProjectTask.js

window.RecordVoiceoverProjectTask = ({ video, handlers, task, onUpdateTask }) => {
    const blueprint = video?.tasks?.scriptingV2_blueprint || {};
    const recordableVoiceover = blueprint.recordableVoiceover || 'No recordable voiceover found.';
    console.log("Recordable Voiceover Content:", recordableVoiceover);
    const [isProcessing, setIsProcessing] = React.useState(false);

    const handleCompleteTask = async () => {
        setIsProcessing(true);
        try {
            // FIX: Pass the video ID and a correctly structured object for the update.
            // This uses the task's ID to create a dynamic key like 'tasks.voiceoverRecorded'.
            await onUpdateTask(video.id, { [`tasks.${task.id}`]: 'complete' });

            handlers.displayNotification("Voiceover recording task marked as complete!", 'success');
        } catch (error) {
            console.error("Error in handleCompleteTask:", error);
            handlers.displayNotification(`Error marking task complete: ${error.message}`, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const status = video.tasks?.[task.id] || 'pending';

    if (status === 'complete') {
        return (
            <p className="text-gray-400 text-center py-2 text-sm">This task is marked as complete.</p>
        );
    }

    return (
        <div className="p-4 border border-gray-700 rounded-lg">
            <h2 className="text-xl font-bold text-white mb-3">{task.title}</h2>
            <p className="mb-4 text-gray-400">Read the script below to record your voiceover. Once done, mark the task as complete.</p>
            <div
                className="w-full h-96 p-4 border border-gray-600 rounded bg-gray-900 text-white font-mono text-lg leading-relaxed overflow-y-auto whitespace-pre-wrap"
            >
                {recordableVoiceover}
            </div>
            <div className="mt-4 flex justify-end">
                <button
                    onClick={handleCompleteTask}
                    disabled={isProcessing}
                    className="btn btn-primary disabled:opacity-50"
                >
                    {isProcessing ? 'Completing...' : 'Mark as Complete'}
                </button>
            </div>
        </div>
    );
};
