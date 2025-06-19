const { useState, useEffect } = React;

window.WizardStep2_Inventory = ({ onUpdate, inputs, user }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [aiError, setAiError] = useState(null);

    const handleLocationsUpdate = (newLocations) => {
        onUpdate({ ...inputs, locations: newLocations });
    };

    const handleInventoryChange = (locationKey, field, value) => {
        const newInventory = {
            ...inputs.footageInventory,
            [locationKey]: {
                ...(inputs.footageInventory[locationKey] || {}),
                [field]: value
            }
        };
        onUpdate({ ...inputs, footageInventory: newInventory });
    };

    const handleSelectAllFootage = (type, isChecked) => {
        const newInventory = { ...inputs.footageInventory };
        inputs.locations.forEach(loc => {
            const key = loc.place_id || loc.name;
            newInventory[key] = { ...(newInventory[key] || { name: loc.name }), [type]: isChecked };
        });
        onUpdate({ ...inputs, footageInventory: newInventory });
    };

    // This is the function that was missing. It calls the AI to find points of interest.
    const handleFindPointsOfInterest = async () => {
        setIsLoading(true);
        setAiError(null);
        try {
            // Call the AI utility function, passing the required inputs and the user's ID
            const pointsOfInterest = await findPointsOfInterestAI(
                inputs.location,
                inputs.tripType,
                inputs.interests,
                user.uid // Pass the user ID to fix the API key bug
            );
            // Add the new AI-suggested locations to the existing list
            onUpdate({ ...inputs, locations: [...inputs.locations, ...pointsOfInterest] });
        } catch (error) {
            console.error("AI failed to find locations:", error);
            setAiError(`AI failed to find locations: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        // This effect synchronizes the footage inventory when the locations list changes.
        const newInventory = { ...inputs.footageInventory };
        let inventoryUpdated = false;
        if (inputs.locations) {
            inputs.locations.forEach(loc => {
                const key = loc.place_id || loc.name;
                if (!newInventory[key]) {
                    inventoryUpdated = true;
                    newInventory[key] = {
                        name: loc.name,
                        place_id: loc.place_id,
                        bRoll: false,
                        onCamera: false,
                        drone: false,
                        stopType: 'quick'
                    };
                }
            });
        }
        if (inventoryUpdated) {
            onUpdate({ ...inputs, footageInventory: newInventory });
        }
    }, [inputs.locations]);


    return (
        <div>
            <h2 className="text-2xl font-bold text-white mb-4">Step 2: Where did you go?</h2>
            <p className="text-gray-400 mb-6">Add the key locations from your trip. You can add them manually or use the AI to suggest points of interest based on your trip details.</p>

            <div className="space-y-6">
                <div className="bg-gray-800/50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-amber-300 mb-3">Find Locations</h3>
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-grow">
                            <window.LocationSearchInput
                                onLocationsChange={handleLocationsUpdate}
                                existingLocations={inputs.locations || []}
                            />
                        </div>
                        <button
                            onClick={handleFindPointsOfInterest}
                            disabled={isLoading}
                            className="flex-shrink-0 bg-secondary-accent hover:bg-secondary-accent-darker text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? <window.LoadingSpinner /> : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                    </svg>
                                    AI Find Locations
                                </>
                            )}
                        </button>
                    </div>
                    {aiError && <p className="text-red-400 text-sm mt-2">{aiError}</p>}
                </div>


                {(inputs.locations && inputs.locations.length > 0) && (
                    <div className="bg-gray-800/50 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-amber-300 mb-3">Footage Inventory</h3>
                        <p className="text-gray-400 mb-4 text-sm">For each location, tell us what kind of footage you captured. This helps tailor scripting and editing suggestions.</p>

                        <div className="hidden md:grid grid-cols-6 gap-4 text-xs font-semibold text-gray-400 border-b border-gray-700 px-4 py-2">
                            <div className="col-span-2">Location</div>
                            <div>Stop Type</div>
                            <div className="text-center">B-Roll <input type="checkbox" onChange={(e) => handleSelectAllFootage('bRoll', e.target.checked)} className="ml-2 h-4 w-4 rounded bg-gray-900 border-gray-600 text-primary-accent focus:ring-primary-accent align-middle" /></div>
                            <div className="text-center">On-Camera <input type="checkbox" onChange={(e) => handleSelectAllFootage('onCamera', e.target.checked)} className="ml-2 h-4 w-4 rounded bg-gray-900 border-gray-600 text-primary-accent focus:ring-primary-accent align-middle" /></div>
                            <div className="text-center">Drone <input type="checkbox" onChange={(e) => handleSelectAllFootage('drone', e.target.checked)} className="ml-2 h-4 w-4 rounded bg-gray-900 border-gray-600 text-primary-accent focus:ring-primary-accent align-middle" /></div>
                        </div>

                        <div>
                            {inputs.locations.map(location => {
                                const locationKey = location.place_id || location.name;
                                const inventory = (inputs.footageInventory && inputs.footageInventory[locationKey]) ? inputs.footageInventory[locationKey] : {};
                                return (
                                    <div key={locationKey} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center px-4 py-3 border-b border-gray-800 last:border-b-0">
                                        <div className="md:col-span-2 font-semibold text-gray-200 truncate" title={location.name}>{location.name}</div>
                                        <div className="flex gap-1">
                                            <button onClick={() => handleInventoryChange(locationKey, 'stopType', 'major')} className={`flex-1 text-xs px-2 py-1.5 rounded-md transition-colors ${inventory.stopType === 'major' ? 'bg-green-600 text-white' : 'bg-gray-600 hover:bg-gray-500'}`}>Major</button>
                                            <button onClick={() => handleInventoryChange(locationKey, 'stopType', 'quick')} className={`flex-1 text-xs px-2 py-1.5 rounded-md transition-colors ${inventory.stopType === 'quick' ? 'bg-amber-600 text-white' : 'bg-gray-600 hover:bg-gray-500'}`}>Quick</button>
                                        </div>
                                        <div className="flex justify-center"><input type="checkbox" checked={!!inventory.bRoll} onChange={(e) => handleInventoryChange(locationKey, 'bRoll', e.target.checked)} className="h-5 w-5 rounded bg-gray-900 border-gray-600 text-primary-accent focus:ring-primary-accent" /></div>
                                        <div className="flex justify-center"><input type="checkbox" checked={!!inventory.onCamera} onChange={(e) => handleInventoryChange(locationKey, 'onCamera', e.target.checked)} className="h-5 w-5 rounded bg-gray-900 border-gray-600 text-primary-accent focus:ring-primary-accent" /></div>
                                        <div className="flex justify-center"><input type="checkbox" checked={!!inventory.drone} onChange={(e) => handleInventoryChange(locationKey, 'drone', e.target.checked)} className="h-5 w-5 rounded bg-gray-900 border-gray-600 text-primary-accent focus:ring-primary-accent" /></div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
