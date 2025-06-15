// js/components/ProjectView/tasks/SimpleConfirmationTask.js
window.SimpleConfirmationTask = ({ onUpdate, status, buttonText = "Mark as Complete", completedText = "This task is marked as complete." }) => {
    if (status !== 'complete') {
        return (
            <button onClick={() => onUpdate('complete')} className="w-full px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg font-semibold">
                {buttonText}
            </button>
        );
    }
    return (
        <p className="text-gray-400 text-center py-2 text-sm">{completedText}</p>
    );
};
