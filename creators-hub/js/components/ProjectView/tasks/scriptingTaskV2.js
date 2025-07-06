// creators-hub/js/components/ProjectView/tasks/scriptingTaskV2.js

const { useState, Fragment } = React;
const { ScriptingV2_Workspace } = window; // Keep this for clarity, though it's on window

window.ScriptingTaskV2 = (props) => { // MODIFICATION: We will now pass the whole 'props' object
    const [showWorkspace, setShowWorkspace] = useState(false);

    const openWorkspace = () => {
        if (props.isLocked) {
            console.log("Scripting V2 is locked until previous tasks are complete.");
            return;
        }
        setShowWorkspace(true);
    };

    const closeWorkspace = () => {
        setShowWorkspace(false);
    };

    const renderTaskSummary = () => {
        return React.createElement('div', { className: 'text-center py-4' },
            React.createElement('p', { className: 'text-gray-400 mb-4' }, 'A new, more powerful scripting experience is available.'),
            React.createElement('button', {
                onClick: openWorkspace,
                disabled: props.isLocked,
                className: 'button-primary disabled:opacity-50 disabled:cursor-not-allowed'
            }, 'Try the New Scripting Workspace (Beta)')
        );
    };

    return React.createElement(Fragment, null,
        !showWorkspace && renderTaskSummary(),

        // When showV2Workspace is true, render the new workspace component as a portal.
        showWorkspace && ReactDOM.createPortal(
            // MODIFICATION: Spread all received props (...) into the workspace.
            // This will correctly pass down the 'handlers' object and all others.
            React.createElement(window.ScriptingV2_Workspace, {
                ...props,
                onClose: closeWorkspace // We override onClose with our local close handler.
            }),
            document.body
        )
    );
};
