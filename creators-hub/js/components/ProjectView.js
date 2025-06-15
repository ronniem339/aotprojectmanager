// js/components/ImportProjectView.js

const ImportProjectView = ({ onAnalyze, onBack, isLoading }) => {
    const [playlistTitle, setPlaylistTitle] = useState('');
    const [projectOutline, setProjectOutline] = useState('');
    const [playlistDescription, setPlaylistDescription] = useState('');
    const [videos, setVideos] = useState([{ title: '', concept: '', script: '' }]);

    const handleVideoChange = (index, field, value) => {
        const newVideos = [...videos];
        newVideos[index][field] = value;
        setVideos(newVideos);
    };

    const addVideo = () => {
        setVideos([...videos, { title: '', concept: '', script: '' }]);
    };

    const removeVideo = (index) => {
        const newVideos = videos.filter((_, i) => i !== index);
        setVideos(newVideos);
    };

    const handleAnalyzeClick = () => {
        // Basic validation
        if (!playlistTitle || videos.some(v => !v.title)) {
            // Replaced alert with console.error as per instructions.
            console.error('Please provide at least a playlist title and a title for each video.');
            return;
        }
        const projectData = {
            playlistTitle,
            projectOutline,
            playlistDescription,
            videos,
        };
        onAnalyze(projectData);
    };

    return (
        <div className="p-8">
             {isLoading && (
                <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4">
                   <LoadingSpinner text="Analyzing your project and building a plan..." />
                </div>
            )}
            <button onClick={onBack} className="flex items-center gap-2 text-secondary-accent hover:text-secondary-accent-light mb-6">
                ⬅️ Back to Dashboard
            </button>
            <h1 className="text-4xl font-bold mb-2">Import Existing Project</h1>
            <p className="text-gray-400 mb-8">Paste your existing project content here. We'll analyze it and help you complete the series.</p>
            
            <div className="space-y-6">
                <div className="p-6 glass-card rounded-lg">
                    <h2 className="text-2xl font-semibold mb-4">Playlist Details</h2>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Playlist Title</label>
                        <input 
                            type="text"
                            value={playlistTitle}
                            onChange={(e) => setPlaylistTitle(e.target.value)}
                            className="w-full form-input"
                            placeholder="Enter the title for the entire series"
                        />
                    </div>
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-300 mb-1">Overall Project Plan / Concept <span className="text-gray-400">(Optional)</span></label>
                        <textarea
                            value={projectOutline}
                            onChange={(e) => setProjectOutline(e.target.value)}
                            rows="4"
                            className="w-full form-textarea"
                            placeholder="Provide a brief outline or concept for the entire video series."
                        ></textarea>
                    </div>
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-300 mb-1">Existing Playlist Description <span className="text-gray-400">(Optional)</span></label>
                        <textarea
                            value={playlistDescription}
                            onChange={(e) => setPlaylistDescription(e.target.value)}
                            rows="5"
                            className="w-full form-textarea"
                            placeholder="If you have a full playlist description already written, paste it here."
                        ></textarea>
                    </div>
                </div>

                <div className="p-6 glass-card rounded-lg">
                    <h2 className="text-2xl font-semibold mb-4">Videos</h2>
                    <div className="space-y-6">
                        {videos.map((video, index) => (
                            <div key={index} className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 relative">
                                <h3 className="text-lg font-bold text-primary-accent mb-3">Video {index + 1}</h3>
                                {videos.length > 1 && (
                                    <button onClick={() => removeVideo(index)} className="absolute top-3 right-3 text-red-400 hover:text-red-300">&times; Remove</button>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Video Title</label>
                                    <input type="text" value={video.title} onChange={(e) => handleVideoChange(index, 'title', e.target.value)} className="w-full form-input" placeholder="Title for this specific video"/>
                                </div>
                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Concept / Description</label>
                                    <textarea value={video.concept} onChange={(e) => handleVideoChange(index, 'concept', e.target.value)} rows="3" className="w-full form-textarea" placeholder="Brief concept or description for this video"></textarea>
                                </div>
                                 <div className="mt-4">
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Full Script / Transcript (Optional)</label>
                                    <textarea value={video.script} onChange={(e) => handleVideoChange(index, 'script', e.target.value)} rows="8" className="w-full form-textarea" placeholder="Paste the full script here if you have it. This will improve AI suggestions later."></textarea>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button onClick={addVideo} className="mt-6 px-4 py-2 bg-secondary-accent hover:bg-secondary-accent-darker rounded-lg text-sm font-semibold">
                        + Add Another Video
                    </button>
                </div>
                 <div className="text-right">
                    <button onClick={handleAnalyzeClick} className="px-8 py-3 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold transition-colors">
                        Analyze & Plan Project 🪄
                    </button>
                </div>
            </div>
        </div>
    );
};
