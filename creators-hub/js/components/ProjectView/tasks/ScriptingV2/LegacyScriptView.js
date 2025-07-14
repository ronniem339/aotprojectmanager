const { useState } = React;

window.LegacyScriptView = ({ video, handlers }) => {
    const blueprint = video?.tasks?.scriptingV2_blueprint || {};
    const [showConfirmModal, setShowConfirmModal] = useState(false);

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
                <pre className="whitespace-pre-wrap text-gray-300 font-sans">{legacyScript}</pre>
            </div>
            <div className="mt-4 flex justify-end">
                <button onClick={() => setShowConfirmModal(true)} className="btn btn-warning">
                    Clear & Rescript with New Workflow
                </button>
            </div>
        </div>
    );
};
