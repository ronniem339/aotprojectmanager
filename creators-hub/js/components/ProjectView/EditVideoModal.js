// creators-hub/js/components/ProjectView/EditVideoModal.js

const { useState, useEffect, useCallback, useRef } = React;

// Utility function to prevent adding duplicate locations based on place_id.
const addLocationsWithoutDuplicates = (existingLocations, newLocations) => {
    if (!Array.isArray(existingLocations) || !Array.isArray(newLocations)) {
        return existingLocations || [];
    }
    const existingLocationIds = new Set(existingLocations.map(loc => loc.place_id).filter(id => id));
    const uniqueNewLocations = newLocations.filter(newLoc => newLoc.place_id && !existingLocationIds.has(newLoc.place_id));
    return [...existingLocations, ...uniqueNewLocations];
};


window.EditVideoModal = ({ video, project, allVideos, userId, settings, onClose, onSave, googleMapsLoaded, db, firebaseAppInstance }) => {
    // --- STATE MANAGEMENT ---
    const [title, setTitle] = useState(video.chosenTitle || video.title);
    const [concept, setConcept] = useState(video.concept);
    const [thumbnailUrl, setThumbnailUrl] = useState(video.thumbnail_url || '');
    const [targetedKeywords, setTargetedKeywords] = useState(video.targeted_keywords || []);
    const [keywordInput, setKeywordInput] = useState('');
    const [videoLocations, setVideoLocations] = useState(
        video.locations_featured
            ? (project.locations || []).filter(loc => video.locations_featured.includes(loc.name))
            : []
    );
    const [projectLocations, setProjectLocations] = useState(project.locations || []);
    const [projectFootageInventory, setProjectFootageInventory] = useState(project.footageInventory || {});
    
    // AI and UI State
    const [keywordIdeas, setKeywordIdeas] = useState([]);
    const [isLoadingKeywords, setIsLoadingKeywords] = useState(false);
    const [keywordError, setKeywordError] = useState('');
    const [refinement, setRefinement] = useState('');
    const [generating, setGenerating] = useState(false);
    const [showConfirmComplete, setShowConfirmComplete] = useState(false);
    const [saveStatus, setSaveStatus] = useState('idle'); // 'idle', 'saving', 'saved', 'error'

    const appId = window.CREATOR_HUB_CONFIG.APP_ID;
    const storage = firebaseAppInstance ? firebaseAppInstance.storage() : null;
    const isInitialMount = useRef(true);

    // --- AUTO-SAVING LOGIC ---
    const debouncedState = window.useDebounce({ title, concept, thumbnailUrl, targetedKeywords, videoLocations, projectLocations, projectFootageInventory }, 1500);

    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        const autoSaveChanges = async () => {
            setSaveStatus('saving');
            const batch = db.batch();
            let finalThumbnailUrl = debouncedState.thumbnailUrl;

            // Handle thumbnail upload if a new, non-Firebase URL is pasted
            if (finalThumbnailUrl && !finalThumbnailUrl.includes('firebasestorage.googleapis.com') && storage) {
                try {
                    const fetchUrl = `/.netlify/functions/fetch-image?url=${encodeURIComponent(finalThumbnailUrl)}`;
                    const response = await fetch(fetchUrl);
                    if (!response.ok) throw new Error(await response.text());
                    const blob = await response.blob();
                    const fileExtensionMatch = finalThumbnailUrl.match(/\.(jpg|jpeg|png|gif|webp)/i);
                    const fileExtension = fileExtensionMatch ? fileExtensionMatch[0] : '.jpg';
                    const path = `video_thumbnails/${project.id}/${video.id}_${Date.now()}${fileExtension}`;
                    const storageRef = storage.ref(path);
                    await storageRef.put(blob);
                    finalThumbnailUrl = await storageRef.getDownloadURL();
                    setThumbnailUrl(finalThumbnailUrl); // Update local state post-upload
                } catch (error) {
                    console.error("Failed to upload new thumbnail from URL:", error);
                    finalThumbnailUrl = video.thumbnail_url || ''; // Revert on failure
                }
            }

            // Update Video Document
            const videoDocRef = db.collection(`artifacts/${appId}/users/${userId}/projects/${project.id}/videos`).doc(video.id);
            batch.update(videoDocRef, {
                chosenTitle: debouncedState.title,
                concept: debouncedState.concept,
                locations_featured: debouncedState.videoLocations.map(loc => loc.name),
                targeted_keywords: debouncedState.targetedKeywords,
                thumbnail_url: finalThumbnailUrl
            });

            // Update Project Document
            const projectDocRef = db.collection(`artifacts/${appId}/users/${userId}/projects`).doc(project.id);
            batch.update(projectDocRef, {
                locations: debouncedState.projectLocations,
                footageInventory: debouncedState.projectFootageInventory
            });

            try {
                await batch.commit();
                setSaveStatus('saved');
                setTimeout(() => setSaveStatus('idle'), 2000);
            } catch (error) {
                console.error("Error auto-saving changes:", error);
                setSaveStatus('error');
                setTimeout(() => setSaveStatus('idle'), 3000);
            }
        };

        autoSaveChanges();
    }, [debouncedState, project.id, video.id, userId, appId, db]);
    // --- END AUTO-SAVING LOGIC ---


    // --- EFFECTS ---
    useEffect(() => {
        setProjectFootageInventory(prevInventory => {
            const newInventory = {};
            (projectLocations || []).forEach(loc => {
                const key = loc.place_id || loc.name;
                newInventory[key] = prevInventory[key] || {
                    name: loc.name,
                    place_id: loc.place_id,
                    bRoll: false,
                    onCamera: false,
                    drone: false,
                    stopType: 'quick'
                };
            });
            return newInventory;
        });
    }, [projectLocations]);

    // --- HANDLERS ---
    const handleThumbnailFileChange = async (e) => {
        if (e.target.files && e.target.files[0] && storage) {
            const file = e.target.files[0];
            setSaveStatus('saving'); // Indicate that an operation is in progress
            try {
                const path = `video_thumbnails/${project.id}/${video.id}_${Date.now()}_${file.name}`;
                const storageRef = storage.ref(path);
                await storageRef.put(file);
                const newUrl = await storageRef.getDownloadURL();
                setThumbnailUrl(newUrl); // This state change will be picked up by the debounced auto-save
            } catch (error) {
                console.error("Error uploading thumbnail:", error);
                setSaveStatus('error');
            }
        }
    };

    const handleLocationsUpdateForVideo = useCallback((updatedVideoLocations) => {
        setVideoLocations(updatedVideoLocations);
        setProjectLocations(currentProjectLocations => {
            return addLocationsWithoutDuplicates(currentProjectLocations, updatedVideoLocations);
        });
    }, []);

    const handleInventoryChange = (locationKey, field, value) => {
        setProjectFootageInventory(prev => ({
            ...prev,
            [locationKey]: { ...(prev[locationKey] || {}), [field]: value },
        }));
    };

    const handleSelectAllFootage = (type, isChecked) => {
        setProjectFootageInventory(prevInventory => {
            const newInventory = { ...prevInventory };
            videoLocations.forEach(loc => {
                const key = loc.place_id || loc.name;
                newInventory[key] = { ...(newInventory[key] || { name: loc.name }), [type]: isChecked };
            });
            return newInventory;
        });
    };
    
    const handleDeleteLocation = (locationKeyToDelete) => {
        const locationToDelete = videoLocations.find(loc => (loc.place_id || loc.name) === locationKeyToDelete);
        if (!locationToDelete) return;

        setVideoLocations(prev => prev.filter(loc => (loc.place_id || loc.name) !== locationKeyToDelete));
        
        const isLocationUsedElsewhere = (allVideos || []).some(v => 
            v.id !== video.id && v.locations_featured?.includes(locationToDelete.name)
        );

        if (!isLocationUsedElsewhere) {
            setProjectLocations(prev => prev.filter(loc => (loc.place_id || loc.name) !== locationKeyToDelete));
        }
    };
    
    const handleKeywordAdd = (e) => {
        if (e.key === 'Enter' && keywordInput.trim() !== '') {
            e.preventDefault();
            const newKeyword = keywordInput.trim();
            if (!targetedKeywords.includes(newKeyword)) {
                setTargetedKeywords([...targetedKeywords, newKeyword]);
            }
            setKeywordInput('');
        }
    };

    const handleKeywordRemove = (keywordToRemove) => {
        setTargetedKeywords(targetedKeywords.filter(kw => kw !== keywordToRemove));
    };
    
    const handleKeywordSelection = (keyword) => {
        setTargetedKeywords(prev => prev.includes(keyword) ? prev.filter(k => k !== keyword) : [...prev, keyword]);
    };

    // --- ASYNC & AI FUNCTIONS ---
    const handleGenerateKeywords = async () => {
        setIsLoadingKeywords(true);
        setKeywordError('');
        try {
            const keywords = await window.aiUtils.generateKeywordsAI({
                title: title,
                concept: concept,
                locationsFeatured: videoLocations.map(l => l.name),
                projectTitle: project.playlistTitle,
                projectDescription: project.playlistDescription,
                settings: settings
            });
            setKeywordIdeas(keywords);
        } catch (e) {
            setKeywordError(`Failed to generate keywords: ${e.message}`);
            console.error("Error generating keywords:", e);
        } finally {
            setIsLoadingKeywords(false);
        }
    };

    const handleRefine = async (type) => {
        setGenerating(type);
        const apiKey = settings.geminiApiKey || "";
        let prompt;
        if (type === 'title') {
            prompt = `The user is creating a YouTube video. The current title is "${title}" and the concept is "${concept}". Their refinement instruction is: "${refinement}". Generate 3 NEW, creative title suggestions. Return as a JSON object like: {"suggestions": ["title1", "title2", "title3"]}`;
        } else {
            prompt = `The user is creating a YouTube video. The current title is "${title}" and the concept is "${concept}". Their refinement instruction is: "${refinement}". Rewrite the video concept to incorporate the feedback. Return as a JSON object like: {"suggestion": "new concept..."}`;
        }
        try {
            const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } };
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
            const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!response.ok) throw new Error(await response.text());
            const result = await response.json();
            const parsedJson = JSON.parse(result.candidates[0].content.parts[0].text);
            if (type === 'title' && parsedJson.suggestions) {
                setTitle(parsedJson.suggestions[0]);
            } else if (type === 'concept' && parsedJson.suggestion) {
                setConcept(parsedJson.suggestion);
            }
        } catch (error) {
            console.error(`Error refining ${type}:`, error);
        } finally {
            setGenerating(false);
            setRefinement('');
        }
    };
    
    const handleMarkAllComplete = async () => {
        const videoDocRef = db.collection(`artifacts/${appId}/users/${userId}/projects/${project.id}/videos`).doc(video.id);
        const completedTasks = {};
        window.CREATOR_HUB_CONFIG.TASK_PIPELINE.forEach(task => {  
            completedTasks[task.id] = 'complete';
        });
        await videoDocRef.update({ tasks: completedTasks });
        onClose();
    };


    // --- RENDER METHOD ---
    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-start z-50 p-4 overflow-y-auto">
            <div className="glass-card rounded-lg p-6 md:p-8 w-full max-w-5xl relative my-8">
                <button onClick={onClose} className="absolute top-4 right-6 text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
                <h2 className="text-2xl font-bold mb-6">Edit Video Details</h2>
                
                <div className="space-y-6">
                    {/* Basic Details */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Video Title</label>
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full form-input" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Video Concept</label>
                        <textarea value={concept} onChange={(e) => setConcept(e.target.value)} rows="4" className="w-full form-textarea" />
                    </div>

                    {/* Thumbnail Section */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Video Thumbnail</label>
                        <div className="flex items-center gap-4 p-3 bg-gray-900/50 rounded-lg border border-gray-700">
                            {thumbnailUrl ? (
                                <img src={thumbnailUrl} alt="Video Thumbnail" className="w-40 h-24 object-cover rounded-md border border-gray-600"/>
                            ) : (
                                <div className="w-40 h-24 flex items-center justify-center bg-gray-800 text-gray-500 text-xs rounded-md border border-gray-700">No Thumbnail</div>
                            )}
                            <div className="flex-grow">
                                <input 
                                    type="text" 
                                    value={thumbnailUrl} 
                                    onChange={(e) => setThumbnailUrl(e.target.value)} 
                                    className="w-full form-input mb-2" 
                                    placeholder="Paste thumbnail URL here..."
                                />
                                <label className="block w-full text-center px-4 py-2 text-sm bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold cursor-pointer transition-colors">
                                    <span>Or Upload Thumbnail</span>
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        className="hidden" 
                                        onChange={handleThumbnailFileChange}
                                    />
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Locations */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Video Locations</label>
                        <div className="p-3 bg-gray-900/50 rounded-lg border border-gray-700">
                             {googleMapsLoaded 
                                ? <window.LocationSearchInput 
                                      onLocationsChange={handleLocationsUpdateForVideo} 
                                      existingLocations={videoLocations} /> 
                                : <p className="text-gray-400 text-center">Loading location search...</p>
                            }
                        </div>
                    </div>

                    {/* Footage Inventory */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Footage Inventory for this Video</label>
                        <div className="bg-gray-900/50 rounded-lg border border-gray-700">
                            <div className="grid grid-cols-7 gap-4 text-xs font-semibold text-gray-400 border-b border-gray-700 px-4 py-2">
                                <div className="col-span-2">Location</div>
                                <div>Stop Type</div>
                                <div className="text-center">B-Roll<input type="checkbox" onChange={(e) => handleSelectAllFootage('bRoll', e.target.checked)} className="ml-2 h-5 w-5 rounded bg-gray-900 border-gray-600 text-primary-accent focus:ring-primary-accent align-middle"/></div>
                                <div className="text-center">On-Camera<input type="checkbox" onChange={(e) => handleSelectAllFootage('onCamera', e.target.checked)} className="ml-2 h-5 w-5 rounded bg-gray-900 border-gray-600 text-primary-accent focus:ring-primary-accent align-middle"/></div>
                                <div className="text-center">Drone<input type="checkbox" onChange={(e) => handleSelectAllFootage('drone', e.target.checked)} className="ml-2 h-5 w-5 rounded bg-gray-900 border-gray-600 text-primary-accent focus:ring-primary-accent align-middle"/></div>
                                <div className="text-center">Action</div>
                            </div>
                            <div>
                                {videoLocations.length > 0 ? (
                                    videoLocations.map(location => {
                                        const locationKey = location.place_id || location.name;
                                        const inventory = projectFootageInventory[locationKey] || {};
                                        return (
                                            <div key={locationKey} className="grid grid-cols-7 gap-4 items-center px-4 py-3 border-b border-gray-800 last:border-b-0">
                                                <div className="col-span-2 pr-2"><p className="font-semibold text-gray-200 truncate" title={location.name}>{location.name}</p></div>
                                                <div className="flex gap-1">
                                                     <button onClick={() => handleInventoryChange(locationKey, 'stopType', 'major')} className={`flex-1 text-xs px-2 py-1.5 rounded-md transition-colors ${inventory.stopType === 'major' ? 'bg-green-600 text-white' : 'bg-gray-600 hover:bg-gray-500'}`}>Major</button>
                                                     <button onClick={() => handleInventoryChange(locationKey, 'stopType', 'quick')} className={`flex-1 text-xs px-2 py-1.5 rounded-md transition-colors ${inventory.stopType === 'quick' ? 'bg-amber-600 text-white' : 'bg-gray-600 hover:bg-gray-500'}`}>Quick</button>
                                                </div>
                                                <div className="flex justify-center"><input type="checkbox" checked={!!inventory.bRoll} onChange={(e) => handleInventoryChange(locationKey, 'bRoll', e.target.checked)} className="h-5 w-5 rounded bg-gray-900 border-gray-600 text-primary-accent focus:ring-primary-accent"/></div>
                                                <div className="flex justify-center"><input type="checkbox" checked={!!inventory.onCamera} onChange={(e) => handleInventoryChange(locationKey, 'onCamera', e.target.checked)} className="h-5 w-5 rounded bg-gray-900 border-gray-600 text-primary-accent focus:ring-primary-accent"/></div>
                                                <div className="flex justify-center"><input type="checkbox" checked={!!inventory.drone} onChange={(e) => handleInventoryChange(locationKey, 'drone', e.target.checked)} className="h-5 w-5 rounded bg-gray-900 border-gray-600 text-primary-accent focus:ring-primary-accent"/></div>
                                                <div className="flex justify-center">
                                                    <button onClick={() => handleDeleteLocation(locationKey)} className="text-gray-500 hover:text-red-500 transition-colors" title={`Delete ${location.name}`}>
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    })
                                ) : (<p className="text-gray-500 text-sm text-center p-4">Add locations to this video to manage footage.</p>)}
                            </div>
                        </div>
                    </div>

                    {/* Keywords Section */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Targeted Keywords</label>
                        <div className="p-2 bg-gray-900/50 rounded-lg border border-gray-700">
                            <div className="flex flex-wrap gap-2 mb-2">
                                {targetedKeywords.map(kw => (
                                    <div key={kw} className="flex items-center gap-2 px-2.5 py-1 text-xs bg-secondary-accent-darker-opacity text-secondary-accent-lighter-text rounded-full">
                                        <span>{kw}</span>
                                        <button onClick={() => handleKeywordRemove(kw)} className="text-secondary-accent-lighter-text hover:text-white font-bold leading-none">&times;</button>
                                    </div>
                                ))}
                            </div>
                            <input type="text" value={keywordInput} onChange={(e) => setKeywordInput(e.target.value)} onKeyDown={handleKeywordAdd} className="w-full form-input bg-gray-800 border-gray-600" placeholder="Type a keyword and press Enter..."/>
                            <button onClick={handleGenerateKeywords} disabled={isLoadingKeywords || !title || !concept} className="mt-3 px-4 py-2 text-sm bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold disabled:bg-gray-500 flex items-center gap-2">
                                {isLoadingKeywords ? <window.LoadingSpinner isButton={true} /> : '💡 Generate Keyword Ideas'}
                            </button>
                            {keywordError && <p className="text-red-400 mt-2 text-sm">{keywordError}</p>}
                            {keywordIdeas.length > 0 && (
                                <div className="mt-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                                    <h4 className="text-sm font-medium text-gray-300 mb-2">AI-Suggested Keywords:</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {keywordIdeas.map((kw) => (
                                            <button key={kw} onClick={() => handleKeywordSelection(kw)} className={`px-3 py-1.5 text-xs rounded-full transition-colors ${targetedKeywords.includes(kw) ? 'bg-primary-accent text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>{kw}</button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* AI Refinement */}
                    <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                        <label className="block text-sm font-medium text-gray-300 mb-2">Refine with AI</label>
                        <textarea value={refinement} onChange={(e) => setRefinement(e.target.value)} rows="2" className="w-full form-textarea" placeholder="e.g., 'Make the title catchier' or 'Focus the concept on the hiking aspect'"/>
                        <div className="flex gap-4 mt-2">
                            <button onClick={() => handleRefine('title')} disabled={generating || !refinement} className="px-4 py-2 text-sm bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold disabled:bg-gray-500 flex items-center gap-2">{generating === 'title' ? <window.LoadingSpinner isButton={true} /> : 'Refine Title'}</button>
                            <button onClick={() => handleRefine('concept')} disabled={generating || !refinement} className="px-4 py-2 text-sm bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold disabled:bg-gray-500 flex items-center gap-2">{generating === 'concept' ? <window.LoadingSpinner isButton={true} /> : 'Refine Concept'}</button>
                        </div>
                    </div>
                    
                    {/* Fast-Forward Section */}
                    <div className="p-4 bg-amber-900/30 rounded-lg border border-amber-700">
                        <label className="block text-sm font-medium text-amber-300 mb-2">Fast-Forward</label>
                        <p className="text-xs text-amber-300/80 mb-3">If this video is already published, you can mark all production tasks as complete.</p>
                        {showConfirmComplete ? (
                            <div className="flex items-center gap-4">
                                <p className="text-sm font-semibold text-white">Are you sure?</p>
                                <button onClick={handleMarkAllComplete} className="px-4 py-1 text-sm bg-red-600 hover:bg-red-700 rounded-lg">Yes, Confirm</button>
                                <button onClick={() => setShowConfirmComplete(false)} className="px-4 py-1 text-sm bg-gray-600 hover:bg-gray-500 rounded-lg">Cancel</button>
                            </div>
                        ) : (
                            <button onClick={() => setShowConfirmComplete(true)} className="px-4 py-2 text-sm bg-amber-600 hover:bg-amber-700 rounded-lg font-semibold">Mark All Tasks Complete</button>
                        )}
                    </div>
                </div>

                {/* Auto-Save Status Indicator */}
                <div className="flex justify-end items-center gap-4 mt-8 pt-6 border-t border-gray-700 h-10">
                    {saveStatus === 'saving' && (
                        <div className="flex items-center gap-2 text-gray-400">
                            <window.LoadingSpinner isButton={true} />
                            <span>Auto-saving...</span>
                        </div>
                    )}
                    {saveStatus === 'saved' && (
                        <div className="flex items-center gap-2 text-green-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span>Changes saved</span>
                        </div>
                    )}
                    {saveStatus === 'error' && (
                         <div className="flex items-center gap-2 text-red-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            <span>Save failed. Please try again.</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
