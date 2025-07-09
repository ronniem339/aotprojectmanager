// creators-hub/js/components/TaskQueue.js
window.TaskQueue = ({ tasks, onView, onRetry, onNavigateToTask }) => { // Added onNavigateToTask
    const { useEffect, useState } = React;
    const [visible, setVisible] = useState(false);

    const safeTasks = Array.isArray(tasks) ? tasks : [];

    useEffect(() => {
        setVisible(safeTasks.length > 0);
    }, [safeTasks]);

    if (!visible) {
        return null;
    }

    const getStatusIcon = (status) => {
        switch (status) {
            case 'queued': return React.createElement('i', { className: "fas fa-clock text-gray-400" });
            // **FIX**: Correctly show spinner for 'in-progress' status
            case 'in-progress':
            case 'generating':
            case 'publishing':
                return React.createElement('i', { className: "fas fa-spinner fa-spin text-indigo-500" });
            case 'complete': return React.createElement('i', { className: "fas fa-check-circle text-green-500" });
            case 'failed': return React.createElement('i', { className: "fas fa-times-circle text-red-500" });
            default: return null;
        }
    };
    
    return (
        React.createElement('div', { className: "fixed bottom-4 right-4 bg-gray-800 text-white rounded-lg shadow-2xl w-[500px] z-50 animate-fade-in-up border border-gray-700" },
            React.createElement('div', { className: "p-3 bg-gray-900 rounded-t-lg" },
                React.createElement('h4', { className: "font-bold text-base" }, "Task Queue")
            ),
            React.createElement('div', { className: "p-1 max-h-60 overflow-y-auto" },
                safeTasks.map(task => (
                    React.createElement('div', { key: task.id, className: "flex items-center justify-between p-2 border-b border-gray-700 last:border-b-0 text-sm" },
                        React.createElement('div', { className: "flex items-center truncate" },
                            React.createElement('div', { className: "mr-3 w-5 text-center flex-shrink-0" }, getStatusIcon(task.status)),
                            React.createElement('span', { className: "truncate", title: task.name }, task.name)
                        ),
                        React.createElement('div', { className: "flex-shrink-0 ml-2" },
                            task.status === 'complete' && task.result?.link && (
                                React.createElement('a', { href: task.result.link, target: "_blank", rel: "noopener noreferrer", className: "text-blue-400 hover:underline text-xs" }, "View on WP")
                            ),
                            task.status === 'complete' && task.result?.viewable && (
                                React.createElement('button', { onClick: () => onView(task.id), className: "text-blue-400 hover:underline text-xs" }, "View Content")
                            ),
                             // **NEW**: "View" button for completed scripting tasks
                            task.status === 'complete' && task.type.startsWith('scriptingV2-') && (
                                React.createElement('button', { onClick: () => onNavigateToTask(task), className: "text-blue-400 hover:underline text-xs" }, "View")
                            ),
                            task.status === 'failed' && (
                                React.createElement('span', { className: "text-red-400 text-xs mr-2", title: task.result?.error }, "Failed")
                            ),
                            task.status === 'failed' && onRetry && (
                                React.createElement('button', { onClick: () => onRetry(task.id), className: "text-yellow-400 hover:underline text-xs" }, "Retry")
                            )
                        )
                    )
                ))
            )
        )
    );
};
