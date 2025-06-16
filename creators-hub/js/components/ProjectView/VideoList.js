// js/components/ProjectView/VideoList.js

const { useState } = React; // Add React import for useState

window.VideoList = ({ videos, activeVideoId, onSelectVideo, onEditVideo, onReorder, onDeleteVideo }) => { // Added onDeleteVideo
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
                    <p className="text-gray-400 p-4 text-center text-sm">No videos in this project yet.</p>
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
                                 // Added flex-nowrap to prevent content from forcing horizontal scroll
                                 className={`flex items-center flex-nowrap gap-2 rounded-lg transition-colors cursor-pointer relative group p-2 pr-1
                                             ${isDragging ? 'opacity-50 border border-primary-accent' : ''} 
                                             ${isActive ? 'bg-primary-accent text-gray-900 shadow-lg' : 'bg-gray-800/50 hover:bg-gray-700/60'}`}
                            >
                                {/* Drag handle */}
                                <div className={`flex-shrink-0 p-1 text-gray-500 cursor-grab ${isActive ? 'text-gray-900' : 'group-hover:text-white'}`}>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                                </div>
                                {/* Video Info and Progress */}
                                {/* flex-grow and min-w-0 ensures text truncates without pushing content */}
                                <button
                                    onClick={() => onSelectVideo(video.id)}
                                    className={`flex-grow min-w-0 text-left flex flex-col ${isActive ? 'text-gray-900' : 'text-white'}`}
                                >
                                    <p className="font-semibold text-sm leading-tight truncate">{video.chosenTitle || video.title}</p>
                                    <div className="w-full bg-gray-600 rounded-full h-1 mt-1">
                                        <div className="bg-green-500 h-1 rounded-full" style={{width: `${progress}%`}}></div>
                                    </div>
                                </button>
                                {/* Edit button */}
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onEditVideo(video); }} 
                                    className={`flex-shrink-0 p-1 ml-1 rounded-full transition-colors ${isActive ? 'bg-gray-900 text-primary-accent hover:bg-gray-700' : 'hover:bg-gray-600/80 text-gray-400 group-hover:text-white'}`}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z" /></svg>
                                </button>
                                {/* NEW: Delete button for videos */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDeleteVideo(video); }}
                                    className={`flex-shrink-0 p-1 ml-1 rounded-full transition-colors ${isActive ? 'bg-gray-900 text-red-400 hover:bg-gray-700' : 'hover:bg-gray-600/80 text-gray-400 group-hover:text-red-400'}`}
                                    title="Delete Video"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                </button>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

