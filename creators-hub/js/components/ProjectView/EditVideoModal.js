// creators-hub/js/components/ProjectView/EditVideoModal.js

const { useState, useEffect, useCallback } = React;

window.EditVideoModal = ({ video, project, allVideos, userId, settings, onClose, onSave, googleMapsLoaded, db }) => {
    // --- STATE MANAGEMENT ---

    // Video-specific details from the provided original code
    const [title, setTitle] = useState(video.chosenTitle || video.title);
    const [concept, setConcept] = useState(video.concept);
    const [targetedKeywords, setTargetedKeywords] = useState(video.targeted_keywords || []);
    const [keywordInput, setKeywordInput] = useState('');

    // --- NEW & MODIFIED STATE for Location/Inventory Sync ---
    // State for locations tied to this specific video
    const [videoLocations, setVideoLocations] = useState(
        video.locations_featured
            ? (project.locations || []).filter(loc => video.locations_featured.includes(loc.name))
            : []
    );

    // State for the overall project data, which can be modified from this modal
    const [projectLocations, setProjectLocations] = useState(project.locations || []);
    const [projectFootageInventory, setProjectFootageInventory] = useState(project.footageInventory || {});
    
    // AI and UI State from original code
    const [keywordIdeas, setKeywordIdeas] = useState([]);
    const [isLoadingKeywords, setIsLoadingKeywords] = useState(false);
    const [keywordError, setKeywordError] = useState('');
    const [refinement, setRefinement] = useState('');
    const [generating, setGenerating] = useState(false);
    const [showConfirmComplete, setShowConfirmComplete] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const appId = window.CREATOR_HUB_CONFIG.APP_ID;

    // --- EFFECTS ---

    // Effect to keep project-level footage inventory in sync with project locations
    useEffect(() => {
        setProjectFootageInventory(prevInventory => {
            const newInventory = {};
            (projectLocations || []).forEach(loc => {
                newInventory[loc.name] = prevInventory[loc.name] || {
                    name: loc.name, bRoll: false, onCamera: false, drone: false, stopType: 'quick'
                };
            });
            return newInventory;
        });
    }, [projectLocations]);

    // --- HANDLERS ---

    // Handles updates from the LocationSearchInput for this video
    const handleLocationsUpdateForVideo = useCallback((newLocationsForVideo) => {
        setVideoLocations(newLocationsForVideo);
        // Ensure any new location is added to the main project list if it's not already there
        setProjectLocations(currentProjectLocations => {
            const newProjectLocations = [...currentProjectLocations];
            newLocationsForVideo.forEach(videoLoc => {
                if (!currentProjectLocations.some(projLoc => projLoc.name === videoLoc.name)) {
                    newProjectLocations.push(videoLoc);
                }
            });
            return newProjectLocations;
        });
    }, []);

    // Handles changes to the footage inventory (checkboxes, toggles)
    const handleInventoryChange = (locationName, field, value) => {
        setProjectFootageInventory(prev => ({
            ...prev,
            [locationName]: { ...(prev[locationName] || { name: locationName }), [field]: value },
        }));
    };

    // Handles "Select All" for footage types
    const handleSelectAllFootage = (type, isChecked) => {
        const newInventory = { ...projectFootageInventory };
        videoLocations.forEach(loc => {
            newInventory[loc.name] = { ...(newInventory[loc.name] || { name: loc.name }), [type]: isChecked };
        });
        setProjectFootageInventory(newInventory);
    };

    // Handles deleting a location from this video's inventory
    const handleDeleteLocation = (locationNameToDelete) => {
        setVideoLocations(prev => prev.filter(loc => loc.name !== locationNameToDelete));
        const isLocationUsedElsewhere = (allVideos || []).some(v => 
            v.id !== video.id && v.locations_featured?.includes(locationNameToDelete)
        );
        if (!isLocationUsedElsewhere) {
            setProjectLocations(prev => prev.filter(loc => loc.name !== locationNameToDelete));
        }
    };
    
    // Keyword Handlers from original code
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

    // --- ASYNC & AI FUNCTIONS from original code ---

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
    
    // *** MODIFIED SAVE HANDLER with Batch Write for full synchronization ***
    const handleSaveChanges = async () => {
        setIsSaving(true);
        const batch = db.batch();

        // 1. Update the Video Document using the correct subcollection path
        const videoDocRef = db.collection(`artifacts/${appId}/users/${userId}/projects/${project.id}/videos`).doc(video.id);
        batch.update(videoDocRef, {
            chosenTitle: title,
            concept: concept,
            locations_featured: videoLocations.map(loc => loc.name),
            targeted_keywords: targetedKeywords
        });

        // 2. Update the Project Document with synced locations and inventory
        const projectDocRef = db.collection(`artifacts/${appId}/users/${userId}/projects`).doc(project.id);
        batch.update(projectDocRef, {
            locations: projectLocations,
            footageInventory: projectFootageInventory
        });

        try {
            await batch.commit();
            onSave(); // This will trigger a re-fetch in the parent and close the modal
        } catch (error) {
            console.error("Error saving changes in batch:", error);
        } finally {
            setIsSaving(false);
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

                    {/* Locations */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Video Locations</label>
                        <div className="p-3 bg-gray-900/50 rounded-lg border border-gray-700">
                             {googleMapsLoaded 
                                ? <window.LocationSearchInput onLocationsChange={handleLocationsUpdateForVideo} existingLocations={videoLocations} /> 
                                : <window.MockLocationSearchInput />
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
                                        const inventory = projectFootageInventory[location.name] || {};
                                        return (
                                            <div key={location.name} className="grid grid-cols-7 gap-4 items-center px-4 py-3 border-b border-gray-800 last:border-b-0">
                                                <div className="col-span-2 pr-2"><p className="font-semibold text-gray-200 truncate" title={location.name}>{location.name}</p></div>
                                                <div className="flex gap-1">
                                                    <button onClick={() => handleInventoryChange(location.name, 'stopType', 'major')} className={`flex-1 text-xs px-2 py-1.5 rounded-md transition-colors ${inventory.stopType === 'major' ? 'bg-green-600 text-white' : 'bg-gray-600 hover:bg-gray-500'}`}>Major</button>
                                                    <button onClick={() => handleInventoryChange(location.name, 'stopType', 'quick')} className={`flex-1 text-xs px-2 py-1.5 rounded-md transition-colors ${inventory.stopType === 'quick' ? 'bg-amber-600 text-white' : 'bg-gray-600 hover:bg-gray-500'}`}>Quick</button>
                                                </div>
                                                <div className="flex justify-center"><input type="checkbox" checked={!!inventory.bRoll} onChange={(e) => handleInventoryChange(location.name, 'bRoll', e.target.checked)} className="h-5 w-5 rounded bg-gray-900 border-gray-600 text-primary-accent focus:ring-primary-accent"/></div>
                                                <div className="flex justify-center"><input type="checkbox" checked={!!inventory.onCamera} onChange={(e) => handleInventoryChange(location.name, 'onCamera', e.target.checked)} className="h-5 w-5 rounded bg-gray-900 border-gray-600 text-primary-accent focus:ring-primary-accent"/></div>
                                                <div className="flex justify-center"><input type="checkbox" checked={!!inventory.drone} onChange={(e) => handleInventoryChange(location.name, 'drone', e.target.checked)} className="h-5 w-5 rounded bg-gray-900 border-gray-600 text-primary-accent focus:ring-primary-accent"/></div>
                                                <div className="flex justify-center">
                                                    <button onClick={() => handleDeleteLocation(location.name)} className="text-gray-500 hover:text-red-500 transition-colors" title={`Delete ${location.name}`}>
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

                {/* Modal Actions */}
                <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-700">
                    <button onClick={onClose} className="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold">Cancel</button>
                    <button onClick={handleSaveChanges} disabled={isSaving} className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                        {isSaving ? <window.LoadingSpinner isButton={true} /> : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};
