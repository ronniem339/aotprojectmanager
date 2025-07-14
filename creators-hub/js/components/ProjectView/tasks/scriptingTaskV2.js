// FILE: ./creators-hub/js/components/ProjectView/tasks/scriptingTaskV2.js
// This is the complete, updated file for the new architecture.

// The component now receives the 'onOpenWorkspace' function as a prop
// from VideoWorkspace.js. All other props are passed down from the task pipeline.
const scriptingTaskV2 = ({ onOpenWorkspace, isLocked }) => {

    // This component's only job is to provide the button that triggers
    // the parent component to open the main workspace.
    return (
        <div className="flex justify-end">
            <button
                // The onClick now calls the function passed down from the parent.
                onClick={onOpenWorkspace}
                disabled={isLocked}
                className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
                Open Scripting Workspace
            </button>
        </div>
    );
};

// Assign the component to the window object so it can be rendered dynamically.
window.scriptingTaskV2 = scriptingTaskV2;
