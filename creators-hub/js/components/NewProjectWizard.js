// js/components/NewProjectWizard.js

// ... (ConfirmationModal component remains the same) ...

window.NewProjectWizard = ({ userId, settings, onClose, googleMapsLoaded, initialDraft, draftId }) => {
    const { useState, useEffect, useCallback } = React;
    
    // ... (All state declarations remain the same) ...
    const [step, setStep] = useState(initialDraft?.step || 1);
    const [inputs, setInputs] = useState(initialDraft?.inputs || { location: '', theme: '' });
    const [locations, setLocations] = useState(initialDraft?.locations || []);
    const [footageInventory, setFootageInventory] = useState(initialDraft?.footageInventory || {});
    const [keywordIdeas, setKeywordIdeas] = useState(initialDraft?.keywordIdeas || []);
    const [selectedKeywords, setSelectedKeywords] = useState(initialDraft?.selectedKeywords || []);
    const [editableOutline, setEditableOutline] = useState(initialDraft?.editableOutline || null);
    const [finalizedTitle, setFinalizedTitle] = useState(initialDraft?.finalizedTitle || null);
    const [finalizedDescription, setFinalizedDescription] = useState(initialDraft?.finalizedDescription || null);
    const [selectedTitle, setSelectedTitle] = useState(initialDraft?.selectedTitle || '');
    const [coverImageUrl, setCoverImageUrl] = useState(initialDraft?.coverImageUrl || '');
    const [refinement, setRefinement] = useState('');
    const [refiningVideoIndex, setRefiningVideoIndex] = useState(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const appId = window.CREATOR_HUB_CONFIG.APP_ID;
    const debouncedState = window.useDebounce({ step, inputs, locations, footageInventory, keywordIdeas, selectedKeywords, editableOutline, finalizedTitle, finalizedDescription, selectedTitle, coverImageUrl }, 1000);

    // ... (useEffect for persistence, handleClose, handleStartOver, etc. remain the same) ...
    const handleLocationsUpdate = useCallback((newLocations) => {/* ... */}, [footageInventory]);
    const handleInventoryChange = useCallback((place_id, type, value) => {/* ... */}, []);
    const handleSelectAllFootage = useCallback((type, isChecked) => {/* ... */}, [locations, footageInventory]);
    const handleGenerateKeywords = useCallback(async () => {/* ... */}, [inputs, locations, settings, keywordIdeas]);
    const handleGenerateInitialOutline = async () => {/* ... */};
    const handleRefineTitle = async () => {/* ... */};
    const handleRefineDescription = async () => {/* ... */};
    const handleRefineVideo = async (index) => {/* ... */};
    const handleAcceptVideo = (index) => {
        const newVideos = [...editableOutline.videos];
        newVideos[index].status = 'accepted';
        setEditableOutline(prev => ({ ...prev, videos: newVideos }));
        if (refiningVideoIndex === index) setRefiningVideoIndex(null);
    };

    /**
     * **NEW**: Handles deleting a video suggestion from the list.
     * @param {number} indexToDelete - The index of the video to remove.
     */
    const handleDeleteVideoSuggestion = (indexToDelete) => {
        setEditableOutline(prev => {
            if (!prev || !prev.videos) return prev;
            const newVideos = prev.videos.filter((_, index) => index !== indexToDelete);
            return { ...prev, videos: newVideos };
        });
    };
    
    const handleCreateProject = async () => {/* ... existing code ... */};

    const renderWizardStep = () => {
        switch (step) {
            // ... (cases 1-5 remain the same) ...
            case 6:
                return <window.WizardStep6_Review
                    videos={editableOutline?.videos || []}
                    refiningVideoIndex={refiningVideoIndex}
                    refinement={refinement}
                    isLoading={isLoading}
                    error={error}
                    onRefinementChange={setRefinement}
                    onSetRefiningVideoIndex={setRefiningVideoIndex}
                    onRefineVideo={handleRefineVideo}
                    onAcceptVideo={handleAcceptVideo}
                    onDeleteVideo={handleDeleteVideoSuggestion} // Pass the new handler
                />;
            default:
                return <p>Step {step} not found.</p>;
        }
    };
    
    const renderActionButtons = () => {
        // **FIX**: The logic now checks that at least one video has been accepted,
        // rather than requiring all of them to be.
        const allVideosHandled = editableOutline?.videos.every(v => v.status === 'accepted');
        const atLeastOneVideoAccepted = editableOutline?.videos.some(v => v.status === 'accepted');

        return (
            <div className="flex justify-between items-center w-full">
                <div>
                    <button onClick={() => setShowConfirmModal(true)} className="px-4 py-2 bg-red-800/80 hover:bg-red-700 rounded-lg text-xs text-red-100">Delete Draft</button>
                </div>
                <div className="flex items-center gap-4">
                     {step > 1 && <button onClick={() => setStep(s => s - 1)} disabled={isLoading} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg">Back</button>}
                     
                     {/* ... Button logic for steps 1-5 remains the same ... */}
                     
                     {step === 6 && (
                        <>
                            <button onClick={() => editableOutline.videos.forEach((_, i) => handleAcceptVideo(i))} disabled={isLoading || allVideosHandled} className="px-4 py-2 bg-secondary-accent hover:bg-secondary-accent-darker rounded-lg disabled:bg-gray-500 disabled:cursor-not-allowed">Accept All Remaining</button>
                            <button onClick={handleCreateProject} disabled={isLoading || !atLeastOneVideoAccepted} className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg flex items-center gap-2 text-lg font-semibold disabled:bg-gray-500 disabled:cursor-not-allowed">
                                {isLoading ? <window.LoadingSpinner isButton={true} /> : '✅ Finish & Create Project'}
                            </button>
                        </>
                     )}
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4">
            {showConfirmModal && <window.ConfirmationModal onConfirm={handleStartOver} onCancel={() => setShowConfirmModal(false)} />}
            <div className="glass-card rounded-lg p-8 w-full max-w-5xl flex flex-col">
                <button onClick={onClose} className="absolute top-4 right-6 text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
                <div className="flex-grow overflow-y-auto pr-2">
                    {renderWizardStep()}
                </div>
                <div className="flex-shrink-0 pt-6 mt-6 border-t border-gray-700">
                    {renderActionButtons()}
                </div>
            </div>
        </div>
    );
};
