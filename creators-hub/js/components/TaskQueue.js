// creators-hub/js/components/TaskQueue.js
window.TaskQueue = ({ tasks, onView, onRetry }) => {
    const { useEffect, useState } = React;
    const [visible, setVisible] = useState(false);

    // Ensure tasks is always an array to prevent .map() errors.
    const safeTasks = Array.isArray(tasks) ? tasks : [];

    useEffect(() => {
        // Only show the queue if there are tasks
        setVisible(safeTasks.length > 0);
    }, [safeTasks]);

    if (!visible) {
        return null;
    }

    const getStatusIcon = (status) => {
        switch (status) {
            case 'queued': return <i className="fas fa-clock text-gray-400"></i>;
            case 'generating': return <i className="fas fa-spinner fa-spin text-indigo-500"></i>;
            case 'publishing': return <i className="fas fa-spinner fa-spin text-purple-500"></i>;
            case 'complete': return <i className="fas fa-check-circle text-green-500"></i>;
            case 'failed': return <i className="fas fa-times-circle text-red-500"></i>;
            default: return null;
        }
    };
    
    return (
        <div className="fixed bottom-4 right-4 bg-gray-800 text-white rounded-lg shadow-2xl w-[500px] z-50 animate-fade-in-up border border-gray-700">
            <div className="p-3 bg-gray-900 rounded-t-lg">
                <h4 className="font-bold text-base">Task Queue</h4>
            </div>
            <div className="p-1 max-h-60 overflow-y-auto">
                {safeTasks.map(task => (
                    <div key={task.id} className="flex items-center justify-between p-2 border-b border-gray-700 last:border-b-0 text-sm">
                        <div className="flex items-center truncate">
                            <div className="mr-3 w-5 text-center flex-shrink-0">{getStatusIcon(task.status)}</div>
                            <span className="truncate" title={task.name}>{task.name}</span>
                        </div>
                        <div className="flex-shrink-0 ml-2">
                            {task.status === 'complete' && task.result?.link && (
                                <a href={task.result.link} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-xs">View on WP</a>
                            )}
                            {task.status === 'complete' && task.result?.viewable && (
                                <button onClick={() => onView(task.id)} className="text-blue-400 hover:underline text-xs">View Content</button>
                            )}
                            {task.status === 'failed' && (
                                <span className="text-red-400 text-xs mr-2" title={task.result?.error}>Failed</span>
                            )}
                            {task.status === 'failed' && onRetry && (
                                <button onClick={() => onRetry(task.id)} className="text-yellow-400 hover:underline text-xs">Retry</button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
