// js/components/NewProjectWizard.js

window.ConfirmationModal = ({ onConfirm, onCancel }) => (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
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
    // Shared state for the entire wizard
    const [step, setStep] = useState(initialDraft?.step || 1);
    const [inputs, setInputs] = useState(initialDraft?.inputs || { location: '', theme: '' });
    const [locations, setLocations] = useState(initialDraft?.locations || []);
    const [footageInventory, setFootageInventory] = useState(initialDraft?.footageInventory || {});
    
    // State for keyword research
    const [keywordIdeas, setKeywordIdeas] = useState(initialDraft?.keywordIdeas || []);
    const [selectedKeywords, setSelectedKeywords] = useState(initialDraft?.selectedKeywords || []);

    // State for the generated plan and its individual parts
    const [editableOutline, setEditableOutline] = useState(initialDraft?.editableOutline || null);
    const [finalizedTitle, setFinalizedTitle] = useState(initialDraft?.finalizedTitle || null);
    const [finalizedDescription, setFinalizedDescription] = useState(initialDraft?.finalizedDescription || null);
    const [selectedTitle, setSelectedTitle] = useState(initialDraft?.selectedTitle || '');
    
    // **NEW**: State for the Points of Interest finder
    const [aiLocationSuggestions, setAiLocationSuggestions] = useState([]);
    const [isFindingPois, setIsFindingPois] = useState(false);
    const [poiError, setPoiError] = useState('');


    const [coverImageUrl, setCoverImageUrl] = useState(initialDraft?.coverImageUrl || '');
    const [refinement, setRefinement] = useState('');
    const [refiningVideoIndex, setRefiningVideoIndex] = useState(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    
    const appId = window.CREATOR_HUB_CONFIG.APP_ID;
    const debouncedState = window.useDebounce({ step, inputs, locations, footageInventory, keywordIdeas, selectedKeywords, editableOutline, finalizedTitle, finalizedDescription, selectedTitle, coverImageUrl }, 1000);

    useEffect(() => {
        if (editableOutline && editableOutline.playlistTitleSuggestions && !selectedTitle) {
            setSelectedTitle(editableOutline.playlistTitleSuggestions[0]);
        }
        if (initialDraft?.finalizedTitle && !finalizedTitle) setFinalizedTitle(initialDraft.finalizedTitle);
        if (initialDraft?.finalizedDescription && !finalizedDescription) setFinalizedDescription(initialDraft.finalizedDescription);
        if (initialDraft?.coverImageUrl && !coverImageUrl) setCoverImageUrl(initialDraft.coverImageUrl);

    }, [editableOutline, initialDraft, selectedTitle, finalizedTitle, finalizedDescription, coverImageUrl]);


    useEffect(() => {
        if (userId && draftId) {
            const draftRef = db.collection(`artifacts/${appId}/users/${userId}/wizards`).doc(draftId);
            const stateToSave = { ...debouncedState, updatedAt: new Date() };
            draftRef.set(stateToSave, { merge: true });
        }
    }, [debouncedState, userId, draftId, appId]);

    const handleClose = async () => {
        const isPristine = !inputs.location && !inputs.theme && (locations?.length || 0) === 0 && !coverImageUrl;
    
        if (isPristine && draftId) {
            try {
                const draftRef = db.collection(`artifacts/${appId}/users/${userId}/wizards`).doc(draftId);
                await draftRef.delete();
            } catch (error) {
                console.error("Failed to delete pristine draft on close:", error);
            }
        }
        onClose();
    };

    const handleStartOver = async () => {
        if (draftId) {
            try {
                const draftRef = db.collection(`artifacts/${appId}/users/${userId}/wizards`).doc(draftId);
                await draftRef.delete();
            } catch (error) {
                console.error("Failed to delete draft:", error);
            }
        }
        setShowConfirmModal(false);
        onClose();
    };
    
    const handleLocationsUpdate = useCallback((newLocations) => {
        setLocations(newLocations);
        setInputs(prev => ({ ...prev, location: newLocations[0]?.name || '' }));

        const newInventory = {};
        newLocations.forEach(loc => {
            newInventory[loc.place_id] = footageInventory[loc.place_id] || { 
                bRoll: false, onCamera: false, drone: false, importance: loc.importance || 'major'
            };
        });
        setFootageInventory(newInventory);
    }, [footageInventory]);
    
    // **NEW**: Function to handle the AI Points of Interest search
    const handleFindPointsOfInterest = async () => {
        const mainLocation = locations[0];
        if (!mainLocation) {
            setPoiError("Please add a main project location first.");
            return;
        }
        setIsFindingPois(true);
        setPoiError('');
        try {
            const points = await window.aiUtils.findPointsOfInterestAI(mainLocation.name, settings.geminiApiKey);
            // Filter out any points of interest that are already in the locations list
            const existingNames = locations.map(l => l.name.toLowerCase());
            const newSuggestions = points.filter(p => !existingNames.includes(p.toLowerCase()));
            setAiLocationSuggestions(newSuggestions);
        } catch (e) {
            setPoiError(`AI failed to find locations: ${e.message}`);
        } finally {
            setIsFindingPois(false);
        }
    };
    
    // **NEW**: Geocode a location name and add it to the list
    const handleSelectAiLocation = (locationName) => {
        if (!window.google?.maps?.Geocoder) {
            setPoiError("Google Maps service is not available.");
            return;
        }
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ 'address': `${locationName}, ${locations[0].name}` }, (results, status) => {
             if (status === 'OK' && results[0]) {
                const place = results[0];
                const newLocation = {
                    name: locationName, // Use the AI suggested name for clarity
                    place_id: place.place_id,
                    lat: place.geometry.location.lat(),
                    lng: place.geometry.location.lng(),
                    importance: 'major', // Default to major importance
                    types: place.types
                };
                 if (!locations.some(loc => loc.place_id === newLocation.place_id)) {
                    handleLocationsUpdate([...locations, newLocation]);
                    // Remove the added location from suggestions
                    setAiLocationSuggestions(prev => prev.filter(name => name !== locationName));
                }
            } else {
                setPoiError(`Could not find details for "${locationName}". Please add it manually.`);
            }
        });
    };
    
    const handleInventoryChange = (place_id, type, value) => {
        setFootageInventory(prev => ({
            ...prev,
            [place_id]: {
                ...(prev[place_id] || { bRoll: false, onCamera: false, drone: false, importance: 'major' }),
                [type]: value
            }
        }));
    };

    const handleKeywordSelection = (keyword) => {
        setSelectedKeywords(prev => 
            prev.includes(keyword) ? prev.filter(k => k !== keyword) : [...prev, keyword]
        );
    };

    const handleSelectAllFootage = (type, isChecked) => {
        const newInventory = { ...footageInventory };
        locations.slice(1).forEach(loc => {
            if (!newInventory[loc.place_id]) {
                newInventory[loc.place_id] = { bRoll: false, onCamera: false, drone: false, importance: 'major' };
            }
            newInventory[loc.place_id][type] = isChecked;
        });
        setFootageInventory(newInventory);
    };
    
    const handleGenerateKeywords = async () => {
        if (keywordIdeas.length > 0) { 
            setStep(3);
            return;
        }
        setIsLoading(true); setError('');
        
        try {
            const keywords = await window.aiUtils.generateKeywordsAI({
                title: inputs.location,
                concept: inputs.theme,
                locationsFeatured: locations.slice(1).map(l => l.name),
                projectTitle: inputs.location,
                projectDescription: inputs.theme,
                settings: settings
            });
            setKeywordIdeas(keywords);
            setStep(3);
        } catch (e) {
            setError(`Failed to generate keywords: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    };


    const handleGenerateInitialOutline = async () => {
        setIsLoading(true); setError('');
        
        const inventorySummary = locations.slice(1).map(loc => {
            const inventory = footageInventory[loc.place_id] || {};
            const types = [];
            if (inventory.bRoll) types.push("B-Roll");
            if (inventory.onCamera) types.push("On-camera segments");
            if (inventory.drone) types.push("Drone footage");
            const importanceLabel = inventory.importance === 'major' ? 'Major Feature' : 'Quick Section';
            return `- ${loc.name} (Role: ${importanceLabel}): Has ${types.join(', ')}.`;
        }).join('\n');
        
        const whoAmIKb = settings.knowledgeBases?.youtube?.whoAmI || '';
        const youtubeSeoKb = settings.knowledgeBases?.youtube?.youtubeSeoKnowledgeBase || '';
        const videoTitlesKb = settings.knowledgeBases?.youtube?.videoTitles || '';
        const videoDescriptionsKb = settings.knowledgeBases?.youtube?.videoDescriptions || '';

        const prompt = `You are a professional YouTube producer creating a project plan about "${inputs.location}" with the theme "${inputs.theme}".
Context:
1.  YouTube SEO Knowledge Base: ${youtubeSeoKb || 'N/A'}
2.  User's Style Guide: ${settings.styleGuideText || 'N/A'}
3.  User Persona (Who Am I): ${whoAmIKb || 'N/A'}
4.  YouTube Video Title Guidelines: ${videoTitlesKb || 'N/A'}
5.  YouTube Video Description Guidelines: ${videoDescriptionsKb || 'N/A'}
6.  User's Inventory: ${inventorySummary.length > 0 ? inventorySummary : "No specific sub-locations listed."}
7.  User's Targeted Keywords: ${selectedKeywords.join(', ')}

Your Task:
Generate a complete project plan as a JSON object.
-   **playlistTitleSuggestions**: Create 3 diverse, catchy titles for the whole series.
-   **playlistDescription**: Write a long-form (300-400 words) SEO-optimized description.
-   **videos**: Propose a video series. For each video, provide a title, a concept, an 'estimatedLengthMinutes' (e.g., "8-10"), a 'locations_featured' array (from the provided list), and a 'targeted_keywords' array (from the provided list).`;

        try {
            const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings.geminiApiKey);
            if (parsedJson && Array.isArray(parsedJson.playlistTitleSuggestions) && parsedJson.playlistDescription && Array.isArray(parsedJson.videos)) {
                parsedJson.playlistDescription = parsedJson.playlistDescription.replace(/\*\*/g, '');
                parsedJson.videos.forEach(video => {
                    video.status = 'pending';
                    video.description = video.concept;
                    video.chapters = [];
                    video.tasks = {};
                    video.publishDate = '';
                    video.metadata = '';
                    video.generatedThumbnails = [];
                    video.chosenTitle = video.title;
                    video.script = '';
                });
                setEditableOutline(parsedJson);
                setStep(4);
            } else {
                throw new Error("AI returned an invalid or incomplete project plan. Please try again.");
            }
        } catch (e) {
            setError(`Failed to generate outline: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    // ... (rest of the functions like handleRefineTitle, handleCreateProject, etc. remain the same) ...

    const wizardStep = () => {
        switch (step) {
            case 1: // Define Foundation
                return (
                    <div className="max-h-[70vh] overflow-y-auto pr-4"> 
                        <h2 className="text-2xl font-bold mb-4">New Project Wizard: Step 1 of 6</h2>
                        <p className="text-gray-400 mb-6">Define the project's foundation. The first location you add will be the main subject.</p>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Project Locations</label>
                                {googleMapsLoaded ? <window.LocationSearchInput onLocationsChange={handleLocationsUpdate} existingLocations={locations} /> : <window.MockLocationSearchInput />}
                            </div>

                            {/* **NEW**: Points of Interest Finder Section */}
                            {locations.length > 0 && (
                                <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Find Points of Interest</label>
                                    <p className="text-xs text-gray-400 mb-3">Use AI to discover popular attractions within <span className="font-bold text-primary-accent">{locations[0].name}</span>.</p>
                                    <button onClick={handleFindPointsOfInterest} disabled={isFindingPois} className="w-full px-5 py-2.5 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold disabled:opacity-75 flex items-center justify-center gap-2">
                                        {isFindingPois ? <window.LoadingSpinner isButton={true} /> : `📍 Find Attractions in ${locations[0].name}`}
                                    </button>
                                    {poiError && <p className="text-red-400 mt-2 text-sm">{poiError}</p>}
                                    {aiLocationSuggestions.length > 0 && (
                                        <div className="mt-4 pt-4 border-t border-gray-700/50">
                                            <h4 className="text-sm font-semibold text-gray-300 mb-2">AI Suggestions:</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {aiLocationSuggestions.map(name => (
                                                    <button 
                                                        key={name} 
                                                        onClick={() => handleSelectAiLocation(name)}
                                                        className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 rounded-full font-medium"
                                                    >
                                                        + {name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Key Message or Theme</label>
                                <textarea name="theme" value={inputs.theme} onChange={(e) => setInputs(p => ({ ...p, theme: e.target.value }))} placeholder="e.g., 'Exploring ancient castles and misty lochs'" rows="3" className="w-full form-textarea"></textarea>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Cover Image URL (Optional)</label>
                                <input type="url" value={coverImageUrl} onChange={(e) => setCoverImageUrl(e.target.value)} className="w-full form-input" placeholder="Paste image URL here (e.g., from Unsplash)" />
                            </div>
                        </div>
                    </div>
                );
            // ... (rest of the cases for other steps) ...
            default:
                 return <p>Wizard step not found.</p>;
        }
    }
    
    const renderActionButtons = () => {
        // ... (button rendering logic remains the same) ...
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4" onClick={handleClose}>
            {showConfirmModal && <window.ConfirmationModal onConfirm={handleStartOver} onCancel={() => setShowConfirmModal(false)} />}
            <div className="glass-card rounded-lg p-8 w-full max-w-5xl flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex-shrink-0">
                    <button onClick={handleClose} className="absolute top-4 right-6 text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
                </div>
                <div className="flex-grow overflow-y-auto">
                    {wizardStep()}
                </div>
                <div className="flex-shrink-0 pt-6 mt-6 border-t border-gray-700">
                    {/* This function would contain the next/back buttons */}
                    {renderActionButtons()}
                </div>
            </div>
        </div>
    );
};
