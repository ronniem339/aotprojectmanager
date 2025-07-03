// js/components/ProjectView/ProjectHeader.js

const { useState } = React;

// --- START: ADD NEW PROPS ---
window.ProjectHeader = ({ project, onBack, onEdit, onToggleSidebar, overallProgress, onManageFootage, hideDescription, onAddVideo, onToggleRightSidebar, isRightSidebarVisible }) => {
// --- END: ADD NEW PROPS ---
    const [isDescriptionVisible, setIsDescriptionVisible] = useState(false);

    // Only show the toggle button if description is not explicitly hidden
    const showDescriptionToggle = !hideDescription;

    return (
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div className="flex items-center w-full sm:w-auto">
                {/* Hamburger menu for mobile sidebar toggle */}
                <button 
                    onClick={onToggleSidebar} 
                    className="p-2 mr-3 rounded-md text-gray-400 hover:bg-gray-700/50 hover:text-white transition-colors"
                    aria-label="Toggle video list"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"></path></svg>
                </button>

                {/* Back button */}
                <button onClick={onBack} className="p-2 rounded-full bg-gray-700/50 hover:bg-gray-600/50 text-gray-400 hover:text-white transition-colors" aria-label="Back to all projects">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </button>
            </div>
            
            <div className="flex flex-col flex-grow items-start w-full mt-4 sm:mt-0">
                <div className="flex items-center gap-3 w-full">
                    {/* Project title */}
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white leading-tight truncate">{project.playlistTitle || 'Untitled Project'}</h1>
                    
                    {/* Edit button */}
                    <button onClick={onEdit} className="p-2 rounded-full bg-gray-700/50 hover:bg-gray-600/50 text-gray-400 hover:text-white transition-colors flex-shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z" /></svg>
                    </button>

                    {/* Info Icon to toggle description - conditionally rendered */}
                    {showDescriptionToggle && (
                        <button 
                            onClick={() => setIsDescriptionVisible(!isDescriptionVisible)} 
                            className="p-2 rounded-full bg-gray-700/50 hover:bg-gray-600/50 text-gray-400 hover:text-white transition-colors flex-shrink-0"
                            aria-label="Toggle project description"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                        </button>
                    )}
                    
                    {/* Manage Footage button */}
                    <button
                        onClick={onManageFootage}
                        className="flex-shrink-0 p-2 rounded-full bg-gray-700/50 hover:bg-gray-600/50 text-gray-400 hover:text-white transition-colors"
                        title="Manage Project Footage"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-2m3 2v-2M9 9H7a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2v-2m0-4h4a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9a2 2 0 012-2h4a2 2 0 012 2v.5m-4 10.5H12"></path>
                        </svg>
                    </button>

                    {/* --- START: ADD THIS BUTTON --- */}
                    <button
                        onClick={onToggleRightSidebar}
                        className={`flex-shrink-0 p-2 rounded-full transition-colors ${isRightSidebarVisible ? 'bg-gray-700/50 hover:bg-gray-600/50 text-gray-400 hover:text-white' : 'bg-primary-accent hover:bg-primary-accent-darker text-gray-900'}`}
                        title={isRightSidebarVisible ? 'Hide Details Sidebar' : 'Show Details Sidebar'}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            {isRightSidebarVisible ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7" />
                            )}
                        </svg>
                    </button>
                    {/* --- END: ADD THIS BUTTON --- */}


                    {/* NEW: Add Video Button */}
                    {onAddVideo && ( // Only render if onAddVideo prop is provided
                        <button
                            onClick={onAddVideo}
                            className="flex-shrink-0 p-2 rounded-full bg-primary-accent hover:bg-primary-accent-darker text-gray-900 transition-colors"
                            title="Add New Video"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"></path>
                            </svg>
                        </button>
                    )}
                </div>
                
                {/* Overall Project Progress Bar */}
                <div className="w-full mt-3">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-semibold text-gray-400">Overall Project Progress</span>
                        <span className="text-xs font-bold text-green-400">{`${overallProgress.toFixed(0)}%`}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2.5">
                        <div 
                            className="bg-green-500 h-2.5 rounded-full transition-all duration-500 ease-out" 
                            style={{width: `${overallProgress}%`}}>
                        </div>
                    </div>
                </div>


                {/* Conditionally rendered description with smooth transition */}
                {/* Render only if showDescriptionToggle is true and content exists */}
                {showDescriptionToggle && (project.playlistDescription || isDescriptionVisible) && (
                    <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isDescriptionVisible ? 'max-h-96 mt-2' : 'max-h-0'}`}>
                        <p className="text-gray-400 max-w-4xl text-sm leading-relaxed glass-card p-4 rounded-lg">
                            {project.playlistDescription || 'No description provided.'}
                        </p>
                    </div>
                )}
            </div>
        </header>
    );
};
