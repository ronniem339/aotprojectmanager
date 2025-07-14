const scriptingTaskV2 = ({ onOpenWorkspace, isLocked }) => {
    return (
        <div className="flex justify-end">
            <button
                onClick={onOpenWorkspace}
                disabled={isLocked}
                className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
                Open Scripting Workspace
            </button>
        </div>
    );
};
window.scriptingTaskV2 = scriptingTaskV2;
