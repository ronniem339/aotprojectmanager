// js/components/NewProjectWizard.js

const LocationSearchInput = ({ onLocationsChange, existingLocations }) => {
    const inputRef = useRef(null);
    const autocompleteRef = useRef(null);

    useEffect(() => {
        if (!inputRef.current || !window.google?.maps?.places) return;
        
        // Initialize the Autocomplete widget
        autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current);
        autocompleteRef.current.setFields(['place_id', 'name', 'geometry']);

        // This listener fires when a user selects a suggestion from the dropdown 
        // (by clicking or using arrow keys + enter, or our simulated click)
        const placeChangedListener = () => {
            const place = autocompleteRef.current.getPlace();
            if (place && place.geometry) {
                const newLocation = {
                    name: place.name,
                    place_id: place.place_id,
                    lat: place.geometry.location.lat(),
                    lng: place.geometry.location.lng(),
                };
                // Check for duplicates before adding to the list
                if (!existingLocations.some(loc => loc.place_id === newLocation.place_id)) {
                    onLocationsChange([...existingLocations, newLocation]);
                }
                if (inputRef.current) {
                    // Clear the input field for the next search
                    inputRef.current.value = ''; 
                }
            }
        };
        const placeChangedListenerHandle = autocompleteRef.current.addListener('place_changed', placeChangedListener);

        // This is our new keyboard handler for the rapid-fire input
        const handleKeyDown = (e) => {
            // Check if the suggestions dropdown is visible
            const suggestionsVisible = document.querySelector('.pac-container')?.style.display !== 'none';

            if (e.key === 'Enter' && suggestionsVisible) {
                e.preventDefault(); // Prevent form submission
                
                // Find the first suggestion in the dropdown and simulate a click
                // This will trigger the 'place_changed' listener we defined above
                const firstSuggestion = document.querySelector('.pac-item');
                if (firstSuggestion) {
                    firstSuggestion.click();
                }
            }
        };

        const inputElement = inputRef.current;
        inputElement.addEventListener('keydown', handleKeyDown);

        // Cleanup function to remove listeners when the component unmounts
        return () => {
            if (window.google) {
                window.google.maps.event.removeListener(placeChangedListenerHandle);
            }
            if (inputElement) {
                inputElement.removeEventListener('keydown', handleKeyDown);
            }
        };
    }, [existingLocations, onLocationsChange]); 

    const removeLocation = (place_id) => {
        onLocationsChange(existingLocations.filter(loc => loc.place_id !== place_id));
    };

    return (
        <div>
            {/* The input field for adding new locations via Google Places Autocomplete */}
            <input 
                ref={inputRef} 
                type="text" 
                placeholder="Search for and add locations..." 
                className="w-full form-input" 
            />
            
            {/* The list of currently added locations */}
            <div className="flex flex-wrap gap-2 mt-3">
                {existingLocations.length > 0 ? existingLocations.map((loc, index) => (
                    <div key={loc.place_id} className="bg-blue-600/50 text-white text-sm px-3 py-1.5 rounded-full flex items-center gap-2">
                        <span>
                            {loc.name}
                            {/* The first location in the list is always considered the "Overall" or "Main" one */}
                            {index === 0 && <span className="text-xs font-semibold text-blue-200 ml-1">(Main)</span>}
                        </span>
                        <button onClick={() => removeLocation(loc.place_id)} className="text-blue-200 hover:text-white font-bold text-lg leading-none transform hover:scale-110 transition-transform">×</button>
                    </div>
                )) : <p className="text-xs text-gray-400 px-1 mt-1">Your locations will appear here. The first one you add will be the main project location.</p>}
            </div>
        </div>
    );
};


const MockLocationSearchInput = () => {
    return <p className="text-sm text-amber-400 p-3 bg-amber-900/50 rounded-lg">Please enter a valid Google Maps API Key in the settings to enable location search.</p>;
};

