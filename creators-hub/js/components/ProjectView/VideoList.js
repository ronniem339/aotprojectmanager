// js/components/ProjectView/VideoList.js

window.VideoList = ({ videos, activeVideoId, onSelectVideo, onEditVideo, onReorder, onDeleteVideo }) => {
    const { useState } = React;
    const [draggedItem, setDraggedItem] = useState(null);

    const calculateProgress = (tasks) => {
        if (!tasks || !window.CREATOR_HUB_CONFIG.TASK_PIPELINE.length) return 0;
        const completedTasks = window.CREATOR_HUB_CONFIG.TASK_PIPELINE.filter(task => tasks[task.id] === 'complete').length;
        return (completedTasks / window.CREATOR_HUB_CONFIG.TASK_PIPELINE.length) * 100;
    };

    const handleDragStart = (e, video) => {
        setDraggedItem(video);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', video.id);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
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
    
    // Custom Modal for Delete Confirmation
    const DeleteConfirmationModal = ({ onConfirm, onCancel, videoTitle }) => (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-[60]">
            <div className="glass-card rounded-lg p-8 w-full max-w-md text-center">
                <h3 className="text-2xl font-bold mb-4">Delete Video?</h3>
                <p className="text-gray-300 mb-6">
                    Are you sure you want to permanently delete the video: <br/>
                    <strong className="text-primary-accent">{videoTitle}</strong>?
                    <br/>This action cannot be undone.
                </p>
                <div className="flex justify-center gap-4">
                    <button onClick={onCancel} className="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold">Cancel</button>
                    <button onClick={onConfirm} className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-semibold">Yes, Delete</button>
                </div>
            </div>
        </div>
    );

    const [videoToDelete, setVideoToDelete] = useState(null);

    const handleDeleteClick = (e, video) => {
        e.stopPropagation();
        setVideoToDelete(video);
    };

    const confirmDelete = () => {
        if(videoToDelete) {
            onDeleteVideo(videoToDelete);
            setVideoToDelete(null);
        }
    };

    return (
        <div className="h-full flex flex-col">
            <h2 className="text-lg font-semibold mb-3 px-4 flex-shrink-0 hidden md:block">Videos</h2>
            <div className="flex-grow overflow-y-auto custom-scrollbar p-2">
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
                                     draggable="true"
                                     onDragStart={(e) => handleDragStart(e, video)}
                                     onDragOver={handleDragOver}
                                     onDrop={(e) => handleDrop(e, video)}
                                     onDragEnd={handleDragEnd}
                                     onClick={() => onSelectVideo(video.id)}
                                     className={`flex items-center gap-2 rounded-lg transition-colors cursor-pointer relative group p-2 pr-1
                                         ${isDragging ? 'opacity-50 border border-dashed border-primary-accent' : ''} 
                                         ${isActive ? 'bg-primary-accent shadow-lg' : 'bg-gray-800/50 hover:bg-gray-700/60'}`}
                                >
                                    {/* Drag handle */}
                                    <div className={`flex-shrink-0 p-1 cursor-grab ${isActive ? 'text-gray-800' : 'text-gray-500 group-hover:text-white'}`}>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                                    </div>
                                    
                                    {/* Video Info and Progress - This container will grow and allow text to truncate */}
                                    <div className="flex-grow min-w-0 text-left">
                                        <p className={`font-semibold text-sm leading-normal ${isActive ? 'text-gray-900' : 'text-white'}`}>{video.chosenTitle || video.title}</p>
                                        <div className={`w-full rounded-full h-1 mt-1 ${isActive ? 'bg-black/20' : 'bg-gray-600'}`}>
                                            <div className="bg-green-500 h-1 rounded-full" style={{width: `${progress}%`}}></div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onEditVideo(video); }} 
                                        className={`flex-shrink-0 p-1.5 ml-1 rounded-full transition-colors ${isActive ? 'text-gray-800 hover:bg-black/10' : 'text-gray-400 hover:bg-gray-600/80 group-hover:text-white'}`}
                                        title="Edit Video Details"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z" /></svg>
                                    </button>
                                    <button
                                        onClick={(e) => handleDeleteClick(e, video)}
                                        className={`flex-shrink-0 p-1.5 ml-1 rounded-full transition-colors ${isActive ? 'text-red-800 hover:bg-black/10' : 'text-gray-400 hover:bg-gray-600/80 group-hover:text-red-400'}`}
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
            {videoToDelete && (
                <DeleteConfirmationModal 
                    onConfirm={confirmDelete}
                    onCancel={() => setVideoToDelete(null)}
                    videoTitle={videoToDelete.chosenTitle || videoToDelete.title}
                />
            )}
        </div>
    );
};
