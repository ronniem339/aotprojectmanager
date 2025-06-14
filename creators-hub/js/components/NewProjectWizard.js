// js/components/NewProjectWizard.js

const LocationSearchInput = ({ onLocationsChange, existingLocations }) => {
    const inputRef = useRef(null);
    const autocompleteRef = useRef(null);
    const geocoderRef = useRef(null);

    // This function intelligently sets a default importance based on Google's location types.
    const determineDefaultImportance = (types) => {
        const majorTypes = ['locality', 'administrative_area_level_1', 'administrative_area_level_2', 'country'];
        // If any of the location's types match our list of major types, classify it as a major feature.
        if (types.some(type => majorTypes.includes(type))) {
            return 'major';
        }
        // Otherwise, default to a quick section.
        return 'quick';
    };

    useEffect(() => {
        if (!inputRef.current || !window.google?.maps?.places) return;
        
        if (!geocoderRef.current) {
            geocoderRef.current = new window.google.maps.Geocoder();
        }

        // Initialize Autocomplete and request the 'types' field.
        autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current);
        autocompleteRef.current.setFields(['place_id', 'name', 'geometry', 'types']);

        const placeChangedListener = () => {
            const place = autocompleteRef.current.getPlace();
            if (place && place.geometry && place.types) {
                const newLocation = {
                    name: place.name,
                    place_id: place.place_id,
                    lat: place.geometry.location.lat(),
                    lng: place.geometry.location.lng(),
                    // Pass the types and the determined importance up to the parent.
                    importance: determineDefaultImportance(place.types),
                    types: place.types
                };
                if (!existingLocations.some(loc => loc.place_id === newLocation.place_id)) {
                    onLocationsChange([...existingLocations, newLocation]);
                }
                if (inputRef.current) {
                    inputRef.current.value = '';
                }
            }
        };
        const placeChangedListenerHandle = autocompleteRef.current.addListener('place_changed', placeChangedListener);

        const handleKeyDown = (e) => {
            if (e.key === 'Enter' && !e.defaultPrevented) {
                e.preventDefault();
                const firstSuggestion = document.querySelector('.pac-container .pac-item');
                if (firstSuggestion) {
                    const mainText = firstSuggestion.querySelector('.pac-item-query')?.innerText || '';
                    const secondaryText = firstSuggestion.querySelector('span:not(.pac-item-query)')?.innerText || '';
                    const fullAddress = `${mainText} ${secondaryText}`.trim();
                    
                    if (fullAddress && geocoderRef.current) {
                        geocoderRef.current.geocode({ 'address': fullAddress }, (results, status) => {
                            if (status === 'OK' && results[0]) {
                                const place = results[0];
                                const newLocation = {
                                    // Use the user-friendly name from the suggestion first, then fall back.
                                    name: mainText || place.formatted_address.split(',')[0],
                                    place_id: place.place_id,
                                    lat: place.geometry.location.lat(),
                                    lng: place.geometry.location.lng(),
                                    importance: determineDefaultImportance(place.types),
                                    types: place.types
                                };
                                 if (!existingLocations.some(loc => loc.place_id === newLocation.place_id)) {
                                    onLocationsChange([...existingLocations, newLocation]);
                                }
                                if (inputRef.current) {
                                    inputRef.current.value = '';
                                }
                            } else {
                                console.error('Geocode was not successful for the following reason: ' + status);
                            }
                        });
                    }
                }
            }
        };

        const inputElement = inputRef.current;
        inputElement.addEventListener('keydown', handleKeyDown);

        return () => {
            if (window.google?.maps?.event && placeChangedListenerHandle) {
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
            <input 
                ref={inputRef} 
                type="text" 
                placeholder="Search for and add locations..." 
                className="w-full form-input" 
            />
            <div className="flex flex-wrap gap-2 mt-3">
                {existingLocations.length > 0 ? existingLocations.map((loc, index) => (
                    <div key={loc.place_id} className="bg-blue-600/50 text-white text-sm px-3 py-1.5 rounded-full flex items-center gap-2">
                        <span>
                            {loc.name}
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
    // Shared state for the entire wizard
    const [step, setStep] = useState(initialDraft?.step || 1);
    const [inputs, setInputs] = useState(initialDraft?.inputs || { location: '', theme: '' });
    const [locations, setLocations] = useState(initialDraft?.locations || []);
    const [footageInventory, setFootageInventory] = useState(initialDraft?.footageInventory || {});
    
    // State for the generated plan and its individual parts
    const [editableOutline, setEditableOutline] = useState(initialDraft?.editableOutline || null);
    const [finalizedTitle, setFinalizedTitle] = useState(initialDraft?.finalizedTitle || null);
    const [finalizedDescription, setFinalizedDescription] = useState(initialDraft?.finalizedDescription || null);
    const [selectedTitle, setSelectedTitle] = useState(initialDraft?.selectedTitle || '');

    // State for refinement inputs
    const [refinement, setRefinement] = useState('');
    
    // UI state
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const appId = window.CREATOR_HUB_CONFIG.APP_ID;
    // Persist state to Firestore to allow resuming
    const debouncedState = useDebounce({ step, inputs, locations, footageInventory, editableOutline, finalizedTitle, finalizedDescription, selectedTitle }, 1000);

    useEffect(() => {
        // Set the selected title to the first suggestion when the outline is first loaded.
        if (editableOutline && editableOutline.playlistTitleSuggestions && !selectedTitle) {
            setSelectedTitle(editableOutline.playlistTitleSuggestions[0]);
        }
    }, [editableOutline]);


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
            setFinalizedTitle(null);
            setFinalizedDescription(null);
            setSelectedTitle('');
            setError('');
        }
    };
    
    const handleLocationsUpdate = (newLocations) => {
        setLocations(newLocations);
        setInputs(prev => ({ ...prev, location: newLocations[0]?.name || '' }));

        const newInventory = {};
        newLocations.forEach(loc => {
            newInventory[loc.place_id] = footageInventory[loc.place_id] || { 
                bRoll: false, onCamera: false, drone: false, importance: loc.importance 
            };
        });
        setFootageInventory(newInventory);
    };
    
    const handleInventoryChange = (placeId, field, value) => {
        setFootageInventory(prev => ({ ...prev, [placeId]: { ...prev[placeId], [field]: value } }));
    };
    
    // --- AI Interaction Functions ---
    const callGeminiAPI = async (prompt) => {
        const apiKey = settings.geminiApiKey || "";
        if (!apiKey) {
            setError("Please set your Gemini API Key in the settings first.");
            throw new Error("API Key not set");
        }
        const payload = {
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
        };
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err?.error?.message || 'API Error');
        }
        const result = await response.json();
        return JSON.parse(result.candidates[0].content.parts[0].text);
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
        
        const knowledgeBase = settings.youtubeSeoKnowledgeBase || window.CREATOR_HUB_CONFIG.YOUTUBE_SEO_KNOWLEDGE_BASE;
        const styleGuide = settings.styleGuideText ? `This is the user's personal style guide:\n${settings.styleGuideText}` : "No specific style guide was provided.";
        
        const prompt = `You are a professional YouTube producer creating a project plan about "${inputs.location}" with the theme "${inputs.theme}".
Context:
1.  YouTube SEO Knowledge Base: ${knowledgeBase}
2.  User's Style Guide: ${styleGuide}
3.  User's Inventory: ${inventorySummary.length > 0 ? inventorySummary : "No specific sub-locations listed."}

Your Task:
Generate a complete project plan as a JSON object.
-   **playlistTitleSuggestions**: Create 3 diverse, catchy, SEO-friendly titles for the whole series.
-   **playlistDescription**: Write a long-form (300-400 words) SEO-optimized description. Prioritize the SEO knowledge base, then infuse the user's style guide for tone.
-   **videos**: Propose a video series. For each video, provide a title, a concept, an 'estimatedLengthMinutes' (e.g., "8-10"), and a 'locations_featured' array listing the focused sub-locations. Give more focus to 'Major Feature' locations.`;

        try {
            const parsedJson = await callGeminiAPI(prompt);
            // **VALIDATION STEP:** Before setting state, ensure the AI response has the expected structure.
            if (parsedJson && Array.isArray(parsedJson.playlistTitleSuggestions) && parsedJson.playlistDescription && Array.isArray(parsedJson.videos)) {
                setEditableOutline(parsedJson);
                setStep(3);
            } else {
                // If the response is malformed, throw a specific error for the user.
                throw new Error("AI returned an invalid or incomplete project plan. Please try again.");
            }
        } catch (e) {
            setError(`Failed to generate outline: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleRefineTitle = async () => {
         setIsLoading(true); setError('');
         const prompt = `The user is creating a YouTube series about "${inputs.location}" with the theme "${inputs.theme}".
Previous title suggestions were: ${editableOutline.playlistTitleSuggestions.join(', ')}.
The user provided this feedback: "${refinement}".
Generate 3 NEW, creative, and SEO-friendly title suggestions that incorporate this feedback. Return as a JSON object like: {"playlistTitleSuggestions": ["title1", "title2", "title3"]}`;
         try {
             const parsedJson = await callGeminiAPI(prompt);
             if (parsedJson && Array.isArray(parsedJson.playlistTitleSuggestions)) {
                setEditableOutline(prev => ({...prev, playlistTitleSuggestions: parsedJson.playlistTitleSuggestions}));
                setSelectedTitle(parsedJson.playlistTitleSuggestions[0]); // Auto-select the new first suggestion
                setRefinement('');
             } else {
                 throw new Error("AI failed to return valid title suggestions.");
             }
         } catch(e) {
              setError(`Failed to refine titles: ${e.message}`);
         } finally {
             setIsLoading(false);
         }
    };

    const handleRefineDescription = async () => {
         setIsLoading(true); setError('');
         const prompt = `The user is creating a YouTube series titled "${finalizedTitle}". The current playlist description is: "${editableOutline.playlistDescription}".
The user provided this feedback for refinement: "${refinement}".
Rewrite the playlist description to incorporate the feedback, ensuring it remains SEO-optimized (300-400 words) and aligns with the user's style guide if provided.
Style Guide: ${settings.styleGuideText || 'Not provided.'}
SEO Knowledge Base: ${settings.youtubeSeoKnowledgeBase || window.CREATOR_HUB_CONFIG.YOUTUBE_SEO_KNOWLEDGE_BASE}
Return as a JSON object like: {"playlistDescription": "new description..."}`;
         try {
             const parsedJson = await callGeminiAPI(prompt);
             if(parsedJson && parsedJson.playlistDescription) {
                setEditableOutline(prev => ({...prev, playlistDescription: parsedJson.playlistDescription}));
                setRefinement('');
             } else {
                 throw new Error("AI failed to return a valid description.");
             }
         } catch(e) {
              setError(`Failed to refine description: ${e.message}`);
         } finally {
             setIsLoading(false);
         }
    };


    const handleCreateProject = async () => {
        if (!finalizedTitle || !finalizedDescription || !editableOutline.videos) return;
        setIsLoading(true);
        setError('');
        try {
            const thumbnailUrl = `https://source.unsplash.com/600x400/?${encodeURIComponent(finalizedTitle || 'travel')}`;
            const batch = db.batch();
            const projectRef = db.collection(`artifacts/${appId}/users/${userId}/projects`).doc();
            batch.set(projectRef, {
                playlistTitle: finalizedTitle,
                playlistDescription: finalizedDescription,
                thumbnailUrl: thumbnailUrl,
                locations: locations.map(loc => ({ ...loc, footage: footageInventory[loc.place_id] || {} })),
                createdAt: new Date().toISOString()
            });
            editableOutline.videos.forEach((video) => {
                const videoRef = projectRef.collection('videos').doc();
                // We're just saving the initial plan here. Detailed generation happens later.
                batch.set(videoRef, { title: video.title, concept: video.concept, script: '', metadata: '', blogPost: '', shortsIdeas: '', createdAt: new Date().toISOString() });
            });
            await batch.commit();
            const draftRef = db.collection(`artifacts/${appId}/users/${userId}/wizards`).doc('newProjectDraft');
            await draftRef.delete();
            onClose();
        } catch(e) { console.error("Error creating project:", e); setError(`Failed to save project. ${e.message}`);
        } finally { setIsLoading(false); }
    };
    
    // --- Wizard Step Rendering ---

    const wizardStep = () => {
        switch (step) {
            case 1: // Define Foundation
                return (
                    <div>
                        <h2 className="text-2xl font-bold mb-4">New Project Wizard: Step 1 of 5</h2>
                        <p className="text-gray-400 mb-6">Define the project's foundation. The first location you add will be the main subject. Add more for specific points of interest.</p>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Project Locations</label>
                                {googleMapsLoaded ? <LocationSearchInput onLocationsChange={handleLocationsUpdate} existingLocations={locations} /> : <MockLocationSearchInput />}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Key Message or Theme</label>
                                <textarea name="theme" value={inputs.theme} onChange={(e) => setInputs(p => ({ ...p, theme: e.target.value }))} placeholder="e.g., 'Exploring ancient castles and misty lochs'" rows="3" className="w-full form-textarea"></textarea>
                            </div>
                        </div>
                        <div className="flex justify-end gap-4 mt-8">
                            <button onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg">Cancel</button>
                            <button onClick={() => setStep(2)} disabled={locations.length === 0} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:bg-gray-500 disabled:cursor-not-allowed">Next: Footage Inventory</button>
                        </div>
                    </div>
                );
            case 2: // Footage Inventory
                 const subLocations = locations.slice(1);
                 const isInventoryComplete = subLocations.every(loc => {
                     const inventory = footageInventory[loc.place_id] || {};
                     return inventory.bRoll || inventory.onCamera || inventory.drone;
                 });
                 return (
                    <div>
                        <h2 className="text-2xl font-bold mb-4">New Project Wizard: Step 2 of 5</h2>
                        <p className="text-gray-400 mb-6">Tell us about the specific spots you'll visit within <span className="font-bold text-blue-300">{inputs.location || 'your main location'}</span>. We've set some smart defaults you can override.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2">
                           {subLocations.map(loc => {
                                const inventory = footageInventory[loc.place_id] || {};
                                const isCardComplete = inventory.bRoll || inventory.onCamera || inventory.drone;
                                return (
                                    <div key={loc.place_id} className={`p-4 border rounded-lg flex flex-col justify-between transition-colors ${isCardComplete ? 'border-gray-700' : 'border-amber-500'}`}>
                                        <p className="font-semibold text-lg text-blue-300">{loc.name}</p>
                                        <div className="flex flex-col gap-2 mt-3">
                                            <label className="flex items-center gap-2 cursor-pointer text-sm"><input type="checkbox" checked={inventory.bRoll || false} onChange={(e) => handleInventoryChange(loc.place_id, 'bRoll', e.target.checked)} className="h-4 w-4 rounded bg-gray-800 border-gray-600 text-indigo-600 focus:ring-indigo-500"/>B-Roll</label>
                                            <label className="flex items-center gap-2 cursor-pointer text-sm"><input type="checkbox" checked={inventory.onCamera || false} onChange={(e) => handleInventoryChange(loc.place_id, 'onCamera', e.target.checked)} className="h-4 w-4 rounded bg-gray-800 border-gray-600 text-indigo-600 focus:ring-indigo-500"/>On-Camera</label>
                                            <label className="flex items-center gap-2 cursor-pointer text-sm"><input type="checkbox" checked={inventory.drone || false} onChange={(e) => handleInventoryChange(loc.place_id, 'drone', e.target.checked)} className="h-4 w-4 rounded bg-gray-800 border-gray-600 text-indigo-600 focus:ring-indigo-500"/>Drone</label>
                                        </div>
                                        <div className="mt-4 pt-4 border-t border-gray-600">
                                            <label className="block text-sm font-medium text-gray-300 mb-2">Location's Role</label>
                                            <div className="flex gap-2">
                                                 <button onClick={() => handleInventoryChange(loc.place_id, 'importance', 'major')} className={`flex-1 text-xs px-2 py-1.5 rounded-md transition-colors ${inventory.importance === 'major' ? 'bg-green-600 text-white' : 'bg-gray-600 hover:bg-gray-500'}`}>Major Feature</button>
                                                 <button onClick={() => handleInventoryChange(loc.place_id, 'importance', 'quick')} className={`flex-1 text-xs px-2 py-1.5 rounded-md transition-colors ${inventory.importance === 'quick' ? 'bg-amber-600 text-white' : 'bg-gray-600 hover:bg-gray-500'}`}>Quick Section</button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                             {locations.length <= 1 && (
                                <div className="p-4 border border-dashed border-gray-600 rounded-lg text-center text-gray-400 col-span-1 md:col-span-2">
                                    <p>Add more locations in the previous step to define your specific points of interest.</p>
                                </div>
                            )}
                        </div>
                        {error && <p className="text-red-400 mt-4 bg-red-900/50 p-3 rounded-lg">{error}</p>}
                        {!isInventoryComplete && subLocations.length > 0 && <p className="text-amber-400 mt-4 text-sm">Please select at least one footage type for each location to continue.</p>}
                        <div className="flex justify-between gap-4 mt-6">
                            <button onClick={() => setStep(1)} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg">Back</button>
                            <button onClick={handleGenerateInitialOutline} disabled={isLoading || !isInventoryComplete} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-2 disabled:bg-gray-500 disabled:cursor-not-allowed">{isLoading ? <LoadingSpinner/> : '🪄 Generate Project Plan'}</button>
                        </div>
                    </div>
                 );
            case 3: // Refine Playlist Title
                return (
                    <div>
                        <h2 className="text-2xl font-bold mb-4">New Project Wizard: Step 3 of 5 - Refine Title</h2>
                        <p className="text-gray-400 mb-6">Choose the best title for your series, or ask for new ideas.</p>
                        {isLoading && <LoadingSpinner text="Thinking..." />}
                        {editableOutline?.playlistTitleSuggestions && (
                            <div className="space-y-3">
                                {editableOutline.playlistTitleSuggestions.map(title => (
                                    <label key={title} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${selectedTitle === title ? 'bg-blue-600/50 border-blue-400' : 'bg-gray-800/60 border-gray-700 hover:bg-gray-700/60'} border`}>
                                        <input type="radio" name="playlistTitle" value={title} checked={selectedTitle === title} onChange={(e) => setSelectedTitle(e.target.value)} className="h-4 w-4 bg-gray-900 border-gray-600 text-indigo-600 focus:ring-indigo-500"/>
                                        <span>{title}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                         <div className="mt-6">
                            <label className="block text-sm font-medium text-gray-300 mb-1">Refinement Instructions</label>
                            <textarea value={refinement} onChange={(e) => setRefinement(e.target.value)} rows="2" className="w-full form-textarea" placeholder="e.g., 'Make them more mysterious', 'Add the year', 'Focus on the adventure aspect'"/>
                        </div>
                        {error && <p className="text-red-400 mt-4 bg-red-900/50 p-3 rounded-lg">{error}</p>}
                        <div className="flex justify-between gap-4 mt-6">
                            <button onClick={() => setStep(2)} disabled={isLoading} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg">Back</button>
                            <div className="flex gap-4">
                                <button onClick={handleRefineTitle} disabled={isLoading || !refinement} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg flex items-center gap-2 disabled:bg-gray-500">🔁 Refine</button>
                                <button onClick={() => { setFinalizedTitle(selectedTitle); setStep(4); setRefinement(''); setError(''); }} disabled={isLoading || !selectedTitle} className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg flex items-center gap-2">Accept & Continue ➡️</button>
                            </div>
                        </div>
                    </div>
                );
            case 4: // Refine Playlist Description
                 return (
                    <div>
                        <h2 className="text-2xl font-bold mb-4">New Project Wizard: Step 4 of 5 - Refine Description</h2>
                        <p className="text-gray-400 mb-6">Review the AI-generated description for your playlist. Refine it if needed.</p>
                        {isLoading && !editableOutline?.playlistDescription && <LoadingSpinner text="Generating..." />}
                        {editableOutline?.playlistDescription && (
                             <textarea value={isLoading ? 'Regenerating...' : editableOutline.playlistDescription} readOnly={isLoading} rows="10" className="w-full form-textarea leading-relaxed bg-gray-800/60"/>
                        )}
                        <div className="mt-6">
                            <label className="block text-sm font-medium text-gray-300 mb-1">Refinement Instructions</label>
                            <textarea value={refinement} onChange={(e) => setRefinement(e.target.value)} rows="2" className="w-full form-textarea" placeholder="e.g., 'Make it more personal', 'Mention the drone footage specifically'"/>
                        </div>
                        {error && <p className="text-red-400 mt-4 bg-red-900/50 p-3 rounded-lg">{error}</p>}
                        <div className="flex justify-between gap-4 mt-6">
                            <button onClick={() => setStep(3)} disabled={isLoading} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg">Back</button>
                            <div className="flex gap-4">
                                <button onClick={handleRefineDescription} disabled={isLoading || !refinement} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg flex items-center gap-2 disabled:bg-gray-500">🔁 Refine</button>
                                <button onClick={() => { setFinalizedDescription(editableOutline.playlistDescription); setStep(5); setRefinement(''); setError('');}} disabled={isLoading} className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg flex items-center gap-2">Accept & Continue ➡️</button>
                            </div>
                        </div>
                    </div>
                 );
             case 5: // Review Video Plan
                return (
                    <div>
                        <h2 className="text-2xl font-bold mb-4">New Project Wizard: Step 5 of 5 - Review Video Plan</h2>
                        <p className="text-gray-400 mb-6">This is the overall plan for your video series. Review the structure before creating the project.</p>
                        {isLoading && !editableOutline?.videos && <LoadingSpinner text="Generating..." />}
                        {editableOutline?.videos && (
                            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                               {editableOutline.videos.map((video, index) => (
                                    <div key={index} className="p-4 bg-gray-800/60 rounded-lg border border-gray-700">
                                        <h3 className="font-bold text-lg text-blue-300">{`Video ${index + 1}: ${video.title}`}</h3>
                                        <p className="text-sm text-gray-400 mt-1 italic">Est. Length: {video.estimatedLengthMinutes} minutes</p>
                                        <p className="text-sm mt-3">{video.concept}</p>
                                        {video.locations_featured && video.locations_featured.length > 0 && (
                                            <div className="mt-3 pt-3 border-t border-gray-700/50">
                                                 <label className="block text-xs font-medium text-gray-400 mb-1">Locations Featured:</label>
                                                 <div className="flex flex-wrap gap-2">
                                                    {video.locations_featured.map(locName => (
                                                        <span key={locName} className="px-2 py-0.5 text-xs bg-blue-900/70 text-blue-200 rounded-full">{locName}</span>
                                                    ))}
                                                 </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                        {/* Note: In a future version, we could add refinement for the video plan itself */ }
                        {error && <p className="text-red-400 mt-4 bg-red-900/50 p-3 rounded-lg">{error}</p>}
                        <div className="flex justify-between gap-4 mt-8">
                            <button onClick={() => setStep(4)} disabled={isLoading} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg">Back</button>
                            <button onClick={handleCreateProject} disabled={isLoading} className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg flex items-center gap-2 text-lg font-semibold">{isLoading ? <LoadingSpinner text="Finalizing..."/> : '✅ Finish & Create Project'}</button>
                        </div>
                    </div>
                );
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4">
            <div className="glass-card rounded-lg p-8 w-full max-w-4xl">
                {wizardStep()}
                <button onClick={handleStartOver} className="text-xs text-gray-400 hover:text-red-400 mt-4 absolute bottom-4 left-8">Start Over</button>
            </div>
        </div>
    );
};
