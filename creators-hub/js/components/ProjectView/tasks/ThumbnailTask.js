// creators-hub/js/components/ProjectView/tasks/ThumbnailTask.js

window.ThumbnailTask = ({ video, settings, onUpdateTask, isLocked, project }) => {
    const { useState, useEffect } = React;

    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState('');

    const [conceptIdeas, setConceptIdeas] = useState(video.tasks?.thumbnailConcepts || []);
    const [acceptedIdeas, setAcceptedIdeas] = useState(video.tasks?.acceptedThumbnails || []);
    const [rejectedIdeas, setRejectedIdeas] = useState(video.tasks?.rejectedThumbnails || []);

    useEffect(() => {
        setConceptIdeas(video.tasks?.thumbnailConcepts || []);
        setAcceptedIdeas(video.tasks?.acceptedThumbnails || []);
        setRejectedIdeas(video.tasks?.rejectedThumbnails || []);
    }, [video.tasks]);

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
        
        // Get the primary location to include in the prompt.
        const mainLocation = video.locations_featured && video.locations_featured.length > 0
            ? video.locations_featured[0]
            : 'the destination';

        const prompt = `
            **CONTEXT: THUMBNAIL BEST PRACTICES**
            ${thumbnailKnowledgeBase}

            ---

            **YOUR TASK**
            You are a viral YouTube thumbnail designer. Generate 3 distinct, compelling thumbnail ideas.
            For each idea, provide these 5 pieces of information:
            1. background: A concise description of the background image.
            2. text: The exact text for the overlay. By default, you should try to include the Main Location in the text.
            3. composition: The layout principle (e.g., 'split-screen', 'close-up on face', 'rule of thirds').
            4. color_mood: The suggested color palette and emotional mood (e.g., 'High-contrast with warm colors, exciting mood').
            5. key_elements: Any specific objects or focal points to include (e.g., 'A person pointing at a map').

            **VIDEO DETAILS**
            - Main Location: "${mainLocation}"
            - Video Title: "${video.chosenTitle || video.title}"
            - Video Concept: "${video.concept}"

            **DO NOT SUGGEST IDEAS SIMILAR TO THESE REJECTED ONES:**
            ${rejectedIdeas.length > 0 ? rejectedIdeas.map(r => `- Background: ${r.background}, Text: ${r.text}`).join('\n') : 'N/A'}

            Return a valid JSON object. The "ideas" key should be an array of objects, with each object containing all five keys: "background", "text", "composition", "color_mood", and "key_elements".
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
                            <div className="pr-4 space-y-2 text-sm">
                                <p><strong className="font-semibold text-gray-300 block">Background:</strong> {idea.background}</p>
                                <p><strong className="font-semibold text-gray-300 block">Text:</strong> {idea.text}</p>
                                <p><strong className="font-semibold text-gray-300 block">Composition:</strong> {idea.composition}</p>
                                <p><strong className="font-semibold text-gray-300 block">Color & Mood:</strong> {idea.color_mood}</p>
                                <p><strong className="font-semibold text-gray-300 block">Key Elements:</strong> {idea.key_elements}</p>
                            </div>
                            <button onClick={() => handleRemoveAccepted(index)} className="button-secondary-small flex-shrink-0">Remove</button>
                        </div>
                    ))}
                </div>
            </div>

            {conceptIdeas.length > 0 && (
                <div className="space-y-4 pt-6 border-t border-gray-700">
                    <h4 className="text-xl font-semibold text-white">Generated Ideas</h4>
                    <div className="space-y-3">
                         {conceptIdeas.map((idea, index) => (
                            <div key={index} className="glass-card p-4 flex justify-between items-start">
                                <div className="pr-4 space-y-2 text-sm">
                                    <p><strong className="font-semibold text-gray-300 block">Background:</strong> {idea.background}</p>
                                    <p><strong className="font-semibold text-gray-300 block">Text:</strong> {idea.text}</p>
                                    <p><strong className="font-semibold text-gray-300 block">Composition:</strong> {idea.composition}</p>
                                    <p><strong className="font-semibold text-gray-300 block">Color & Mood:</strong> {idea.color_mood}</p>
                                    <p><strong className="font-semibold text-gray-300 block">Key Elements:</strong> {idea.key_elements}</p>
                                </div>
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
