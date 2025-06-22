// creators-hub/js/components/ProjectView/tasks/ThumbnailTask.js

window.ThumbnailTask = ({ video, settings, onUpdateTask, isLocked, project }) => {
    const { useState, useEffect } = React;

    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState('');

    // State for the different idea lists
    const [conceptIdeas, setConceptIdeas] = useState(video.tasks?.thumbnailConcepts || []);
    const [acceptedIdeas, setAcceptedIdeas] = useState(video.tasks?.acceptedThumbnails || []);
    const [rejectedIdeas, setRejectedIdeas] = useState(video.tasks?.rejectedThumbnails || []);

    // Effect to update local state if the video prop changes from elsewhere
    useEffect(() => {
        setConceptIdeas(video.tasks?.thumbnailConcepts || []);
        setAcceptedIdeas(video.tasks?.acceptedThumbnails || []);
        setRejectedIdeas(video.tasks?.rejectedThumbnails || []);
    }, [video.tasks]);

    // Effect to automatically manage the completion status
    useEffect(() => {
        const isComplete = acceptedIdeas.length === 3;
        const currentStatus = video.tasks?.thumbnailsGenerated;

        if (isComplete && currentStatus !== 'complete') {
            onUpdateTask('thumbnailsGenerated', 'complete', {
                'tasks.thumbnailConcepts': conceptIdeas,
                'tasks.acceptedThumbnails': acceptedIdeas,
                'tasks.rejectedThumbnails': rejectedIdeas,
            });
        } else if (!isComplete && currentStatus === 'complete') {
            onUpdateTask('thumbnailsGenerated', 'in-progress', {});
        }
    }, [acceptedIdeas, video.tasks?.thumbnailsGenerated, onUpdateTask, conceptIdeas, rejectedIdeas]);


    const handleGenerateIdeas = async () => {
        setGenerating(true);
        setError('');

        const thumbnailKnowledgeBase = settings?.knowledgeBases?.youtube?.thumbnailIdeas || 'Design compelling, high-CTR thumbnails.';
        const prompt = `
            **CONTEXT: THUMBNAIL BEST PRACTICES**
            ${thumbnailKnowledgeBase}

            **YOUR TASK**
            You are a viral YouTube thumbnail designer. Following the best practices, generate 3 new, distinct, compelling thumbnail ideas for the following video.
            
            **VIDEO DETAILS**
            - Video Title: "${video.chosenTitle || video.title}"
            - Video Concept: "${video.concept}"

            **DO NOT SUGGEST IDEAS SIMILAR TO THESE REJECTED ONES:**
            ${rejectedIdeas.length > 0 ? rejectedIdeas.map(r => `- ${r}`).join('\n') : 'N/A'}

            Return a valid JSON object like: {"ideas": ["Detailed description of idea 1...", "Detailed description of idea 2...", ...]}.
        `;
        try {
            const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings);
            const generatedIdeas = parsedJson.ideas || [];
            setConceptIdeas(generatedIdeas);
            onUpdateTask('thumbnailsGenerated', 'in-progress', { 'tasks.thumbnailConcepts': generatedIdeas });
        } catch (err) {
            setError(`Failed to generate ideas: ${err.message}`);
        } finally {
            setGenerating(false);
        }
    };

    const handleAcceptIdea = (index) => {
        const ideaToAccept = conceptIdeas[index];
        const newConcepts = conceptIdeas.filter((_, i) => i !== index);
        const newAccepted = [...acceptedIdeas, ideaToAccept];
        
        setConceptIdeas(newConcepts);
        setAcceptedIdeas(newAccepted);

        onUpdateTask('thumbnailsGenerated', 'in-progress', {
            'tasks.thumbnailConcepts': newConcepts,
            'tasks.acceptedThumbnails': newAccepted,
        });
    };

    const handleRejectIdea = (index) => {
        const ideaToReject = conceptIdeas[index];
        const newConcepts = conceptIdeas.filter((_, i) => i !== index);
        const newRejected = [...rejectedIdeas, ideaToReject];

        setConceptIdeas(newConcepts);
        setRejectedIdeas(newRejected);
        
        onUpdateTask('thumbnailsGenerated', 'in-progress', {
            'tasks.thumbnailConcepts': newConcepts,
            'tasks.rejectedThumbnails': newRejected,
        });
    };

    const handleRemoveAccepted = (index) => {
        const ideaToUnaccept = acceptedIdeas[index];
        const newAccepted = acceptedIdeas.filter((_, i) => i !== index);
        const newConcepts = [ideaToUnaccept, ...conceptIdeas];

        setAcceptedIdeas(newAccepted);
        setConceptIdeas(newConcepts);

        onUpdateTask('thumbnailsGenerated', 'in-progress', {
            'tasks.thumbnailConcepts': newConcepts,
            'tasks.acceptedThumbnails': newAccepted,
        });
    };

    if (isLocked) {
        return <p className="text-gray-400 text-center py-2 text-sm">Please complete the previous steps first.</p>;
    }

    return (
        <div className="task-content space-y-6">
            <div className="flex gap-4">
                <button onClick={handleGenerateIdeas} disabled={generating} className="button-primary-small w-full justify-center">
                    {generating ? <window.LoadingSpinner isButton={true} /> : '🤖 Generate New Ideas'}
                </button>
            </div>
            {error && <p className="error-message">{error}</p>}
            
            {/* Accepted Ideas Section */}
            <div className="space-y-4">
                <h4 className="text-xl font-semibold text-white">Accepted Ideas ({acceptedIdeas.length} / 3)</h4>
                {acceptedIdeas.length < 3 && <p className="text-sm text-gray-400">Accept 3 ideas to complete this step.</p>}
                {acceptedIdeas.length === 3 && (
                     <div className="p-4 text-center bg-green-900/50 border border-green-500 rounded-lg">
                         <p className="font-semibold text-green-300">✓ Task Complete! You have 3 accepted thumbnail ideas.</p>
                     </div>
                )}
                <div className="space-y-3">
                    {acceptedIdeas.map((idea, index) => (
                        <div key={index} className="glass-card-light p-4 flex justify-between items-start">
                            <p className="text-sm pr-4">{idea}</p>
                            <button onClick={() => handleRemoveAccepted(index)} className="button-secondary-small flex-shrink-0">Remove</button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Idea Generation Section */}
            {conceptIdeas.length > 0 && (
                <div className="space-y-4 pt-6 border-t border-gray-700">
                    <h4 className="text-xl font-semibold text-white">Generated Ideas</h4>
                    <div className="space-y-3">
                         {conceptIdeas.map((idea, index) => (
                            <div key={index} className="glass-card p-4 flex justify-between items-start">
                                <p className="text-sm pr-4">{idea}</p>
                                <div className="flex gap-2 flex-shrink-0">
                                    <button onClick={() => handleRejectIdea(index)} disabled={generating} className="button-danger-small">Reject</button>
                                    <button onClick={() => handleAcceptIdea(index)} disabled={generating || acceptedIdeas.length >= 3} className="button-primary-small">Accept</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
