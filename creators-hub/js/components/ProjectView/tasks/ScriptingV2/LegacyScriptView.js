// WRITE to file: ./creators-hub/js/components/ProjectView/tasks/ScriptingV2/LegacyScriptView.js

const { useState } = React;

// A simple confirmation modal placeholder if it doesn't exist globally
// In your actual app, you might have a more robust modal component
if (!window.ConfirmationModal) {
    window.ConfirmationModal = ({ onConfirm, onCancel, title, message }) => (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
            <div className="bg-gray-800 p-6 rounded-lg shadow-xl text-center w-full max-w-md">
                <h3 className="text-lg font-bold text-white mb-4">{title}</h3>
                <p className="text-gray-400 mb-6">{message}</p>
                <div className="flex justify-center gap-4">
                    <button onClick={onCancel} className="btn btn-secondary">Cancel</button>
                    <button onClick={onConfirm} className="btn btn-danger">Confirm</button>
                </div>
            </div>
        </div>
    );
}


window.LegacyScriptView = () => {
    // Fetch state and handlers directly to avoid prop drilling
    const { video, handlers } = window.useAppState();
    const blueprint = video?.tasks?.scriptingV2_blueprint || {};

    const [showConfirmModal, setShowConfirmModal] = useState(false);

    // This handler will reset the blueprint to our new workflow's starting point
    const handleReset = () => {
        const newBlueprint = {
            workflowStatus: 'transcript_input',
            rawTranscript: '',
            dialogueMap: [],
            narrativeProposals: [],
            approvedNarrative: {},
            researchNotes: {},
            draftScript: [],
            finalScript: ''
        };
        handlers.updateVideo(video.id, { tasks: { ...video.tasks, scriptingV2_blueprint: newBlueprint } });
        setShowConfirmModal(false);
        handlers.displayNotification("Script has been reset. You can now begin the new workflow.", 'success');
    };

    // Use the most likely fields from the old blueprint formats
    const legacyScript = blueprint.finalScript || blueprint.full_video_script_text || 'No script content found in the old format.';

    return (
        <div className="p-4 border border-gray-700 rounded-lg">
            {showConfirmModal && (
                <window.ConfirmationModal
                    onConfirm={handleReset}
                    onCancel={() => setShowConfirmModal(false)}
                    title="Reset Script?"
                    message="Are you sure you want to delete this script and start over with the new workflow? This action cannot be undone."
                />
            )}

            <h2 className="text-xl font-bold text-yellow-400 mb-3">Legacy Script View</h2>
            <p className="mb-4 text-gray-400">
                This script was created with a previous version of the workflow. You can view it here, or choose to clear it and start fresh.
            </p>
            <div className="bg-gray-900 p-4 rounded-md mb-4">
                <pre className="whitespace-pre-wrap text-gray-300 font-sans">
                    {legacyScript}
                </pre>
            </div>
            <div className="mt-4 flex justify-end">
                <button
                    onClick={() => setShowConfirmModal(true)}
                    className="btn btn-warning"
                >
                    Clear & Rescript with New Workflow
                </button>
            </div>
        </div>
    );
};
