// creators-hub/js/components/TaskQueue.js
window.TaskQueue = ({ tasks, onView, onRetry, onNavigateToTask }) => {
    const { useEffect, useState, useRef } = React;
    const [isVisible, setIsVisible] = useState(false);
    const prevTasksRef = useRef([]);

    const safeTasks = Array.isArray(tasks) ? tasks : [];

    // --- NEW: Audio Notification Logic ---
    useEffect(() => {
        // Function to play a soft notification sound
        const playCompletionSound = () => {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            if (!audioContext) return; // Web Audio API not supported

            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            // Configure the sound to be soft and brief
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.05); // Quick fade in
            oscillator.type = 'sine'; // A soft, clean tone
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime); // A pleasant pitch

            oscillator.start(audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.5); // Fade out
            oscillator.stop(audioContext.currentTime + 0.5);
        };

        // Compare previous tasks with current tasks to find newly completed ones
        const prevTasks = prevTasksRef.current;
        if (prevTasks.length > 0 || safeTasks.length > 0) {
            safeTasks.forEach(currentTask => {
                const prevTask = prevTasks.find(pt => pt.id === currentTask.id);
                if (prevTask && prevTask.status !== 'complete' && currentTask.status === 'complete') {
                    playCompletionSound();
                }
            });
        }

        // Update the ref with the current tasks for the next render
        prevTasksRef.current = safeTasks;

    }, [safeTasks]);
    // --- END: Audio Notification Logic ---

    useEffect(() => {
        // When tasks are first added, show the queue.
        if (safeTasks.length > 0 && prevTasksRef.current.length === 0) {
            setIsVisible(true);
        }
        // If all tasks are cleared, hide the queue.
        if (safeTasks.length === 0) {
            setIsVisible(false);
        }
    }, [safeTasks]);

    if (!isVisible) {
        if (safeTasks.length > 0) {
            return React.createElement('div', {
                className: "fixed bottom-4 right-4 z-[60]"
            }, React.createElement('button', {
                onClick: () => setIsVisible(true),
                className: "bg-indigo-600 text-white rounded-full shadow-lg p-3 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center"
            }, 
                React.createElement('i', { className: "fas fa-tasks mr-2" }),
                `Show Tasks (${safeTasks.length})`
            ));
        }
        return null;
    }

    const getStatusIcon = (status) => {
        switch (status) {
            case 'queued': return React.createElement('i', { className: "fas fa-clock text-gray-400" });
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
        React.createElement('div', { className: "fixed bottom-4 right-4 bg-gray-800 text-white rounded-lg shadow-2xl w-[500px] z-[60] animate-fade-in-up border border-gray-700" },
            React.createElement('div', { className: "relative flex justify-between items-center p-3 bg-gray-900 rounded-t-lg" },
                React.createElement('h4', { className: "font-bold text-base" }, "Task Queue"),
                React.createElement('button', { 
                    onClick: () => setIsVisible(false), 
                    className: "absolute top-2 right-3 text-gray-400 hover:text-white text-2xl leading-none",
                    'aria-label': 'Close Task Queue'
                }, '×')
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
