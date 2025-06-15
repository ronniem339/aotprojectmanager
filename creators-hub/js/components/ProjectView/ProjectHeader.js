// js/components/ProjectView/ProjectHeader.js

const { useState } = React;

window.ProjectHeader = ({ project, onBack, onEdit, onToggleSidebar }) => {
    const [isDescriptionVisible, setIsDescriptionVisible] = useState(false);

    return (
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div className="flex items-center w-full sm:w-auto">
                {/* Hamburger menu for mobile sidebar toggle */}
                <button 
                    onClick={onToggleSidebar} 
                    className="p-2 mr-3 rounded-md lg:hidden text-gray-400 hover:bg-gray-700/50 hover:text-white transition-colors"
                    aria-label="Toggle video list"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"></path></svg>
                </button>

                <button onClick={onBack} className="flex items-center gap-2 text-secondary-accent hover:text-secondary-accent-light mb-0"> {/* Adjusted margin-bottom */}
                    ⬅️ Back to All Projects
                </button>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between sm:justify-end flex-grow gap-3 mt-4 sm:mt-0">
                <div className="flex items-center gap-3">
                    <h1 className="text-3xl lg:text-4xl font-bold text-white leading-tight">{project.playlistTitle || 'Untitled Project'}</h1>
                    <button onClick={onEdit} className="p-2 rounded-full bg-gray-700/50 hover:bg-gray-600/50 text-gray-400 hover:text-white transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z" /></svg>
                    </button>
                </div>
                <div className="mt-2 sm:mt-0 w-full sm:w-auto">
                    <button onClick={() => setIsDescriptionVisible(!isDescriptionVisible)} className="text-sm text-secondary-accent hover:text-secondary-accent-light w-full text-left sm:text-right">
                         {isDescriptionVisible ? 'Hide Description' : 'Show Description'}
                    </button>
                    {isDescriptionVisible && <p className="text-gray-400 mt-2 max-w-2xl text-sm leading-relaxed">{project.playlistDescription || ''}</p>}
                </div>
            </div>
        </header>
    );
};
