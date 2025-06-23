// creators-hub/js/components/TaskQueue.js

function TaskQueue(tasks, onHandleView) {
    if (!tasks) {
        return '';
    }

    const getStatusIcon = (status) => {
        switch (status) {
            case 'pending':
                return '<i class="fas fa-clock text-gray-400"></i>';
            case 'in-progress':
                return '<i class="fas fa-spinner fa-spin text-blue-500"></i>';
            case 'completed':
                return '<i class="fas fa-check-circle text-green-500"></i>';
            case 'failed':
                return '<i class="fas fa-exclamation-circle text-red-500"></i>';
            default:
                return '';
        }
    };
    
    const renderTask = (task) => {
        let taskOutput = `
            <div class="flex items-center justify-between p-2 border-b border-gray-700 last:border-b-0">
                <div class="flex items-center">
                    <div class="mr-3 w-5 text-center">${getStatusIcon(task.status)}</div>
                    <span class="text-sm">${task.name}</span>
                </div>
        `;
    
        if (task.status === 'completed' && task.result && task.result.link) {
            taskOutput += `<a href="${task.result.link}" target="_blank" class="text-sm text-blue-400 hover:underline">View Post</a>`;
        } else if (task.status === 'completed' && task.type === 'generateBlogContent' && task.result && task.result.viewable) {
             taskOutput += `<button class="view-generated-post-btn text-sm text-blue-400 hover:underline" data-task-id="${task.id}">View Post</button>`;
        } else if (task.status === 'failed') {
            taskOutput += `<span class="text-xs text-red-400" title="${task.result.error}">Failed</span>`;
        }
    
        taskOutput += `</div>`;
        return taskOutput;
    };

    // Only render the queue if there are tasks
    if (tasks.length === 0) {
        return '';
    }

    return `
        <div id="task-queue-ui" class="fixed bottom-4 right-4 bg-gray-800 text-white rounded-lg shadow-lg w-80 z-50 animate-fade-in-up">
            <div class="p-3 bg-gray-900 rounded-t-lg">
                <h4 class="font-bold">Task Queue</h4>
            </div>
            <div class="p-2 max-h-60 overflow-y-auto">
                ${tasks.map(renderTask).join('')}
            </div>
        </div>
    `;
}
