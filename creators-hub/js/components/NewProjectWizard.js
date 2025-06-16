// js/components/NewProjectWizard.js

window.ConfirmationModal = ({ onConfirm, onCancel }) => (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-[60]">
        <div className="glass-card rounded-lg p-8 w-full max-w-md text-center">
            <h3 className="text-2xl font-bold mb-4">Are you sure?</h3>
            <p className="text-gray-300 mb-6">This action will permanently delete your current draft. This cannot be undone.</p>
            <div className="flex justify-center gap-4">
                <button onClick={onCancel} className="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold">Cancel</button>
                <button onClick={onConfirm} className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-semibold">Yes, Delete Draft</button>
            </div>
        </div>
    </div>
);

window.NewProjectWizard = ({ userId, settings, onClose, googleMapsLoaded, initialDraft, draftId }) => {
    const { useState, useEffect, useCallback } = React;
    
    // Overall state for the entire wizard
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

    // Persist state to Firestore on change
    useEffect(() => {
        if (userId && draftId) {
            const draftRef = db.collection(`artifacts/${appId}/users/${userId}/wizards`).doc(draftId);
            draftRef.set({ ...debouncedState, updatedAt: new Date() }, { merge: true });
        }
    }, [debouncedState, userId, draftId, appId]);

    useEffect(() => {
        if (editableOutline && editableOutline.playlistTitleSuggestions && !selectedTitle) {
            setSelectedTitle(editableOutline.playlistTitleSuggestions[0]);
        }
    }, [editableOutline, selectedTitle]);

    const handleClose = async () => {
        const isPristine = !inputs.location && !inputs.theme && (locations?.length || 0) === 0 && !coverImageUrl;
        if (isPristine && draftId) {
            await db.collection(`artifacts/${appId}/users/${userId}/wizards`).doc(draftId).delete().catch(console.error);
        }
        onClose();
    };

    const handleStartOver = async () => {
        if (draftId) {
            await db.collection(`artifacts/${appId}/users/${userId}/wizards`).doc(draftId).delete().catch(console.error);
        }
        setShowConfirmModal(false);
        onClose();
    };

    // Handler functions to be passed down to child components
    const handleLocationsUpdate = useCallback((newLocations) => {
        setLocations(newLocations);
        setInputs(prev => ({ ...prev, location: newLocations[0]?.name || '' }));
        const newInventory = { ...footageInventory };
        newLocations.forEach(loc => {
            if (!newInventory[loc.place_id]) {
                newInventory[loc.place_id] = { bRoll: false, onCamera: false, drone: false, importance: 'major' };
            }
        });
        setFootageInventory(newInventory);
    }, [footageInventory]);

    const handleInventoryChange = useCallback((place_id, type, value) => {
        setFootageInventory(prev => ({
            ...prev,
            [place_id]: { ...(prev[place_id] || {}), [type]: value }
        }));
    }, []);

    const handleSelectAllFootage = useCallback((type, isChecked) => {
        const newInventory = { ...footageInventory };
        locations.slice(1).forEach(loc => {
            newInventory[loc.place_id] = { ...(newInventory[loc.place_id] || {}), [type]: isChecked };
        });
        setFootageInventory(newInventory);
    }, [locations, footageInventory]);

    const handleGenerateKeywords = useCallback(async () => {
        if (keywordIdeas.length > 0) { setStep(3); return; }
        setIsLoading(true); setError('');
        try {
            const keywords = await window.aiUtils.generateKeywordsAI({
                title: inputs.location, concept: inputs.theme, locationsFeatured: locations.slice(1).map(l => l.name),
                projectTitle: inputs.location, projectDescription: inputs.theme, settings
            });
            setKeywordIdeas(keywords);
            setStep(3);
        } catch (e) { setError(`Failed to generate keywords: ${e.message}`); } finally { setIsLoading(false); }
    }, [inputs, locations, settings, keywordIdeas]);
    
    // ... Other handler functions like handleGenerateInitialOutline, handleRefineTitle, etc.
    const handleGenerateInitialOutline = async () => {/* ... full logic from previous versions ... */};
    const handleRefineTitle = async () => {/* ... full logic ... */};
    const handleRefineDescription = async () => {/* ... full logic ... */};
    const handleRefineVideo = async (index) => {/* ... full logic ... */};
    const handleAcceptVideo = (index) => {
        const newVideos = [...editableOutline.videos];
        newVideos[index].status = 'accepted';
        setEditableOutline(prev => ({ ...prev, videos: newVideos }));
        if (refiningVideoIndex === index) setRefiningVideoIndex(null);
    };
    
    const handleCreateProject = async () => {
        if (!finalizedTitle || !finalizedDescription || !editableOutline.videos) return;
        setIsLoading(true); setError('');
        try {
            const batch = db.batch();
            const projectRef = db.collection(`artifacts/${appId}/users/${userId}/projects`).doc();
            batch.set(projectRef, {
                playlistTitle: finalizedTitle, playlistDescription: finalizedDescription,
                locations, coverImageUrl, createdAt: new Date().toISOString()
            });
            editableOutline.videos.forEach(video => {
                const videoRef = projectRef.collection('videos').doc();
                batch.set(videoRef, { ...video, createdAt: new Date().toISOString() });
            });
            await batch.commit();
            if (draftId) await db.collection(`artifacts/${appId}/users/${userId}/wizards`).doc(draftId).delete();
            onClose();
        } catch(e) { setError(`Failed to save project. ${e.message}`); } finally { setIsLoading(false); }
    };


    const renderWizardStep = () => {
        switch (step) {
            case 1:
                return <window.WizardStep1_Foundation
                    inputs={inputs} locations={locations} coverImageUrl={coverImageUrl} settings={settings} googleMapsLoaded={googleMapsLoaded}
                    onInputChange={(name, val) => setInputs(p => ({ ...p, [name]: val }))}
                    onLocationsUpdate={handleLocationsUpdate}
                    onCoverImageUrlChange={setCoverImageUrl}
                />;
            case 2:
                return <window.WizardStep2_Inventory
                    locations={locations} footageInventory={footageInventory}
                    onInventoryChange={handleInventoryChange} onSelectAllFootage={handleSelectAllFootage}
                />;
            case 3:
                 return <window.WizardStep3_Keywords 
                    keywordIdeas={keywordIdeas} selectedKeywords={selectedKeywords}
                    onKeywordSelection={setSelectedKeywords} isLoading={isLoading} error={error}
                 />;
            case 4:
                return <window.WizardStep4_Title
                    suggestions={editableOutline?.playlistTitleSuggestions || []} selectedTitle={selectedTitle}
                    refinement={refinement} isLoading={isLoading} error={error}
                    onTitleSelect={setSelectedTitle} onRefinementChange={setRefinement} onRefine={handleRefineTitle}
                />;
             case 5:
                return <window.WizardStep5_Description
                    description={editableOutline?.playlistDescription} refinement={refinement} isLoading={isLoading} error={error}
                    onDescriptionChange={(val) => setEditableOutline(p => ({...p, playlistDescription: val}))}
                    onRefinementChange={setRefinement} onRefine={handleRefineDescription}
                />;
             case 6:
                return <window.WizardStep6_Review
                    videos={editableOutline?.videos || []} refiningVideoIndex={refiningVideoIndex} refinement={refinement} isLoading={isLoading} error={error}
                    onRefinementChange={setRefinement} onSetRefiningVideoIndex={setRefiningVideoIndex}
                    onRefineVideo={handleRefineVideo} onAcceptVideo={handleAcceptVideo}
                />;
            default:
                return <p>Step {step} not found.</p>;
        }
    };
    
    const renderActionButtons = () => {
        const subLocations = locations.slice(1);
        const isInventoryComplete = subLocations.length === 0 || subLocations.every(loc => {
            const inventory = footageInventory[loc.place_id] || {};
            return inventory.bRoll || inventory.onCamera || inventory.drone;
        });
        const allVideosAccepted = editableOutline?.videos.every(v => v.status === 'accepted');

        return (
            <div className="flex justify-between items-center w-full">
                <div>
                    <button onClick={() => setShowConfirmModal(true)} className="px-4 py-2 bg-red-800/80 hover:bg-red-700 rounded-lg text-xs text-red-100">Delete Draft</button>
                </div>
                <div className="flex items-center gap-4">
                     {step > 1 && <button onClick={() => setStep(s => s - 1)} disabled={isLoading} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg">Back</button>}
                     
                     {step === 1 && <button onClick={() => setStep(2)} disabled={locations.length === 0} className="px-4 py-2 bg-primary-accent hover:bg-primary-accent-darker rounded-lg disabled:bg-gray-500">Next</button>}
                     {step === 2 && <button onClick={handleGenerateKeywords} disabled={isLoading || !isInventoryComplete} className="px-4 py-2 bg-primary-accent hover:bg-primary-accent-darker rounded-lg flex items-center gap-2 disabled:bg-gray-500">{isLoading ? <window.LoadingSpinner isButton={true} /> : '💡 Get Keyword Ideas'}</button>}
                     {step === 3 && <button onClick={handleGenerateInitialOutline} disabled={isLoading || selectedKeywords.length === 0} className="px-4 py-2 bg-primary-accent hover:bg-primary-accent-darker rounded-lg flex items-center gap-2 disabled:bg-gray-500">{isLoading ? <window.LoadingSpinner isButton={true} /> : '🪄 Generate Project Plan'}</button>}
                     {step === 4 && <button onClick={() => { setFinalizedTitle(selectedTitle); setStep(5); setRefinement(''); setError(''); }} disabled={isLoading || !selectedTitle} className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg">Accept & Continue ➡️</button>}
                     {step === 5 && <button onClick={() => { setFinalizedDescription(editableOutline.playlistDescription); setStep(6); setRefinement(''); setError('');}} disabled={isLoading} className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg">Accept & Continue ➡️</button>}
                     {step === 6 && <button onClick={handleCreateProject} disabled={isLoading || !allVideosAccepted} className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg text-lg font-semibold disabled:bg-gray-500">{isLoading ? <window.LoadingSpinner isButton={true} /> : '✅ Finish & Create Project'}</button>}
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4">
            {showConfirmModal && <window.ConfirmationModal onConfirm={handleStartOver} onCancel={() => setShowConfirmModal(false)} />}
            <div className="glass-card rounded-lg p-8 w-full max-w-5xl flex flex-col">
                <button onClick={handleClose} className="absolute top-4 right-6 text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
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
