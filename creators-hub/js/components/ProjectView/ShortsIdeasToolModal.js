// creators-hub/js/components/ProjectView/ShortsIdeasToolModal.js

window.ShortsIdeasToolModal = ({ video, project, settings, onSaveShortsIdea, onDeleteShortsIdea, onGenerateShortsMetadata, onUpdateShortsIdeaStatus }) => {
    const { useState, useEffect, useMemo } = React;

    const [generatedIdeas, setGeneratedIdeas] = useState([]);
    const [isLoadingIdeas, setIsLoadingIdeas] = useState(false);
    const [isLoadingMetadata, setIsLoadingMetadata] = useState({});
    const [error, setError] = useState('');
    const [shortsIdeas, setShortsIdeas] = useState(video.shortsIdeas || []);

    useEffect(() => {
        setShortsIdeas(video.shortsIdeas || []);
    }, [video.shortsIdeas, video.id]);

    // **FIX 2: Separate ideas into active and completed lists**
    const { activeIdeas, completedIdeas } = useMemo(() => {
        const active = [];
        const completed = [];
        (shortsIdeas || []).forEach(idea => {
            if (idea.status === 'complete') {
                completed.push(idea);
            } else {
                active.push(idea);
            }
        });
        return { activeIdeas: active, completedIdeas: completed };
    }, [shortsIdeas]);


    const handleGenerateIdeas = async () => {
        setIsLoadingIdeas(true);
        setError('');
        setGeneratedIdeas([]);

        const previouslyCreatedShorts = shortsIdeas.map(idea => ({ title: idea.title, status: idea.status }));

        try {
            const ideas = await window.aiUtils.generateShortsIdeasAI({
                videoTitle: video.chosenTitle || video.title,
                videoConcept: video.concept,
                videoLocationsFeatured: video.locations_featured || [],
                projectFootageInventory: project.footageInventory || {},
                projectTitle: project.playlistTitle,
                shortsIdeaGenerationKb: settings.knowledgeBases?.youtube?.shortsIdeaGeneration || '',
                previouslyCreatedShorts: previouslyCreatedShorts,
                settings: settings,
            });
            setGeneratedIdeas(ideas);
        } catch (err) {
            console.error("Error generating shorts ideas:", err);
            setError(`Failed to generate ideas: ${err.message || err}`);
        } finally {
            setIsLoadingIdeas(false);
        }
    };

    const handleSaveIdea = (idea) => {
        const newIdea = {
            ...idea,
            id: `short-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            status: 'saved',
            metadata: null
        };
        onSaveShortsIdea(newIdea);
        setGeneratedIdeas(prev => prev.filter(gIdea => gIdea.title !== idea.title));
    };

    const handleDeleteIdea = (id) => {
        onDeleteShortsIdea(id);
    };

    // **FIX 2: Handler to mark an idea as complete**
    const handleMarkAsComplete = (ideaId) => {
        if (onUpdateShortsIdeaStatus) {
            onUpdateShortsIdeaStatus(ideaId, 'complete');
        }
    };

    // **FIX 2: Handler to revert a completed idea back to saved**
    const handleRevertToSaved = (ideaId) => {
        if (onUpdateShortsIdeaStatus) {
            onUpdateShortsIdeaStatus(ideaId, 'saved');
        }
    };


    const handleGenerateMetadata = async (ideaId, idea) => {
        setIsLoadingMetadata(prev => ({ ...prev, [ideaId]: true }));
        setError('');
        try {
            const metadata = await window.aiUtils.generateShortsMetadataAI({
                videoTitle: video.chosenTitle || video.title,
                shortsIdea: idea,
                settings: settings,
            });
            onGenerateShortsMetadata(ideaId, metadata);
        } catch (err) {
            console.error("Error generating shorts metadata:", err);
            setError(`Failed to generate metadata: ${err.message || err}`);
        } finally {
            setIsLoadingMetadata(prev => ({ ...prev, [ideaId]: false }));
        }
    };

    return (
        <div className="w-full h-full flex flex-col">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 text-center">Generate YouTube Shorts Ideas</h2>

             {/* **FIX 1: Added pb-6 to give space at the bottom of the scrollable area** */}
            <div className="flex-grow overflow-y-auto pr-4 custom-scrollbar pb-6">
                <p className="text-gray-400 mb-6 text-center">Generate quick, engaging ideas for YouTube Shorts based on your video content and project details.</p>
                
                <div className="text-center mb-6">
                    <button onClick={handleGenerateIdeas} disabled={isLoadingIdeas} className="px-6 py-3 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center mx-auto gap-2">
                        {isLoadingIdeas ? <window.LoadingSpinner isButton={true} /> : '⚡ Generate Shorts Ideas'}
                    </button>
                </div>

                {error && (
                    <div className="bg-red-900/50 text-red-400 p-3 rounded-lg text-sm mb-4">
                        {error}
                    </div>
                )}
                <div className="flex flex-col lg:flex-row gap-6">
                    <div className="flex-1 space-y-6">
                        {/* Saved Ideas (Active) */}
                        <div className={`${activeIdeas.length > 0 ? 'block' : 'hidden lg:block'}`}>
                            <h3 className="text-xl font-bold text-white mb-4">Saved Shorts Ideas ({activeIdeas.length})</h3>
                            <div className="space-y-4">
                                {activeIdeas.map((idea) => (
                                    <div key={idea.id} className="glass-card p-4 rounded-lg border border-green-500 bg-green-900/20">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-bold text-lg text-white">{idea.title}</h4>
                                            <button onClick={() => handleDeleteIdea(idea.id)} className="text-red-400 hover:text-red-300 text-sm">
                                                &times; Remove
                                            </button>
                                        </div>
                                        <p className="text-gray-300 text-sm">{idea.description}</p>
                                        <p className="text-gray-400 text-xs italic mt-2">Footage: {idea.footageToUse}</p>

                                        {idea.metadata ? (
                                            <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
                                                <h5 className="text-md font-semibold text-primary-accent mb-2">Generated Metadata:</h5>
                                                <p className="text-sm text-gray-300"><strong>On-Screen:</strong> {idea.metadata.onScreenText?.join(', ') || 'N/A'}</p>
                                                <p className="text-sm text-gray-300"><strong>Caption:</strong> {idea.metadata.caption || 'N/A'}</p>
                                                <p className="text-sm text-gray-300"><strong>Description:</strong> {idea.metadata.description || 'N/A'}</p>
                                                <p className="text-sm text-gray-300"><strong>Tags:</strong> {idea.metadata.tags || 'N/A'}</p>
                                                <div className="mt-3 flex justify-end items-center gap-4">
                                                    {/* **FIX 2: Add Mark as Complete button** */}
                                                    <button onClick={() => handleMarkAsComplete(idea.id)} className="px-3 py-1 text-xs bg-green-700 hover:bg-green-600 rounded-md font-semibold">Mark as Used</button>
                                                    <window.CopyButton textToCopy={`${idea.metadata.caption}\n\n${idea.metadata.description}\n\nTags: ${idea.metadata.tags}`} />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="mt-4 text-center">
                                                <button 
                                                    onClick={() => handleGenerateMetadata(idea.id, idea)}
                                                    disabled={isLoadingMetadata[idea.id]}
                                                    className="px-4 py-2 text-sm bg-secondary-accent hover:bg-secondary-accent-darker rounded-lg font-semibold disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center mx-auto gap-2"
                                                >
                                                    {isLoadingMetadata[idea.id] ? <window.LoadingSpinner isButton={true} /> : '📝 Generate Metadata'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                        {/* **FIX 2: New section for Completed ideas** */}
                        {completedIdeas.length > 0 && (
                             <div className="pt-6 border-t border-gray-700">
                                <h3 className="text-xl font-bold text-gray-500 mb-4">Completed Ideas ({completedIdeas.length})</h3>
                                <div className="space-y-4 opacity-70">
                                    {completedIdeas.map((idea) => (
                                         <div key={idea.id} className="glass-card p-4 rounded-lg border border-gray-600 bg-gray-900/30">
                                            <div className="flex justify-between items-center">
                                                <h4 className="font-bold text-md text-gray-400 line-through">{idea.title}</h4>
                                                <button onClick={() => handleRevertToSaved(idea.id)} className="text-xs text-amber-400 hover:underline">Re-activate</button>
                                            </div>
                                         </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                     {/* New Suggestions Column */}
                    <div className={`flex-1 ${generatedIdeas.length > 0 ? 'block' : 'hidden lg:block'}`}>
                        <h3 className="text-xl font-bold text-white mb-4">New Suggestions ({generatedIdeas.length})</h3>
                        <div className="space-y-4">
                            {generatedIdeas.map((idea, index) => (
                                <div key={index} className="glass-card p-4 rounded-lg border border-gray-700">
                                    <h3 className="font-bold text-lg text-white mb-2">{idea.title}</h3>
                                    <p className="text-gray-300 text-sm">{idea.description}</p>
                                    <p className="text-gray-400 text-xs italic mt-2">Footage: {idea.footageToUse}</p>
                                    <div className="flex justify-end gap-2 mt-3">
                                        <button onClick={() => handleSaveIdea(idea)} className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 rounded-lg font-semibold">
                                            Save Idea
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                
                {shortsIdeas.length === 0 && generatedIdeas.length === 0 && (
                    <div className="text-center text-gray-500 mt-8">
                        No Shorts ideas saved or generated yet. Click "Generate Shorts Ideas" to get started!
                    </div>
                )}
            </div>
        </div>
    );
};
