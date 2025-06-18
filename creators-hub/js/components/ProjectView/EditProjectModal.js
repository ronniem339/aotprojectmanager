// creators-hub/js/components/ProjectView/EditProjectModal.js

const { useState, useEffect, useCallback } = React;

window.EditProjectModal = ({ project, videos, userId, settings, onClose, googleMapsLoaded, firebaseAppInstance, db }) => {
    // State for all modal inputs and UI
    const [title, setTitle] = useState(project.playlistTitle);
    const [description, setDescription] = useState(project.playlistDescription);
    const [locations, setLocations] = useState(project.locations || []);
    const [targetedKeywords, setTargetedKeywords] = useState(project.targeted_keywords || []);
    const [keywordInput, setKeywordInput] = useState('');
    const [refinement, setRefinement] = useState('');
    const [generating, setGenerating] = useState(null);
    const [coverImageUrl, setCoverImageUrl] = useState(project.coverImageUrl || '');
    const [isSaving, setIsSaving] = useState(false);
    const [footageInventory, setFootageInventory] = useState(project.footageInventory || {});

    // Firebase and App configuration
    const appId = window.CREATOR_HUB_CONFIG.APP_ID;
    const storage = firebaseAppInstance ? firebaseAppInstance.storage() : null;

    // MODIFIED: Effect to keep footage inventory synced with locations, now using place_id
    useEffect(() => {
        setFootageInventory(prevInventory => {
            const newInventory = {};
            locations.forEach(loc => {
                const key = loc.place_id || loc.name; // Use place_id as the key, fallback to name for older data
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
    }, [locations]);

    // Function to download an image from a URL and upload it to Firebase Storage
    const downloadAndUploadImage = async (imageUrl, uploadPath) => {
        if (!imageUrl || !storage) return '';
        const fetchUrl = `/.netlify/functions/fetch-image?url=${encodeURIComponent(imageUrl)}`;
        try {
            const response = await fetch(fetchUrl);
            if (!response.ok) throw new Error(await response.text());
            const blob = await response.blob();
            const storageRef = storage.ref(uploadPath);
            await storageRef.put(blob);
            return await storageRef.getDownloadURL();
        } catch (error) {
            console.error(`Error downloading or uploading image:`, error);
            return '';
        }
    };

    // MODIFIED: Simplified handler for the new LocationSearchInput component
    const handleLocationsUpdate = useCallback((newLocations) => { setLocations(newLocations); }, []);

    // MODIFIED: Handlers now use place_id (or name as fallback) for keys
    const handleInventoryChange = (locationKey, field, value) => { setFootageInventory(prev => ({ ...prev, [locationKey]: { ...(prev[locationKey] || {}), [field]: value }})); };
    
    const handleSelectAllFootage = (type, isChecked) => {
        const newInventory = { ...footageInventory };
        locations.forEach(loc => { 
            const key = loc.place_id || loc.name;
            newInventory[key] = { ...(newInventory[key] || { name: loc.name }), [type]: isChecked }; 
        });
        setFootageInventory(newInventory);
    };

    // MODIFIED: Deletion is now based on place_id for reliability
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

    // Handler to regenerate locations and keywords based on all videos in the project
    const handleRegenerateFromVideos = () => {
        const allVideoLocationNames = new Set();
        const allVideoKeywords = new Set();
        videos.forEach(video => {
            (video.locations_featured || []).forEach(locName => allVideoLocationNames.add(locName));
            (video.targeted_keywords || []).forEach(keyword => allVideoKeywords.add(keyword));
        });
        const uniqueLocationNames = Array.from(allVideoLocationNames);
        const aggregatedLocations = (project.locations || []).filter(locObject => uniqueLocationNames.includes(locObject.name));
        uniqueLocationNames.forEach(name => {
            if (!aggregatedLocations.some(l => l.name === name)) {
                aggregatedLocations.push({ name: name, place_id: name, lat: null, lng: null, types: [] });
            }
        });
        setLocations(aggregatedLocations);
        setTargetedKeywords(Array.from(allVideoKeywords));
    };

    // *** MODIFIED SAVE HANDLER with Batch Write for full synchronization ***
    const handleSave = async () => {
        setIsSaving(true);
        let finalCoverImageUrl = coverImageUrl;
        if (coverImageUrl && !coverImageUrl.includes('firebasestorage.googleapis.com')) {
            try {
                const fileExtensionMatch = coverImageUrl.match(/\.(jpg|jpeg|png|gif|webp)/i);
                const fileExtension = fileExtensionMatch ? fileExtensionMatch[0] : '.jpg';
                const path = `project_thumbnails/${project.id}_${Date.now()}${fileExtension}`;
                finalCoverImageUrl = await downloadAndUploadImage(coverImageUrl, path);
            } catch (error) {
                console.error("Failed to upload new cover image to Firebase Storage:", error);
                finalCoverImageUrl = project.coverImageUrl || '';
            }
        }
        
        const batch = db.batch();

        // MODIFIED: Detect deleted locations based on place_id for reliability
        const originalLocationIds = (project.locations || []).map(l => l.place_id || l.name);
        const currentLocationIds = locations.map(l => l.place_id || l.name);
        const deletedLocationIds = originalLocationIds.filter(id => !currentLocationIds.includes(id));
        const deletedLocationNames = (project.locations || [])
            .filter(l => deletedLocationIds.includes(l.place_id || l.name))
            .map(l => l.name);

        // If locations were deleted, update all affected video documents
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

        // Update the main project document
        const projectDocRef = db.collection(`artifacts/${appId}/users/${userId}/projects`).doc(project.id);
        batch.update(projectDocRef, {
            playlistTitle: title,
            playlistDescription: description,
            locations: locations,
            coverImageUrl: finalCoverImageUrl,
            targeted_keywords: targetedKeywords,
            footageInventory: footageInventory
        });

        // Commit all changes
        try {
            await batch.commit();
            onClose(); 
        } catch (error) {
            console.error("Error saving project and updating videos:", error);
        } finally {
            setIsSaving(false);
        }
    };

    // AI refinement handler
    const handleRefine = async (type) => {
        // ... (AI handler code remains the same)
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-start z-50 p-4 overflow-y-auto">
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
                        {/* MODIFIED: Using the new LocationSearchInput component */}
                        {googleMapsLoaded 
                            ? <window.LocationSearchInput 
                                    onLocationsChange={handleLocationsUpdate} 
                                    existingLocations={locations} /> 
                            : <p className="text-gray-400 text-center">Loading location search...</p>
                        }
                    </div>

                    {/* Footage Inventory */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Footage Inventory</label>
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
                                {locations.length > 0 ? (
                                    locations.map(location => {
                                        // MODIFIED: Use place_id as the key for inventory
                                        const locationKey = location.place_id || location.name;
                                        const inventory = footageInventory[locationKey] || {};
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
                                                    {/* MODIFIED: Delete button now uses place_id */}
                                                    <button onClick={() => handleDeleteLocation(locationKey)} className="text-gray-500 hover:text-red-500 transition-colors" title={`Delete ${location.name}`}>
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    })
                                ) : ( <p className="text-gray-500 text-sm text-center p-4">Add locations to the project to manage their footage inventory.</p> )}
                            </div>
                        </div>
                    </div>

                    {/* Keywords, Cover Image, and AI Tools */}
                    {/* ... (This section remains the same) ... */}

                </div>

                {/* Final Save/Cancel Buttons */}
                <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-700">
                    <button onClick={onClose} className="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold">Cancel</button>
                    <button onClick={handleSave} disabled={isSaving} className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                        {isSaving ? <window.LoadingSpinner isButton={true} /> : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};
