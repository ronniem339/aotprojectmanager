// creators-hub/js/components/TaskQueue.js
window.TaskQueue = ({ tasks, onView }) => {
    const { useEffect, useState } = React;
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (tasks && tasks.length > 0) {
            setVisible(true);
        }
    }, [tasks]);

    if (!visible || tasks.length === 0) return null;

    const getStatusIcon = (status) => {
        switch (status) {
            case 'pending': return <i className="fas fa-clock text-gray-400"></i>;
            case 'in-progress': return <i className="fas fa-spinner fa-spin text-blue-500"></i>;
            case 'completed': return <i className="fas fa-check-circle text-green-500"></i>;
            case 'failed': return <i className="fas fa-times-circle text-red-500"></i>;
            default: return null;
        }
    };
    
    return (
        <div className="fixed bottom-4 right-4 bg-gray-800 text-white rounded-lg shadow-2xl w-80 z-50 animate-fade-in-up border border-gray-700">
            <div className="p-3 bg-gray-900 rounded-t-lg">
                <h4 className="font-bold text-base">Task Queue</h4>
            </div>
            <div className="p-1 max-h-60 overflow-y-auto">
                {tasks.map(task => (
                    <div key={task.id} className="flex items-center justify-between p-2 border-b border-gray-700 last:border-b-0 text-sm">
                        <div className="flex items-center truncate">
                            <div className="mr-3 w-5 text-center flex-shrink-0">{getStatusIcon(task.status)}</div>
                            <span className="truncate" title={task.name}>{task.name}</span>
                        </div>
                        <div className="flex-shrink-0 ml-2">
                            {task.status === 'completed' && task.result?.link && (
                                <a href={task.result.link} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-xs">View on WP</a>
                            )}
                            {task.status === 'completed' && task.result?.viewable && (
                                <button onClick={() => onView(task.id)} className="text-blue-400 hover:underline text-xs">View Content</button>
                            )}
                            {task.status === 'failed' && (
                                <span className="text-red-400 text-xs" title={task.result?.error}>Failed</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
