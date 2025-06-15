// js/components/ProjectView/ProjectHeader.js

const ProjectHeader = ({ project, onBack, onEdit }) => {
    const [isDescriptionVisible, setIsDescriptionVisible] = useState(false);

    return (
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
                 <button onClick={onBack} className="flex items-center gap-2 text-secondary-accent hover:text-secondary-accent-light mb-2">
                    ⬅️ Back to All Projects
                </button>
                <div className="flex items-center gap-3">
                    <h1 className="text-3xl lg:text-4xl font-bold text-white">{project.playlistTitle || 'Untitled Project'}</h1>
                    <button onClick={onEdit} className="p-2 rounded-full bg-gray-700/50 hover:bg-gray-600/50">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z" /></svg>
                    </button>
                </div>
                <div className="mt-2">
                    <button onClick={() => setIsDescriptionVisible(!isDescriptionVisible)} className="text-sm text-secondary-accent hover:text-secondary-accent-light">
                         {isDescriptionVisible ? 'Hide' : 'Show'} Description
                    </button>
                </div>
                {isDescriptionVisible && <p className="text-gray-400 mt-2 max-w-2xl">{project.playlistDescription || ''}</p>}
            </div>
        </header>
    );
};
