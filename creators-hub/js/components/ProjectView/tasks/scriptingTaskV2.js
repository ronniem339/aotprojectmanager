// creators-hub/js/components/ProjectView/tasks/scriptingTaskV2.js

// This is the main entry point for the new Scripting V2 workflow.
// It will be rendered in the main task list in the ProjectView.

const { useState, useMemo } = React;

// The placeholder component has been removed.

window.ScriptingTaskV2 = ({ video, settings, onUpdateTask, isLocked, project, userId, db, allVideos, onUpdateSettings, onNavigate }) => {
    // State to control the visibility of the new workspace modal.
    const [showV2Workspace, setShowV2Workspace] = useState(false);

    // This function will be called to open the new workspace.
    const handleOpenV2Workspace = () => {
        if (isLocked) {
            // Optionally, show a message that previous tasks must be completed.
            console.log("Scripting V2 is locked until previous tasks are complete.");
            return;
        }
        setShowV2Workspace(true);
    };

    // This function will be passed to the workspace to handle closing it.
    const handleCloseV2Workspace = () => {
        setShowV2Workspace(false);
    };

    // Render the button to launch the new V2 workflow.
    return React.createElement('div', { className: 'text-center py-4' },
        React.createElement('p', { className: 'text-gray-400 mb-4' }, 'A new, more powerful scripting experience is available.'),
        React.createElement('button', {
            onClick: handleOpenV2Workspace,
            disabled: isLocked,
            className: 'button-primary disabled:opacity-50 disabled:cursor-not-allowed'
        }, 'Try the New Scripting Workspace (Beta)'),

        // When showV2Workspace is true, render the new workspace component as a portal.
        // We now correctly call the component from the window object.
        showV2Workspace && ReactDOM.createPortal(
            React.createElement(window.ScriptingV2_Workspace, {
                video: video,
                project: project,
                settings: settings,
                // --- THIS IS THE FIX ---
                // Pass the 'onUpdateTask' function directly without wrapping it.
                // This preserves the correct function signature.
                onUpdateTask: onUpdateTask,
                onClose: handleCloseV2Workspace,
                userId: userId,
                db: db
            }),
            document.body // Mount the portal directly on the body element.
        )
    );
};
