// creators-hub/js/components/ProjectView/tasks/scriptingTaskV2.js

const { useState, Fragment } = React;

// By destructuring `props`, we can be more explicit about what's being used.
// The `...rest` pattern collects all other props into a single object.
window.ScriptingTaskV2 = (props) => {
    const { isLocked, initialStep, ...rest } = props;
    const [showWorkspace, setShowWorkspace] = useState(false);

    const openWorkspace = () => {
        if (isLocked) {
            console.log("Scripting V2 is locked until previous tasks are complete.");
            return;
        }
        setShowWorkspace(true);
    };

    const closeWorkspace = () => {
        setShowWorkspace(false);
    };

    // If an initial step is provided, open the workspace automatically.
    React.useEffect(() => {
        if (initialStep) {
            openWorkspace();
        }
    }, [initialStep]);

    const renderTaskSummary = () => {
        return React.createElement('div', { className: 'text-center py-4' },
            React.createElement('p', { className: 'text-gray-400 mb-4' }, 'A new, more powerful scripting experience is available.'),
            React.createElement('button', {
                onClick: openWorkspace,
                disabled: isLocked,
                className: 'btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed'
            }, 'Try the New Scripting Workspace (Beta)')
        );
    };

    return React.createElement(Fragment, null,
        !showWorkspace && renderTaskSummary(),

        showWorkspace && ReactDOM.createPortal(
            React.createElement(window.ScriptingV2_Workspace, {
                ...rest,
                initialStep: initialStep, // Pass the initial step to the workspace
                onClose: closeWorkspace
            }),
            document.body
        )
    );
};
