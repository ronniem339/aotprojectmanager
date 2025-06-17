window.BlogTool = ({ setView, projectData, settings, user }) => {
    const { useState, useEffect, useMemo } = React;
    const [selectedProject, setSelectedProject] = useState(null);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [ideas, setIdeas] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleProjectChange = (e) => {
        const projectId = e.target.value;
        const project = projectData.find(p => p.id === projectId);
        setSelectedProject(project);
        setSelectedVideo(null); // Reset video selection when project changes
    };

    const handleVideoChange = (e) => {
        const videoId = e.target.value;
        const video = selectedProject?.videos.find(v => v.id === videoId);
        setSelectedVideo(video);
    };

    const coreSeoEngineKb = useMemo(() => settings?.knowledgeBases?.coreSeoEngine || '', [settings]);
    const ideaGenerationKb = useMemo(() => settings?.knowledgeBases?.ideaGeneration || '', [settings]);
    const monetizationGoalsKb = useMemo(() => settings?.knowledgeBases?.monetizationGoals || '', [settings]);

    const handleGenerateIdeas = async () => {
        if (!selectedProject || !selectedVideo || !settings.geminiApiKey) {
            setError('Please select a project, a video, and ensure your Gemini API key is set in settings.');
            return;
        }
        setError('');
        setIsLoading(true);
        setIdeas([]);
        try {
            const result = await window.aiUtils.generateBlogPostIdeasAI({
                destination: settings.blogSettings?.destination || 'general audience',
                project: selectedProject,
                video: selectedVideo,
                coreSeoEngine: coreSeoEngineKb,
                ideaGenerationKb: ideaGenerationKb,
                monetizationGoals: monetizationGoalsKb,
                apiKey: settings.geminiApiKey,
                useProModelSetting: settings.useProModel, // Pass the setting
                flashModelName: settings.geminiFlashModelName, // Pass the setting
                proModelName: settings.geminiProModelName // Pass the setting
            });
            if (result && result.ideas) {
                setIdeas(result.ideas);
            } else {
                setError('Failed to generate ideas. The AI returned an unexpected format.');
            }
        } catch (err) {
            console.error(err);
            setError(err.message || 'An error occurred while generating ideas.');
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <div className="p-8">
            <button onClick={() => setView('tools')} className="mb-6 text-sm hover:text-primary-accent flex items-center">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Back to Tools
            </button>
            <h1 className="text-3xl font-bold mb-2">Blog Post Idea Generator</h1>
            <p className="text-gray-400 mb-8">Generate blog post ideas based on your existing video content.</p>

            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label htmlFor="project-select" className="block text-sm font-medium text-gray-300 mb-2">Select Project</label>
                        <select
                            id="project-select"
                            onChange={handleProjectChange}
                            className="w-full form-select bg-gray-700 border-gray-600 rounded-md"
                            defaultValue=""
                        >
                            <option value="" disabled>Choose a project</option>
                            {projectData.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="video-select" className="block text-sm font-medium text-gray-300 mb-2">Select Video</label>
                        <select
                            id="video-select"
                            onChange={handleVideoChange}
                            className="w-full form-select bg-gray-700 border-gray-600 rounded-md"
                            disabled={!selectedProject}
                            defaultValue=""
                        >
                            <option value="" disabled>Choose a video</option>
                            {selectedProject?.videos?.map(v => <option key={v.id} value={v.id}>{v.title}</option>)}
                        </select>
                    </div>
                </div>

                <button
                    onClick={handleGenerateIdeas}
                    disabled={!selectedVideo || isLoading}
                    className="w-full bg-primary-accent hover:bg-primary-hover text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center"
                >
                    {isLoading ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Generating...
                        </>
                    ) : 'Generate Ideas'}
                </button>

                {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
            </div>

            <div className="mt-8">
                <h2 className="text-2xl font-bold mb-4">Generated Ideas</h2>
                {ideas.length > 0 ? (
                    <div className="space-y-4">
                        {ideas.map((idea, index) => (
                            <div key={index} className="bg-gray-800 p-4 rounded-lg">
                                <h3 className="font-bold text-lg text-primary-accent">{idea.title}</h3>
                                <p className="text-gray-300">{idea.description}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    !isLoading && <p className="text-gray-400">No ideas generated yet. Select a project and video to start.</p>
                )}
            </div>

        </div>
    );
};