const NewProjectWizard = ({ userId, settings, onClose, googleMapsLoaded, initialDraft }) => {
    const [step, setStep] = useState(initialDraft?.step || 1);
    const [inputs, setInputs] = useState(initialDraft?.inputs || { location: '', theme: '' });
    const [locations, setLocations] = useState(initialDraft?.locations || []);
    const [footageInventory, setFootageInventory] = useState(initialDraft?.footageInventory || {});
    const [editableOutline, setEditableOutline] = useState(initialDraft?.editableOutline || null);
    const [refinement, setRefinement] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const appId = window.CREATOR_HUB_CONFIG.APP_ID;
    const debouncedState = useDebounce({ step, inputs, locations, footageInventory, editableOutline }, 1000);

    useEffect(() => {
        if (userId) {
            const draftRef = db.collection(`artifacts/${appId}/users/${userId}/wizards`).doc('newProjectDraft');
            draftRef.set(debouncedState, { merge: true });
        }
    }, [debouncedState, userId]);

    const handleStartOver = async () => {
        const userConfirmed = true; 
        if (userConfirmed) {
            const draftRef = db.collection(`artifacts/${appId}/users/${userId}/wizards`).doc('newProjectDraft');
            await draftRef.delete();
            setStep(1);
            setInputs({ location: '', theme: '' });
            setLocations([]);
            setFootageInventory({});
            setEditableOutline(null);
            setError('');
        }
    };
    
    const handleLocationsUpdate = (newLocations) => {
        setLocations(newLocations);
        
        // The first location in the array is always considered the "overall" project location.
        // This updates the main 'location' theme whenever the list changes.
        setInputs(prev => ({ ...prev, location: newLocations[0]?.name || '' }));

        // Sync footage inventory with the new locations list
        const newInventory = {};
        newLocations.forEach(loc => {
            newInventory[loc.place_id] = footageInventory[loc.place_id] || { bRoll: false, onCamera: false, drone: false };
        });
        setFootageInventory(newInventory);
    };

    const handleFootageChange = (placeId, type) => { setFootageInventory(prev => ({ ...prev, [placeId]: { ...prev[placeId], [type]: !prev[placeId][type] } })); };
    const handleOutlineChange = (e, videoIndex = null, field) => {
        const { value } = e.target;
        setEditableOutline(prev => {
            if (videoIndex !== null) { const newVideos = [...prev.videos]; newVideos[videoIndex] = { ...newVideos[videoIndex], [field]: value }; return { ...prev, videos: newVideos }; }
            return { ...prev, [field]: value };
        });
    };

    const handleGenerateOrRefineOutline = async (isRefinement = false) => {
        const apiKey = settings.geminiApiKey || "";
        if (!apiKey) { setError("Please set your Gemini API Key in the settings first."); return; }
        setIsLoading(true); setError('');
        const inventorySummary = locations.map(loc => { const types = []; if (footageInventory[loc.place_id]?.bRoll) types.push("B-Roll"); if (footageInventory[loc.place_id]?.onCamera) types.push("On-camera segments"); if (footageInventory[loc.place_id]?.drone) types.push("Drone footage"); return `- ${loc.name}: ${types.join(', ')}`; }).join('\n');
        let prompt;
        const schema = `{ "playlistTitle": "...", "playlistDescription": "...", "videos": [ { "title": "...", "concept": "..." } ] }`;
        const knowledgeBase = settings.youtubeSeoKnowledgeBase || window.CREATOR_HUB_CONFIG.YOUTUBE_SEO_KNOWLEDGE_BASE;
        
        if(isRefinement) { 
            prompt = `Using the following YouTube knowledge base:\n${knowledgeBase}\n\nYou previously generated the following JSON outline:\n\n${JSON.stringify(editableOutline, null, 2)}\n\nThe user has provided the following feedback to refine it: "${refinement}"\n\nPlease generate a NEW, updated JSON object that incorporates this feedback. The original footage inventory is still:\n${inventorySummary}\n\nYour response MUST be ONLY the updated JSON object, following this schema: ${schema}.`;
        } else { 
            prompt = `Using the following YouTube knowledge base:\n${knowledgeBase}\n\nAct as a professional YouTube video producer. Create a project plan for a video series about "${inputs.location}". The overarching theme is: "${inputs.theme}". The user has this footage inventory for specific spots within that location:\n${inventorySummary}\nBased ONLY on this information, create an intelligent project outline. Your response MUST be a valid JSON object with NO other text before or after it, following this schema: ${schema}`; 
        }
        
        try {
            const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } };
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
            const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!response.ok) { const err = await response.json(); throw new Error(err?.error?.message || 'API Error'); }
            const result = await response.json();
            const parsedJson = JSON.parse(result.candidates[0].content.parts[0].text);
            setEditableOutline(parsedJson);
            setRefinement("");
            if(!isRefinement) setStep(3);
        } catch (e) { console.error("Error generating/refining outline:", e); setError(`Failed to process outline. ${e.message}`);
        } finally { setIsLoading(false); }
    };

    const handleCreateProject = async () => {
        if (!editableOutline) return;
        setIsLoading(true);
        setError('');
        try {
            const thumbnailUrl = `https://source.unsplash.com/600x400/?${encodeURIComponent(editableOutline.playlistTitle || 'travel')}`;
            const batch = db.batch();
            const projectRef = db.collection(`artifacts/${appId}/users/${userId}/projects`).doc();
            batch.set(projectRef, {
                playlistTitle: editableOutline.playlistTitle,
                playlistDescription: editableOutline.playlistDescription,
                thumbnailUrl: thumbnailUrl,
                locations: locations.map(loc => ({ ...loc, footage: footageInventory[loc.place_id] || {} })),
                createdAt: new Date().toISOString()
            });
            editableOutline.videos.forEach((video) => {
                const videoRef = projectRef.collection('videos').doc();
                batch.set(videoRef, { title: video.title, concept: video.concept, script: '', metadata: '', blogPost: '', shortsIdeas: '', createdAt: new Date().toISOString() });
            });
            await batch.commit();
            const draftRef = db.collection(`artifacts/${appId}/users/${userId}/wizards`).doc('newProjectDraft');
            await draftRef.delete();
            onClose();
        } catch(e) { console.error("Error creating project:", e); setError(`Failed to save project. ${e.message}`);
        } finally { setIsLoading(false); }
    };

    const wizardStep = () => {
        switch (step) {
            case 1:
                return (
                    <div>
                        <h2 className="text-2xl font-bold mb-4">New Project Wizard: Step 1 of 3</h2>
                        <p className="text-gray-400 mb-6">Define the project's foundation. The first location you add will be considered the main subject of your project.</p>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Project Locations</label>
                                {googleMapsLoaded 
                                    ? <LocationSearchInput onLocationsChange={handleLocationsUpdate} existingLocations={locations} /> 
                                    : <MockLocationSearchInput />
                                }
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Key Message or Theme</label>
                                <textarea 
                                    name="theme" 
                                    value={inputs.theme} 
                                    onChange={(e) => setInputs(p => ({ ...p, theme: e.target.value }))} 
                                    placeholder="e.g., 'Exploring ancient castles and misty lochs'" 
                                    rows="3" 
                                    className="w-full form-textarea">
                                </textarea>
                            </div>
                        </div>
                        <div className="flex justify-end gap-4 mt-8">
                            <button onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg">Cancel</button>
                            <button onClick={() => setStep(2)} disabled={locations.length === 0} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:bg-gray-500 disabled:cursor-not-allowed">Next: Footage Inventory</button>
                        </div>
                    </div>
                );
            case 2:
                 const isInventoryComplete = locations.every(loc => Object.values(footageInventory[loc.place_id] || {}).some(v => v === true));
                 return (<div><h2 className="text-2xl font-bold mb-4">New Project Wizard: Step 2 of 3</h2><p className="text-gray-400 mb-6">Log the footage you already have for each location.</p><div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2">{locations.map(loc => (<div key={loc.place_id} className="p-4 border border-gray-700 rounded-lg"><p className="font-semibold text-lg text-blue-300">{loc.name}</p><div className="flex flex-col gap-2 mt-2"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={footageInventory[loc.place_id]?.bRoll || false} onChange={() => handleFootageChange(loc.place_id, 'bRoll')} className="h-4 w-4 rounded bg-gray-800 border-gray-600 text-indigo-600 focus:ring-indigo-500"/>B-Roll</label><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={footageInventory[loc.place_id]?.onCamera || false} onChange={() => handleFootageChange(loc.place_id, 'onCamera')} className="h-4 w-4 rounded bg-gray-800 border-gray-600 text-indigo-600 focus:ring-indigo-500"/>On-Camera</label><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={footageInventory[loc.place_id]?.drone || false} onChange={() => handleFootageChange(loc.place_id, 'drone')} className="h-4 w-4 rounded bg-gray-800 border-gray-600 text-indigo-600 focus:ring-indigo-500"/>Drone</label></div></div>))}</div>{!isInventoryComplete && <p className="text-amber-400 mt-4 text-sm">Please select at least one footage type for each location.</p>}{error && <p className="text-red-400 mt-4">{error}</p>}<div className="flex justify-between gap-4 mt-6"><button onClick={() => setStep(1)} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg">Back</button><button onClick={() => handleGenerateOrRefineOutline(false)} disabled={isLoading || !isInventoryComplete} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-2 disabled:bg-gray-500">{isLoading ? <LoadingSpinner/> : '🪄 Next: Generate Outline'}</button></div></div>);
            case 3:
                return (<div><h2 className="text-2xl font-bold mb-4">New Project Wizard: Step 3 of 3</h2><p className="text-gray-400 mb-6">Review, edit, and refine the AI-generated outline.</p>{editableOutline ? (<div className="space-y-6 text-left p-4 border border-gray-600 rounded-lg max-h-[60vh] overflow-y-auto pr-2"><div><label className="block text-sm font-medium text-gray-300 mb-1">Playlist Title</label><input name="playlistTitle" value={editableOutline.playlistTitle || ''} onChange={(e) => handleOutlineChange(e, null, 'playlistTitle')} className="w-full editable-field editable-field-title"/><label className="block text-sm font-medium text-gray-300 mb-1 mt-2">Playlist Description</label><textarea name="playlistDescription" value={editableOutline.playlistDescription || ''} onChange={(e) => handleOutlineChange(e, null, 'playlistDescription')} rows="2" className="w-full editable-field editable-field-concept"/></div><div className="border-t border-gray-600 pt-4"><h4 className="font-semibold text-lg mb-2">Proposed Videos:</h4><div className="space-y-4">{editableOutline.videos.map((video, index) => (<div key={index}><label className="block text-sm font-medium text-gray-300 mb-1">Video {index+1} Title</label><input name="title" value={video.title} onChange={(e) => handleOutlineChange(e, index, 'title')} className="w-full editable-field font-semibold"/><label className="block text-sm font-medium text-gray-300 mb-1 mt-2">Video {index+1} Concept</label><textarea name="concept" value={video.concept} onChange={(e) => handleOutlineChange(e, index, 'concept')} rows="2" className="w-full editable-field text-sm"/></div>))}</div></div><div className="mt-4"><label className="block text-sm font-medium text-gray-300 mb-1">Refinement Instructions</label><textarea value={refinement} onChange={(e) => setRefinement(e.target.value)} rows="2" className="w-full form-textarea" placeholder="e.g., 'Make the titles more mysterious.' or 'Change video 2 to focus on food.'"/></div></div>) : <LoadingSpinner text="Generating initial outline..." />}{error && <p className="text-red-400 mt-4">{error}</p>}<div className="flex justify-between gap-4 mt-8"><button onClick={() => setStep(2)} disabled={isLoading} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg">Back</button><div className="flex gap-4"><button onClick={() => handleGenerateOrRefineOutline(true)} disabled={isLoading || !refinement} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg flex items-center gap-2 disabled:bg-gray-500">{isLoading ? <LoadingSpinner/> : '🔁 Refine Outline'}</button><button onClick={handleCreateProject} disabled={isLoading} className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg flex items-center gap-2">{isLoading ? <LoadingSpinner text="Finalizing..."/> : '✅ Finish & Create Project'}</button></div></div></div>);
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4">
            <div className="glass-card rounded-lg p-8 w-full max-w-3xl">
                {wizardStep()}
                <button onClick={handleStartOver} className="text-xs text-gray-400 hover:text-red-400 mt-4">Start Over</button>
            </div>
        </div>
    );
};
