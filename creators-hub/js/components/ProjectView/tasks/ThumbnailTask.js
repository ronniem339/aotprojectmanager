// js/components/ProjectView/tasks/ThumbnailTask.js

window.ThumbnailTask = ({ video, settings, onUpdateTask, isLocked }) => {
    const { useState, useEffect } = React;

    // Local state to manage the lists of concepts
    const [suggestions, setSuggestions] = useState([]);
    const [accepted, setAccepted] = useState([]);
    const [rejected, setRejected] = useState([]);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState('');
    const [showCanvaModal, setShowCanvaModal] = useState(false);

    // This effect syncs the component's state with the data from Firestore
    useEffect(() => {
        // Only undecided concepts should be in the "suggestions" list
        const acceptedOverlays = (video.tasks?.acceptedConcepts || []).map(c => c.textOverlay);
        const rejectedOverlays = (video.tasks?.rejectedConcepts || []).map(c => c.textOverlay);
        
        const undecidedConcepts = (video.tasks?.thumbnailConcepts || []).filter(c => 
            !acceptedOverlays.includes(c.textOverlay) && !rejectedOverlays.includes(c.textOverlay)
        );

        setSuggestions(undecidedConcepts);
        setAccepted(video.tasks?.acceptedConcepts || []);
        setRejected(video.tasks?.rejectedConcepts || []);
        setError('');
    }, [video.tasks, video.id]);
    
    /**
     * Calls the AI to generate new thumbnail concepts, appending them to the existing list.
     */
    const handleGenerate = async () => {
        setGenerating(true);
        setError('');
        const prompt = `Act as a YouTube thumbnail expert. Based on the video script, title, and previously rejected concepts, generate 5 new, distinct thumbnail concepts.
Video Title: "${video.chosenTitle}"
Video Script Summary: "${video.concept}"
Rejected Concepts to Avoid: ${rejected.map(c => `"${c.textOverlay}"`).join(', ')}
Your response MUST be a valid JSON object with one key "thumbnailConcepts" containing an array of 5 structured objects: {"imageSuggestion": "string", "textOverlay": "string"}.`;
        
        try {
            const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings.geminiApiKey);
            if (!parsedJson.thumbnailConcepts || !Array.isArray(parsedJson.thumbnailConcepts)) {
                throw new Error("AI returned an invalid format for thumbnail concepts.");
            }
            
            const validNewConcepts = parsedJson.thumbnailConcepts.filter(c => c && c.textOverlay && c.textOverlay.trim() !== '');

            if (validNewConcepts.length === 0) {
                throw new Error("AI failed to generate any valid concepts. Please try again.");
            }

            // Add new concepts to the full list in Firestore
            const allConcepts = [...(video.tasks?.thumbnailConcepts || []), ...validNewConcepts];
            await onUpdateTask('thumbnailsGenerated', 'pending', { 'tasks.thumbnailConcepts': allConcepts });
        } catch (err) {
            console.error("Error generating thumbnails:", err);
            setError(`Failed to generate concepts: ${err.message}`);
        } finally {
            setGenerating(false);
        }
    };
    
    /**
     * Handles the user's decision to accept or reject a concept.
     * This function now works on a specific concept object rather than an index.
     * @param {object} conceptToDecide - The concept object to make a decision on.
     * @param {'accept' | 'reject'} decision - The user's choice.
     */
    const handleDecision = async (conceptToDecide, decision) => {
        const newAccepted = decision === 'accept' ? [...accepted, conceptToDecide] : accepted;
        const newRejected = decision === 'reject' ? [...rejected, conceptToDecide] : rejected;

        const taskUpdatePayload = {
            'tasks.acceptedConcepts': newAccepted,
            'tasks.rejectedConcepts': newRejected,
            // We no longer need to manage currentIndex, as we filter the suggestions list directly
            'tasks.currentConceptIndex': 0 
        };

        if (newAccepted.length >= 3) {
            await onUpdateTask('thumbnailsGenerated', 'complete', taskUpdatePayload);
        } else {
            await onUpdateTask('thumbnailsGenerated', 'pending', taskUpdatePayload);
            // Auto-generate more if we run out of suggestions and haven't met the goal
            if (suggestions.length <= 1 && !generating) {
                handleGenerate();
            }
        }
    };

    // UI for when the task is marked as complete
    if (video.tasks?.thumbnailsGenerated === 'complete') {
        return (
            <div>
                 <p className="text-gray-400 text-center py-2 text-sm">You've selected your thumbnail concepts.</p>
                 <div className="my-4 space-y-4">
                    {accepted.map((c, i) => (
                        <div key={i} className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                            <div className="flex items-start gap-3">
                                <span className="text-xl text-amber-400 mt-1">💡</span>
                                <div>
                                    <h4 className="font-bold text-lg text-white">"{c.textOverlay}"</h4>
                                    <p className="text-gray-400 text-sm mt-2 border-l-2 border-gray-600 pl-3 italic">
                                        {c.imageSuggestion}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                 <div className="mt-6 text-center">
                    <button onClick={() => setShowCanvaModal(true)} className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold text-base transition-transform transform hover:scale-105">
                        Create on Canva
                    </button>
                 </div>
                 {showCanvaModal && <window.CanvaModal canvaUrl="https://www.canva.com/create/youtube-thumbnails/" onClose={() => setShowCanvaModal(false)} />}
            </div>
        )
    }

    // Main UI for the task
    return (
        <div className="space-y-6">
            {isLocked && <p className="text-xs text-amber-400 text-center">Please complete previous steps first.</p>}
            
            {/* AI Suggestions Section */}
            <div>
                <h4 className="font-semibold text-gray-300 mb-2">AI Suggestions ({suggestions.length} remaining)</h4>
                <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700 space-y-4">
                    {suggestions.length > 0 ? (
                        suggestions.map((concept, i) => (
                             <div key={i} className="bg-gray-800/60 p-3 rounded-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                <div className="flex-grow">
                                    <p className="font-semibold text-white">"{concept.textOverlay}"</p>
                                    <p className="text-sm text-gray-400 italic mt-1">{concept.imageSuggestion}</p>
                                </div>
                                <div className="flex-shrink-0 flex gap-2 self-end sm:self-center">
                                    <button onClick={() => handleDecision(concept, 'reject')} className="px-3 py-1 text-xs font-semibold bg-red-800/80 hover:bg-red-700 rounded-md">Reject</button>
                                    <button onClick={() => handleDecision(concept, 'accept')} className="px-3 py-1 text-xs font-semibold bg-green-700 hover:bg-green-600 rounded-md">Accept</button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-gray-400 text-center py-4 italic">No suggestions available. Click below to generate some.</p>
                    )}
                     <div className="text-center pt-4 border-t border-gray-700/50">
                        <button onClick={handleGenerate} disabled={generating || isLocked} className="px-5 py-2.5 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-2 mx-auto">
                            {generating ? <window.LoadingSpinner isButton={true} /> : '💡 Generate More Ideas'}
                        </button>
                     </div>
                </div>
            </div>

            {/* Accepted Ideas Section */}
            <div>
                <h4 className="font-semibold text-gray-300 mb-2">Accepted Ideas ({accepted.length} / 3)</h4>
                 <div className="p-4 bg-green-900/20 rounded-lg border border-green-500 space-y-3">
                    {accepted.length > 0 ? (
                         accepted.map((c, i) => (
                             <div key={i} className="bg-gray-800/50 p-3 rounded-md">
                                 <p className="font-semibold text-white">"{c.textOverlay}"</p>
                                 <p className="text-sm text-gray-400 italic mt-1">{c.imageSuggestion}</p>
                             </div>
                         ))
                    ) : (
                        <p className="text-green-400/70 text-center py-4 italic">Accept 3 suggestions to complete this step.</p>
                    )}
                </div>
            </div>
            
            {error && <p className="text-red-400 mt-4 text-sm bg-red-900/50 p-3 rounded-lg">{error}</p>}
        </div>
    );
};
