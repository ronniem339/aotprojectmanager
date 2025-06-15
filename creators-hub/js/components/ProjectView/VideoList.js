// js/components/ProjectView/VideoList.js

const { useState } = React; // Add React import for useState

window.VideoList = ({ videos, activeVideoId, onSelectVideo, onEditVideo, onReorder }) => {
    const [draggedItem, setDraggedItem] = useState(null);

    const calculateProgress = (tasks) => {
        if (!tasks) return 0;
        // Use the globally accessible TASK_PIPELINE from config.js
        const completedTasks = window.CREATOR_HUB_CONFIG.TASK_PIPELINE.filter(task => tasks[task.id] === 'complete').length;
        return (completedTasks / window.CREATOR_HUB_CONFIG.TASK_PIPELINE.length) * 100;
    };

    const handleDragStart = (e, video) => {
        setDraggedItem(video);
        e.dataTransfer.effectAllowed = 'move';
        // For Firefox compatibility, set dataTransfer on the target itself
        e.dataTransfer.setData('text/plain', video.id); 
    };

    const handleDragOver = (e) => {
        e.preventDefault(); // Necessary to allow dropping
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e, targetItem) => {
        e.preventDefault();
        if (!draggedItem || draggedItem.id === targetItem.id) return;
        onReorder(draggedItem, targetItem);
        setDraggedItem(null);
    };

    const handleDragEnd = () => {
        setDraggedItem(null);
    };

    return (
        <div className="glass-card p-2 rounded-lg flex-grow overflow-y-auto">
            <h2 className="text-lg font-semibold mb-3 px-2 hidden lg:block">Videos</h2> {/* Hide on mobile, shown in sidebar header */}
            <div className="space-y-1">
                {videos.length === 0 ? (
                    <p className="text-gray-400 p-4 text-center">No videos in this project yet.</p>
                ) : (
                    videos.map(video => {
                        const progress = calculateProgress(video.tasks);
                        const isActive = activeVideoId === video.id;
                        const isDragging = draggedItem && draggedItem.id === video.id;

                        return (
                            <div key={video.id} 
                                 draggable="true" // Make items draggable
                                 onDragStart={(e) => handleDragStart(e, video)}
                                 onDragOver={handleDragOver}
                                 onDrop={(e) => handleDrop(e, video)}
                                 onDragEnd={handleDragEnd}
                                 className={`flex items-center gap-2 rounded-lg transition-colors cursor-pointer relative group ${isDragging ? 'opacity-50 border border-primary-accent' : ''} ${isActive ? 'bg-primary-accent text-gray-900 shadow-lg' : 'bg-gray-800/50 hover:bg-gray-700/60'}`}
                            >
                                {/* Drag handle */}
                                <div className={`p-3 text-gray-500 cursor-grab ${isActive ? 'text-gray-900' : 'group-hover:text-white'}`}>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                                </div>
                                {/* Video Info and Progress */}
                                <button
                                    onClick={() => onSelectVideo(video.id)}
                                    className={`flex-grow text-left p-3 py-2 flex flex-col ${isActive ? 'text-gray-900' : 'text-white'}`}
                                >
                                    <p className="font-semibold text-base leading-tight truncate">{video.chosenTitle || video.title}</p>
                                    <div className="w-full bg-gray-600 rounded-full h-1.5 mt-2">
                                        <div className="bg-green-500 h-1.5 rounded-full" style={{width: `${progress}%`}}></div>
                                    </div>
                                </button>
                                {/* Edit button */}
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onEditVideo(video); }} 
                                    className={`p-2 mr-2 rounded-full transition-colors ${isActive ? 'bg-gray-900 text-primary-accent hover:bg-gray-700' : 'hover:bg-gray-600/80 text-gray-400 group-hover:text-white'}`}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z" /></svg>
                                </button>
                            </div>
                        );
                    })}
                )}
            </div>
        </div>
    );
};
