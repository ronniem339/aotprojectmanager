const { useState, useEffect, useCallback } = React;

// Utility function to prevent adding duplicate locations based on place_id.
const addLocationsWithoutDuplicates = (existingLocations, newLocations) => {
    if (!Array.isArray(existingLocations) || !Array.isArray(newLocations)) {
        return existingLocations || [];
    }
    const existingLocationIds = new Set(existingLocations.map(loc => loc.place_id).filter(id => id));
    const uniqueNewLocations = newLocations.filter(newLoc => newLoc.place_id && !existingLocationIds.has(newLoc.place_id));
    return [...existingLocations, ...uniqueNewLocations];
};

window.Step0_LocationReview = ({ video, project, settings, handlers, googleMapsLoaded }) => {
    const [videoLocations, setVideoLocations] = useState(
        video.locations_featured
            ? (project.locations || []).filter(loc => video.locations_featured.includes(loc.name))
            : []
    );
    const [projectLocations, setProjectLocations] = useState(project.locations || []);
    const [projectFootageInventory, setProjectFootageInventory] = useState(project.footageInventory || {});

    // Sync local state with props on initial load and when video/project changes
    useEffect(() => {
        setVideoLocations(
            video.locations_featured
                ? (project.locations || []).filter(loc => video.locations_featured.includes(loc.name))
                : []
        );
        setProjectLocations(project.locations || []);
        setProjectFootageInventory(project.footageInventory || {});
    }, [video.id, project.id, video.locations_featured, project.locations, project.footageInventory]);

    // Effect to update projectFootageInventory when projectLocations change
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

    // Handlers for updating state and syncing with Firestore
    const handleLocationsUpdateForVideo = useCallback(async (updatedVideoLocations) => {
        setVideoLocations(updatedVideoLocations);
        const newProjectLocations = addLocationsWithoutDuplicates(projectLocations, updatedVideoLocations);
        setProjectLocations(newProjectLocations);

        // Update Firestore
        await handlers.updateVideo(video.id, {
            locations_featured: updatedVideoLocations.map(loc => loc.name)
        });
        await handlers.updateProject(project.id, {
            locations: newProjectLocations
        });
    }, [video.id, project.id, projectLocations, handlers]);

    const handleInventoryChange = useCallback(async (locationKey, field, value) => {
        const updatedInventory = {
            ...projectFootageInventory,
            [locationKey]: { ...(projectFootageInventory[locationKey] || {}), [field]: value },
        };
        setProjectFootageInventory(updatedInventory);

        // Update Firestore
        await handlers.updateProject(project.id, {
            footageInventory: updatedInventory
        });
    }, [project.id, projectFootageInventory, handlers]);

    const handleSelectAllFootage = useCallback(async (type, isChecked) => {
        const newInventory = { ...projectFootageInventory };
        videoLocations.forEach(loc => {
            const key = loc.place_id || loc.name;
            newInventory[key] = { ...(newInventory[key] || { name: loc.name }), [type]: isChecked };
        });
        setProjectFootageInventory(newInventory);

        // Update Firestore
        await handlers.updateProject(project.id, {
            footageInventory: newInventory
        });
    }, [project.id, projectFootageInventory, videoLocations, handlers]);

    const handleDeleteLocation = useCallback(async (locationKeyToDelete) => {
        const locationToDelete = videoLocations.find(loc => (loc.place_id || loc.name) === locationKeyToDelete);
        if (!locationToDelete) return;

        const updatedVideoLocations = videoLocations.filter(loc => (loc.place_id || loc.name) !== locationKeyToDelete);
        setVideoLocations(updatedVideoLocations);
        
        // Check if location is used elsewhere in the project before removing from project.locations
        const isLocationUsedElsewhere = (handlers.allVideos || []).some(v => 
            v.id !== video.id && v.locations_featured?.includes(locationToDelete.name)
        );

        let newProjectLocations = projectLocations;
        let newProjectFootageInventory = projectFootageInventory;

        if (!isLocationUsedElsewhere) {
            newProjectLocations = projectLocations.filter(loc => (loc.place_id || loc.name) !== locationKeyToDelete);
            setProjectLocations(newProjectLocations);
            // Also remove from footage inventory if no longer used anywhere
            const { [locationKeyToDelete]: removed, ...rest } = projectFootageInventory;
            newProjectFootageInventory = rest;
            setProjectFootageInventory(rest);
        }

        // Update Firestore
        await handlers.updateVideo(video.id, {
            locations_featured: updatedVideoLocations.map(loc => loc.name)
        });
        await handlers.updateProject(project.id, {
            locations: newProjectLocations,
            footageInventory: newProjectFootageInventory
        });
    }, [video.id, project.id, videoLocations, projectLocations, projectFootageInventory, handlers]);

    const handleNext = async () => {
        // Transition to the next step in the scripting workflow
        const newBlueprint = { ...video.tasks?.scriptingV2_blueprint, workflowStatus: 'transcript_input' };
        await handlers.updateVideo(video.id, { tasks: { ...video.tasks, scriptingV2_blueprint: newBlueprint } });
    };

    return (
        <div className="p-4 border border-gray-700 rounded-lg">
            <h2 className="text-xl font-bold text-white mb-3">Step 0: Review Video Locations & Footage</h2>
            <p className="mb-4 text-gray-400">Confirm the locations featured in this video and update your footage inventory. This information is crucial for the AI.</p>

            {/* Locations Section */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">Video Locations</label>
                <div className="p-3 bg-gray-900/50 rounded-lg border border-gray-700">
                     {googleMapsLoaded 
                        ? <window.LocationSearchInput 
                                onLocationsChange={handleLocationsUpdateForVideo} 
                                existingLocations={videoLocations}
                                googleMapsLoaded={googleMapsLoaded} /> 
                        : <p className="text-gray-400 text-center">Loading location search...</p>
                    }
                </div>
            </div>

            {/* Footage Inventory Section */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">Footage Inventory for this Video</label>
                <div className="bg-gray-900/50 rounded-lg border border-gray-700 overflow-x-auto">
                    <div className="grid grid-cols-1 md:grid-cols-7 gap-4 text-xs font-semibold text-gray-400 border-b border-gray-700 px-4 py-2">
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
                                    <div key={locationKey} className="grid grid-cols-1 md:grid-cols-7 gap-4 items-center px-4 py-3 border-b border-gray-800 last:border-b-0">
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
                        ) : (<p className="text-gray-500 text-sm text-center p-4">Add locations to this video to manage footage.</p>)}
                    </div>
                </div>
            </div>

            <div className="mt-6 flex justify-end">
                <button
                    onClick={handleNext}
                    className="btn btn-primary disabled:opacity-50"
                >
                    Confirm Locations & Continue
                </button>
            </div>
        </div>
    );
};
