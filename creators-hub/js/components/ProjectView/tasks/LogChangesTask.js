// js/components/ProjectView/tasks/LogChangesTask.js
window.LogChangesTask = ({ video, onUpdateTask, isLocked }) => {
    const { useState, useEffect } = React;
    const [feedbackText, setFeedbackText] = useState('');

    const taskStatus = video.tasks?.feedbackProvided || 'pending';

    useEffect(() => {
        setFeedbackText(video.tasks?.feedbackText || '');
    }, [video.tasks?.feedbackText]);

    if (taskStatus === 'complete') {
        return <p className="text-gray-400 text-center py-2 text-sm">Changes logged. Use "Revisit" to edit.</p>;
    }

    return (
        <div>
            <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                rows="5"
                className="w-full form-textarea"
                placeholder="e.g., 'We decided to combine the first two locations...'"
                disabled={isLocked}
            />
            <div className="flex flex-col sm:flex-row gap-4 mt-4">
                <button onClick={() => onUpdateTask('feedbackProvided', 'complete', { 'tasks.feedbackText': 'No changes were made.' })} disabled={isLocked} className="w-full px-5 py-2.5 bg-secondary-accent hover:bg-secondary-accent-darker rounded-lg font-semibold">No Changes Made</button>
                <button onClick={() => onUpdateTask('feedbackProvided', 'complete', { 'tasks.feedbackText': feedbackText })} disabled={!feedbackText || isLocked} className="w-full px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg font-semibold disabled:opacity-75 disabled:cursor-not-allowed">Confirm & Save Notes</button>
            </div>
        </div>
    );
};
