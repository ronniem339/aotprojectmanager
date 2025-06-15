// js/components/ProjectView/tasks/ThumbnailTask.js

window.ThumbnailTask = ({ video, settings, onUpdateTask, isLocked }) => {
    const { useState, useEffect } = React;

    // Local state for the "Tinder for Thumbnails" UI
    const [concepts, setConcepts] = useState([]);
    const [accepted, setAccepted] = useState([]);
    const [rejected, setRejected] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState('');
    const [showCanvaModal, setShowCanvaModal] = useState(false);

    // This effect syncs the component's state with the data from Firestore
    useEffect(() => {
        setConcepts(video.tasks?.thumbnailConcepts || []);
        setAccepted(video.tasks?.acceptedConcepts || []);
        setRejected(video.tasks?.rejectedConcepts || []);
        setCurrentIndex(video.tasks?.currentConceptIndex || 0);
        setError(''); // Clear errors on video change
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
            // Append new concepts to the existing list
            const allConcepts = [...concepts, ...parsedJson.thumbnailConcepts];
            await onUpdateTask('thumbnailsGenerated', 'pending', { 'tasks.thumbnailConcepts': allConcepts });
        } catch (err) {
            console.error("Error generating thumbnails:", err);
            setError(`Failed to generate concepts: ${err.message}`);
        } finally {
            setGenerating(false);
        }
    };
    
    /**
     * Handles the user's decision to accept or reject a concept and updates the state.
     * @param {'accept' | 'reject'} decision - The user's choice.
     */
    const handleDecision = async (decision) => {
        const concept = concepts[currentIndex];
        const newAccepted = decision === 'accept' ? [...accepted, concept] : accepted;
        const newRejected = decision === 'reject' ? [...rejected, concept] : rejected;
        const nextIndex = currentIndex + 1;

        const taskUpdatePayload = {
            'tasks.acceptedConcepts': newAccepted,
            'tasks.rejectedConcepts': newRejected,
            'tasks.currentConceptIndex': nextIndex
        };

        // If we've accepted enough, complete the task
        if (newAccepted.length >= 3) {
            await onUpdateTask('thumbnailsGenerated', 'complete', taskUpdatePayload);
        } else {
            // Otherwise, update the pending state
            await onUpdateTask('thumbnailsGenerated', 'pending', taskUpdatePayload);
            
            // Check if we need to fetch more concepts
            const remainingConcepts = concepts.length - nextIndex;
            if (newAccepted.length + remainingConcepts < 3 && !generating) {
                // Auto-generate more if we can't possibly reach the goal
                handleGenerate(); 
            }
        }
    };

    // The concept currently being displayed to the user
    const currentConcept = concepts[currentIndex];
    
    // UI for when the task is marked as complete
    if (video.tasks?.thumbnailsGenerated === 'complete') {
        return (
            <div>
                 <p className="text-gray-400 text-center py-2 text-sm">You've selected your thumbnail concepts.</p>
                 <div className="my-4 p-4 bg-gray-900/50 rounded-lg">
                    <h4 className="font-semibold text-gray-300 mb-2">Accepted Ideas:</h4>
                    <ul className="list-disc list-inside text-gray-400 text-sm">
                        {accepted.map((c, i) => <li key={i}>{c.textOverlay}</li>)}
                    </ul>
                 </div>
                 <div className="mt-2 text-center">
                    <button onClick={() => setShowCanvaModal(true)} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold">
                        Create on Canva
                    </button>
                 </div>
                 {showCanvaModal && <window.CanvaModal canvaUrl="https://www.canva.com/create/youtube-thumbnails/" onClose={() => setShowCanvaModal(false)} />}
            </div>
        )
    }

    // Main UI for the task
    return (
        <div className="text-center">
             {isLocked && <p className="text-xs text-amber-400 mb-2">Please complete previous steps first.</p>}
            
            {/* Display the Tinder-style card if a concept is available */}
            {currentConcept && !isLocked ? (
                <div className="relative p-6 bg-gray-900/50 rounded-lg border border-gray-700 aspect-video flex flex-col justify-center items-center transition-opacity duration-300">
                    <p className="text-sm text-gray-400 mb-2">{currentConcept.imageSuggestion}</p>
                    <h4 className="text-2xl font-bold text-center text-white">{currentConcept.textOverlay}</h4>
                    <div className="absolute bottom-[-2rem] flex gap-4">
                        <button onClick={() => handleDecision('reject')} disabled={generating} className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center text-4xl transform hover:scale-110 transition-transform shadow-lg disabled:opacity-50">❌</button>
                        <button onClick={() => handleDecision('accept')} disabled={generating} className="w-16 h-16 rounded-full bg-green-600 hover:bg-green-700 flex items-center justify-center text-4xl transform hover:scale-110 transition-transform shadow-lg disabled:opacity-50">✅</button>
                    </div>
                </div>
            ) : (
                // Show the generate button if no concepts are available
                 <div className="py-8">
                     <button onClick={handleGenerate} disabled={generating || isLocked} className="px-5 py-2.5 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-2 mx-auto">
                        {generating ? <window.LoadingSpinner isButton={true} /> : '💡 Generate Concepts'}
                    </button>
                 </div>
            )}
            
            {/* Display progress and error messages */}
            <div className="mt-12 text-sm text-gray-400">Accepted: {accepted.length} / 3</div>
            {error && <p className="text-red-400 mt-2 text-sm">{error}</p>}
        </div>
    );
};
