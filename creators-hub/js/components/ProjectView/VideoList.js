// js/components/ProjectView/VideoList.js

const { useState } = React; // Add React import for useState

window.VideoList = ({ videos, activeVideoId, onSelectVideo, onEditVideo, onReorder }) => {
    const [draggedItem, setDraggedItem] = useState(null);

    const calculateProgress = (tasks) => {
        if (!tasks) return 0;
        // Assuming TASK_PIPELINE is globally accessible or passed down
        const completedTasks = window.TASK_PIPELINE.filter(task => tasks[task.id] === 'complete').length;
        return (completedTasks / window.TASK_PIPELINE.length) * 100;
    };

    const handleDragStart = (e, video) => {
        setDraggedItem(video);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.target); // For firefox compatibility
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleDrop = (e, targetItem) => {
        if (!draggedItem || draggedItem.id === targetItem.id) return;
        onReorder(draggedItem, targetItem);
        setDraggedItem(null);
    };

    return (
        <aside className="lg:w-1/3 xl:w-1/4">
            <div className="glass-card p-4 rounded-lg">
                <h2 className="text-lg font-semibold mb-3 px-2">Videos</h2>
                <div className="space-y-1">
                    {videos.map(video => {
                        const progress = calculateProgress(video.tasks);
                        const isDragging = draggedItem && draggedItem.id === video.id;
                        return (
                            <div key={video.id} 
                                 draggable 
                                 onDragStart={(e) => handleDragStart(e, video)}
                                 onDrop={(e) => handleDrop(e, video)}
                                 onDragOver={handleDragOver}
                                 className={`flex items-center gap-2 rounded-lg transition-colors cursor-move ${isDragging ? 'opacity-50' : ''} ${activeVideoId === video.id ? 'bg-primary-accent' : 'bg-gray-800/50 hover:bg-gray-700/60'}`}>
                                <div className="p-3 text-gray-500 hover:text-white">
                                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                                </div>
                                <button
                                    onClick={() => onSelectVideo(video.id)}
                                    className="flex-grow text-left p-3 pr-1"
                                >
                                    <p className="font-semibold text-white">{video.chosenTitle || video.title}</p>
                                    <div className="w-full bg-gray-600 rounded-full h-1.5 mt-2">
                                        <div className="bg-green-500 h-1.5 rounded-full" style={{width: `${progress}%`}}></div>
                                    </div>
                                </button>
                                <button onClick={() => onEditVideo(video)} className="p-2 mr-2 rounded-full hover:bg-gray-600/80">
                                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z" /></svg>
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </aside>
    );
};
