// creators-hub/js/components/ProjectView/EditProjectModal.js

const { useState, useEffect, useCallback, useRef } = React;

window.EditProjectModal = ({ project, videos, userId, settings, onClose, googleMapsLoaded, firebaseAppInstance, db }) => {
    // State for all modal inputs and UI
    const [title, setTitle] = useState(project.playlistTitle);
    const [description, setDescription] = useState(project.playlistDescription);
    const [locations, setLocations] = useState(project.locations || []);
    const [targetedKeywords, setTargetedKeywords] = useState(project.targeted_keywords || []);
    const [keywordInput, setKeywordInput] = useState('');
    const [coverImageUrl, setCoverImageUrl] = useState(project.coverImageUrl || '');
    const [footageInventory, setFootageInventory] = useState(project.footageInventory || {});
    const [saveStatus, setSaveStatus] = useState('idle'); // 'idle', 'saving', 'saved', 'error'

    // Firebase and App configuration
    const appId = window.CREATOR_HUB_CONFIG.APP_ID;
    const storage = firebaseAppInstance ? firebaseAppInstance.storage() : null;
    
    // --- AUTO-SAVING LOGIC ---
    const debouncedState = window.useDebounce({ title, description, locations, targetedKeywords, coverImageUrl, footageInventory }, 1500);
    const isInitialMount = useRef(true);

    useEffect(() => {
        // Prevent saving on the initial component mount
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        const autoSaveChanges = async () => {
            setSaveStatus('saving');
            // This variable will hold the final URL that gets saved to the database
            let urlToSaveInDb = debouncedState.coverImageUrl;

            // Handle image upload if a new, non-Firebase URL is detected (meaning it needs processing/uploading)
            if (urlToSaveInDb && !urlToSaveInDb.includes('firebasestorage.googleapis.com')) {
                try {
                    // Use the centralized utility to download and upload the image.
                    // This returns the new Firebase Storage URL if successful.
                    const newFirebaseUrl = await window.uploadUtils.downloadAndUploadImage(
                        urlToSaveInDb,             // The source URL to process
                        'project_thumbnails',      // storageFolderPath
                        project.id,                // filePrefix (e.g., project ID)
                        storage                    // storageInstance
                    );

                    if (newFirebaseUrl) { // If the upload was successful and a new URL was returned
                        setCoverImageUrl(newFirebaseUrl); // Update React state immediately for UI and future debounces
                        urlToSaveInDb = newFirebaseUrl;   // ENSURE this new Firebase URL is used for the CURRENT database save
                    } else { // If download/upload failed, revert to original project image URL for both state and DB
                        setCoverImageUrl(project.coverImageUrl || ''); // Revert local state
                        urlToSaveInDb = project.coverImageUrl || '';   // Revert for current DB save
                    }
                } catch (error) {
                    console.error("Failed to process and upload cover image from URL:", error);
                    setCoverImageUrl(project.coverImageUrl || ''); // Revert local state on error
                    urlToSaveInDb = project.coverImageUrl || '';   // Revert for current DB save on error
                }
            }
            // If urlToSaveInDb was already a Firebase URL (or empty/invalid originally),
            // it retains its debouncedState value and is used directly.

            const batch = db.batch();
            const projectDocRef = db.collection(`artifacts/${appId}/users/${userId}/projects`).doc(project.id);

            // Logic to update videos if locations are removed
            const originalLocationIds = (project.locations || []).map(l => l.place_id || l.name);
            const currentLocationIds = debouncedState.locations.map(l => l.place_id || l.name);
            const deletedLocationIds = originalLocationIds.filter(id => !currentLocationIds.includes(id));
            const deletedLocationNames = (project.locations || [])
                .filter(l => deletedLocationIds.includes(l.place_id || l.name))
                .map(l => l.name);

            if (deletedLocationNames.length > 0 && videos) {
                videos.forEach(video => {
                    const videoLocationsFeatured = video.locations_featured || [];
                    if (videoLocationsFeatured.some(locName => deletedLocationNames.includes(locName))) {
                        const newVideoLocationsFeatured = videoLocationsFeatured.filter(name => !deletedLocationNames.includes(name));
                        const videoDocRef = db.collection(`artifacts/${appId}/users/${userId}/projects/${project.id}/videos`).doc(video.id);
                        batch.update(videoDocRef, { locations_featured: newVideoLocationsFeatured });
                    }
                });
            }
            
            // Update the main project document with debounced data and the FINAL determined image URL
            batch.update(projectDocRef, {
                playlistTitle: debouncedState.title,
                playlistDescription: debouncedState.description,
                locations: debouncedState.locations,
                coverImageUrl: urlToSaveInDb, // THIS IS THE CRUCIAL LINE: Use the determined URL
                targeted_keywords: debouncedState.targetedKeywords,
                footageInventory: debouncedState.footageInventory
            });

            try {
                await batch.commit();
                setSaveStatus('saved');
                setTimeout(() => setSaveStatus('idle'), 2000); // Revert to idle after 2s
            } catch (error) {
                console.error("Error auto-saving project:", error);
                setSaveStatus('error');
                setTimeout(() => setSaveStatus('idle'), 3000);
            }
        };

        autoSaveChanges();

    }, [debouncedState, project.id, userId, appId, db, videos]);
    // --- END AUTO-SAVING LOGIC ---


    // Effect to keep footage inventory synced with locations
    useEffect(() => {
        setFootageInventory(prevInventory => {
            const newInventory = { ...(prevInventory || {}) };
            locations.forEach(loc => {
                const key = loc.place_id || loc.name;
                if (!newInventory[key]) {
                    newInventory[key] = { name: loc.name, place_id: loc.place_id, bRoll: false, onCamera: false, drone: false, stopType: 'quick' };
                }
            });
            return newInventory;
        });
    }, [locations]);

    // REMOVED: Old local downloadAndUploadImage function
    
    const handleImageFileChange = async (e) => {
        if (e.target.files && e.target.files[0] && storage) {
            const file = e.target.files[0];
            setSaveStatus('saving'); // Indicate that an operation is in progress
            try {
                // UPDATED: Using the centralized uploadFile utility
                const newUrl = await window.uploadUtils.uploadFile(
                    file,
                    'project_thumbnails', // storageFolderPath
                    project.id,           // filePrefix (e.g., project ID)
                    storage               // storageInstance
                );
                setCoverImageUrl(newUrl); // This change will be picked up by the debounced auto-save
            } catch (error) {
                console.error("Error uploading new image file:", error);
                setSaveStatus('error');
            }
        }
    };

    const handleLocationsUpdate = useCallback((newLocations) => { setLocations(newLocations); }, []);
    const handleInventoryChange = (locationKey, field, value) => { setFootageInventory(prev => ({ ...prev, [locationKey]: { ...(prev[locationKey] || {}), [field]: value }})); };
    const handleSelectAllFootage = (type, isChecked) => {
        const newInventory = { ...footageInventory };
        locations.forEach(loc => { 
            const key = loc.place_id || loc.name;
            newInventory[key] = { ...(newInventory[key] || { name: loc.name }), [type]: isChecked }; 
        });
        setFootageInventory(newInventory);
    };
    const handleDeleteLocation = (placeIdToDelete) => { 
        setLocations(locations.filter(loc => (loc.place_id || loc.name) !== placeIdToDelete)); 
    };
    const handleKeywordAdd = (e) => {
        if (e.key === 'Enter' && keywordInput.trim() !== '') {
            e.preventDefault();
            const newKeyword = keywordInput.trim();
            if (!targetedKeywords.includes(newKeyword)) { setTargetedKeywords([...targetedKeywords, newKeyword]); }
            setKeywordInput('');
        }
    };
    const handleKeywordRemove = (keywordToRemove) => { setTargetedKeywords(targetedKeywords.filter(kw => kw !== keywordToRemove)); };


    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-start z-50 p-4 sm:p-6 md:p-8 overflow-y-auto">
            <div className="glass-card rounded-lg p-6 md:p-8 w-full max-w-5xl relative my-8">
                <button onClick={onClose} className="absolute top-4 right-6 text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
                <h2 className="text-2xl font-bold mb-6">Edit Project Details</h2>
                
                <div className="space-y-6">
                    {/* Project Title, Description, Locations */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Project Title</label>
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full form-input" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Project Description</label>
                        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows="6" className="w-full form-textarea" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Project Locations</label>
                        {googleMapsLoaded 
                            ? <window.LocationSearchInput 
                                    onLocationsChange={handleLocationsUpdate} 
                                    existingLocations={locations} /> 
                            : <p className="text-gray-400 text-center">Loading location search...</p>
                        }
                    </div>
                    
                    {/* Cover Image Section */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Project Cover Image</label>
                        <div className="flex flex-col sm:flex-row items-center gap-4 p-3 bg-gray-900/50 rounded-lg border border-gray-700">
                            {coverImageUrl ? (
                                <img src={coverImageUrl} alt="Project Cover" className="w-full sm:w-40 h-auto sm:h-24 object-cover rounded-md border border-gray-600"/>
                            ) : (
                                <div className="w-full sm:w-40 h-24 flex items-center justify-center bg-gray-800 text-gray-500 text-xs rounded-md border border-gray-700">No Image</div>
                            )}
                            <div className="flex-grow w-full">
                                <input 
                                    type="text" 
                                    value={coverImageUrl} 
                                    onChange={(e) => setCoverImageUrl(e.target.value)} 
                                    className="w-full form-input mb-2" 
                                    placeholder="Paste image URL here..."
                                />
                                <label className="block w-full text-center px-4 py-2 text-sm bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold cursor-pointer transition-colors">
                                    <span>Or Upload an Image</span>
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        className="hidden" 
                                        onChange={handleImageFileChange}
                                    />
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Footage Inventory */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Footage Inventory</label>
                        <div className="bg-gray-900/50 rounded-lg border border-gray-700 overflow-x-auto">
                            <div className="hidden md:grid md:grid-cols-7 gap-4 text-xs font-semibold text-gray-400 border-b border-gray-700 px-4 py-2">
                                <div className="col-span-2">Location</div>
                                <div>Stop Type</div>
                                <div className="text-center">B-Roll<input type="checkbox" onChange={(e) => handleSelectAllFootage('bRoll', e.target.checked)} className="ml-2 h-5 w-5 rounded bg-gray-900 border-gray-600 text-primary-accent focus:ring-primary-accent align-middle"/></div>
                                <div className="text-center">On-Camera<input type="checkbox" onChange={(e) => handleSelectAllFootage('onCamera', e.target.checked)} className="ml-2 h-5 w-5 rounded bg-gray-900 border-gray-600 text-primary-accent focus:ring-primary-accent align-middle"/></div>
                                <div className="text-center">Drone<input type="checkbox" onChange={(e) => handleSelectAllFootage('drone', e.target.checked)} className="ml-2 h-5 w-5 rounded bg-gray-900 border-gray-600 text-primary-accent focus:ring-primary-accent align-middle"/></div>
                                <div className="text-center">Action</div>
                            </div>
                            <div>
                                {locations.length > 0 ? (
                                    locations.map(location => {
                                        const locationKey = location.place_id || location.name;
                                        const inventory = footageInventory[locationKey] || {};
                                        return (
                                            <div key={locationKey} className="grid grid-cols-1 md:grid-cols-7 gap-y-4 gap-x-2 items-center px-4 py-3 border-b border-gray-800 last:border-b-0">
                                                <div className="md:col-span-2 pr-2"><p className="font-semibold text-gray-200 truncate" title={location.name}>{location.name}</p></div>
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
                                ) : (<p className="text-gray-500 text-sm text-center p-4">Add locations to the project to manage their footage inventory.</p>)}
                            </div>
                        </div>
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
