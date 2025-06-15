// js/components/ProjectView/tasks/ThumbnailTask.js

window.ThumbnailTask = ({ video, settings, onUpdateTask, onGenerate, isLocked }) => {
    const { useState, useEffect } = React;

    const [concepts, setConcepts] = useState([]);
    const [accepted, setAccepted] = useState([]);
    const [rejected, setRejected] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [generating, setGenerating] = useState(false);
    const [showCanvaModal, setShowCanvaModal] = useState(false);

    useEffect(() => {
        setConcepts(video.tasks?.thumbnailConcepts || []);
        setAccepted(video.tasks?.acceptedConcepts || []);
        setRejected(video.tasks?.rejectedConcepts || []);
        setCurrentIndex(video.tasks?.currentConceptIndex || 0);
    }, [video.tasks]);
    
    const handleGenerate = async () => {
        setGenerating(true);
        const prompt = `Act as a YouTube thumbnail expert. Based on the video script, title, and rejected concepts, generate 5 new, distinct thumbnail concepts.
Video Title: "${video.chosenTitle}"
Video Script Summary: "${video.concept}"
Rejected Concepts to Avoid: ${rejected.map(c => `"${c.textOverlay}"`).join(', ')}
Your response MUST be a valid JSON object with one key "thumbnailConcepts" containing an array of 5 structured objects: {"imageSuggestion": "string", "textOverlay": "string"}.`;
        
        try {
            const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings.geminiApiKey);
            const newConcepts = [...concepts, ...parsedJson.thumbnailConcepts];
            onUpdateTask('thumbnailsGenerated', 'pending', { 'tasks.thumbnailConcepts': newConcepts });
        } catch (error) {
            console.error("Error generating thumbnails:", error);
        } finally {
            setGenerating(false);
        }
    };
    
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

        if (newAccepted.length >= 3) {
            await onUpdateTask('thumbnailsGenerated', 'complete', taskUpdatePayload);
        } else {
            await onUpdateTask('thumbnailsGenerated', 'pending', taskUpdatePayload);
            const remaining = concepts.length - nextIndex;
            if (newAccepted.length + remaining < 3 && !generating) {
                handleGenerate(); // Auto-generate more if we can't reach the goal
            }
        }
    };

    const currentConcept = concepts && concepts[currentIndex];
    
    if (video.tasks?.thumbnailsGenerated === 'complete') {
        return (
            <div>
                 <p className="text-gray-400 text-center py-2 text-sm">You've selected your thumbnail concepts.</p>
                 <div className="mt-2 text-center">
                    <button onClick={() => setShowCanvaModal(true)} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold">
                        Create on Canva
                    </button>
                 </div>
                 {showCanvaModal && <window.CanvaModal canvaUrl="https://www.canva.com/create/youtube-thumbnails/" onClose={() => setShowCanvaModal(false)} />}
            </div>
        )
    }

    return (
        <div className="text-center">
             {isLocked && <p className="text-xs text-amber-400 mb-2">Please complete previous steps first.</p>}
            {currentConcept ? (
                <div className="relative p-6 bg-gray-900/50 rounded-lg border border-gray-700 aspect-video flex flex-col justify-center items-center">
                    <p className="text-sm text-gray-400 mb-2">{currentConcept.imageSuggestion}</p>
                    <h4 className="text-2xl font-bold text-center">{currentConcept.textOverlay}</h4>
                    <div className="absolute bottom-4 flex gap-4">
                        <button onClick={() => handleDecision('reject')} className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center text-4xl transform hover:scale-110 transition-transform">❌</button>
                        <button onClick={() => handleDecision('accept')} className="w-16 h-16 rounded-full bg-green-600 hover:bg-green-700 flex items-center justify-center text-4xl transform hover:scale-110 transition-transform">✅</button>
                    </div>
                </div>
            ) : (
                <button onClick={handleGenerate} disabled={generating || isLocked} className="px-5 py-2.5 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-2 mx-auto">
                    {generating ? <window.LoadingSpinner isButton={true} /> : '💡 Generate Concepts'}
                </button>
            )}
            <div className="mt-4 text-sm text-gray-400">Accepted: {accepted.length} / 3</div>
        </div>
    );
};
