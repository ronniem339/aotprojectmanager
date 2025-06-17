window.ShortsIdeasToolModal = ({ project, projectVideo, settings, apiKey, onSave, onClose }) => {
    const { useState, useEffect } = React;
    const [ideas, setIdeas] = useState([]);
    const [isLoading, setIsLoading] = useState(null); // 'ideas' or 'metadata_ideaId'
    const [error, setError] = useState('');
    
    const previouslyCreatedShorts = project.videos?.filter(v => v.isShort).map(v => ({ title: v.title, description: v.concept })) || [];

    const handleGenerateIdeas = async () => {
        setIsLoading('ideas');
        setError('');
        try {
            const result = await window.aiUtils.generateShortsIdeasAI({
                longFormVideoTitle: projectVideo.title,
                longFormVideoDescription: projectVideo.description,
                longFormVideoScript: projectVideo.script,
                projectConcept: project.concept,
                creatorPersona: settings.creatorPersona,
                creatorStyleGuide: settings.creatorStyleGuide,
                apiKey: apiKey,
                previouslyCreatedShorts: previouslyCreatedShorts,
                useProModelSetting: settings.useProModel, // Pass the setting
                flashModelName: settings.geminiFlashModelName, // Pass the setting
                proModelName: settings.geminiProModelName // Pass the setting
            });
            if (result && result.shorts_ideas) {
                const ideasWithIds = result.shorts_ideas.map(idea => ({ ...idea, id: `idea_${Date.now()}_${Math.random()}` }));
                setIdeas(ideasWithIds);
            } else {
                 setError('Failed to generate ideas. AI returned an unexpected format.');
            }
        } catch (err) {
            console.error(err);
            setError(err.message || 'An error occurred while generating ideas.');
        } finally {
            setIsLoading(null);
        }
    };
    
    const handleGenerateMetadata = async (ideaId, idea) => {
        setIsLoading(`metadata_${ideaId}`);
        setError('');
        try {
            const metadata = await window.aiUtils.generateShortsMetadataAI({
                shortsIdeaTitle: idea.title,
                shortsIdeaDescription: idea.description,
                longFormVideoTitle: projectVideo.title,
                longFormVideoDescription: projectVideo.description,
                longFormVideoScript: projectVideo.script,
                projectConcept: project.concept,
                creatorPersona: settings.creatorPersona,
                creatorStyleGuide: settings.creatorStyleGuide,
                apiKey: apiKey,
                useProModelSetting: settings.useProModel, // Pass the setting
                flashModelName: settings.geminiFlashModelName, // Pass the setting
                proModelName: settings.geminiProModelName // Pass the setting
            });
            
            setIdeas(prevIdeas => prevIdeas.map(i => {
                if (i.id === ideaId) {
                    return { ...i, metadata, isReady: true };
                }
                return i;
            }));

        } catch (err) {
            console.error(err);
            setError(`Failed to generate metadata for "${idea.title}".`);
        } finally {
            setIsLoading(null);
        }
    };
    
    const handleCreateVideos = () => {
        const videosToCreate = ideas.filter(idea => idea.isReady).map(idea => ({
            id: `video_${Date.now()}_${Math.random()}`,
            title: idea.metadata.title,
            concept: idea.metadata.description,
            script: idea.metadata.script,
            tags: idea.metadata.tags,
            isShort: true,
            status: 'draft',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            tasks: window.CREATOR_HUB_CONFIG.TASK_PIPELINE.map(task => ({ ...task, status: 'pending' }))
        }));

        if (videosToCreate.length > 0) {
            onSave(videosToCreate);
        } else {
            alert("No videos with generated metadata to create.");
        }
    };


    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl h-full max-h-[90vh] flex flex-col">
                <div className="p-6 border-b border-gray-700">
                    <h2 className="text-xl font-bold">Generate Shorts from Video</h2>
                    <p className="text-sm text-gray-400">Create short-form video ideas based on "{projectVideo.title}"</p>
                </div>

                <div className="p-6 overflow-y-auto flex-grow space-y-4">
                    <button onClick={handleGenerateIdeas} disabled={isLoading} className="btn-primary w-full">
                        {isLoading === 'ideas' ? 'Generating Ideas...' : 'Generate New Ideas with AI'}
                    </button>
                    {error && <p className="text-red-400 text-center">{error}</p>}

                    <div className="space-y-4">
                        {ideas.map(idea => (
                            <div key={idea.id} className={`p-4 rounded-lg ${idea.isReady ? 'bg-green-900/50 border-green-700' : 'bg-gray-700 border-gray-600'} border`}>
                                <h3 className="font-bold">{idea.title}</h3>
                                <p className="text-sm text-gray-300">{idea.description}</p>
                                {idea.isReady ? (
                                    <div className="mt-2 text-xs text-green-300">Metadata generated and ready to be created.</div>
                                ) : (
                                    <button
                                        onClick={() => handleGenerateMetadata(idea.id, idea)}
                                        disabled={isLoading}
                                        className="btn-secondary btn-sm mt-2"
                                    >
                                        {isLoading === `metadata_${idea.id}` ? 'Generating...' : 'Generate Metadata & Script'}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-6 bg-gray-900 border-t border-gray-700 flex justify-between items-center">
                    <button onClick={onClose} className="btn-secondary">Cancel</button>
                    <button 
                        onClick={handleCreateVideos} 
                        disabled={isLoading || ideas.filter(i => i.isReady).length === 0}
                        className="btn-primary"
                    >
                        Create {ideas.filter(i => i.isReady).length} Video(s)
                    </button>
                </div>
            </div>
        </div>
    );
};
