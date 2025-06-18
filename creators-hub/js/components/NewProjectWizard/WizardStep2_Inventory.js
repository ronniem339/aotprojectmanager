// creators-hub/js/components/NewProjectWizard/WizardStep2_Inventory.js

const { useState, useEffect } = React;

const WizardStep2_Inventory = ({ onDataChange, onValidationChange, initialData, googleMapsLoaded }) => {
    const [locations, setLocations] = useState(initialData.locations || []);
    const [footageInventory, setFootageInventory] = useState(initialData.footageInventory || {});

    // Effect to keep the footage inventory list synchronized with the locations list
    // MODIFIED: Now uses place_id as the key for better reliability
    useEffect(() => {
        setFootageInventory(prevInventory => {
            const newInventory = { ...prevInventory };
            locations.forEach(loc => {
                const key = loc.place_id || loc.name; // Use place_id, fallback to name for old data
                if (!newInventory[key]) {
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
            return newInventory;
        });
    }, [locations]);

    // Update parent component when data changes
    useEffect(() => {
        onDataChange({ locations, footageInventory });
        onValidationChange(locations.length > 0);
    }, [locations, footageInventory, onDataChange, onValidationChange]);

    // MODIFIED: Handlers now use the location key (place_id or name)
    const handleLocationsUpdate = (newLocations) => {
        setLocations(newLocations);
    };

    const handleInventoryChange = (locationKey, field, value) => {
        setFootageInventory(prev => ({
            ...prev,
            [locationKey]: { ...(prev[locationKey] || {}), [field]: value }
        }));
    };
    
    const handleDeleteLocation = (locationKeyToDelete) => {
        setLocations(prevLocations => prevLocations.filter(loc => (loc.place_id || loc.name) !== locationKeyToDelete));
    };

    const handleSelectAllFootage = (type, isChecked) => {
        const newInventory = { ...footageInventory };
        locations.forEach(loc => {
            const key = loc.place_id || loc.name;
            newInventory[key] = { ...(newInventory[key] || { name: loc.name }), [type]: isChecked };
        });
        setFootageInventory(newInventory);
    };


    return (
        <div>
            <h2 className="text-2xl font-bold text-white mb-4">Step 2: Where did you go?</h2>
            <p className="text-gray-400 mb-6">Add the key locations from your trip. This will help the AI understand the geography of your project and will be used to generate location-specific ideas later.</p>

            <div className="space-y-6">
                <div className="bg-gray-800/50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-amber-300 mb-3">Project Locations</h3>
                    {/* MODIFIED: Using the new LocationSearchInput component */}
                    {googleMapsLoaded
                        ? <window.LocationSearchInput 
                              onLocationsChange={handleLocationsUpdate} 
                              existingLocations={locations} />
                        : <p className="text-gray-400 text-center">Loading location search...</p>
                    }
                </div>

                {locations.length > 0 && (
                    <div className="bg-gray-800/50 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-amber-300 mb-3">Footage Inventory</h3>
                        <p className="text-gray-400 mb-4 text-sm">For each location, tell us what kind of footage you captured. This helps tailor scripting and editing suggestions.</p>
                        
                        <div className="hidden md:grid grid-cols-6 gap-4 text-xs font-semibold text-gray-400 border-b border-gray-700 px-4 py-2">
                            <div className="col-span-2">Location</div>
                            <div>Stop Type</div>
                            <div className="text-center">B-Roll <input type="checkbox" onChange={(e) => handleSelectAllFootage('bRoll', e.target.checked)} className="ml-2 h-4 w-4 rounded bg-gray-900 border-gray-600 text-primary-accent focus:ring-primary-accent align-middle"/></div>
                            <div className="text-center">On-Camera <input type="checkbox" onChange={(e) => handleSelectAllFootage('onCamera', e.target.checked)} className="ml-2 h-4 w-4 rounded bg-gray-900 border-gray-600 text-primary-accent focus:ring-primary-accent align-middle"/></div>
                            <div className="text-center">Drone <input type="checkbox" onChange={(e) => handleSelectAllFootage('drone', e.target.checked)} className="ml-2 h-4 w-4 rounded bg-gray-900 border-gray-600 text-primary-accent focus:ring-primary-accent align-middle"/></div>
                        </div>

                        <div>
                            {locations.map(location => {
                                // MODIFIED: Use place_id as the key for inventory
                                const locationKey = location.place_id || location.name;
                                const inventory = footageInventory[locationKey] || {};
                                return (
                                    <div key={locationKey} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center px-4 py-3 border-b border-gray-800 last:border-b-0">
                                        <div className="md:col-span-2 font-semibold text-gray-200 truncate" title={location.name}>{location.name}</div>
                                        <div className="flex gap-1">
                                            <button onClick={() => handleInventoryChange(locationKey, 'stopType', 'major')} className={`flex-1 text-xs px-2 py-1.5 rounded-md transition-colors ${inventory.stopType === 'major' ? 'bg-green-600 text-white' : 'bg-gray-600 hover:bg-gray-500'}`}>Major</button>
                                            <button onClick={() => handleInventoryChange(locationKey, 'stopType', 'quick')} className={`flex-1 text-xs px-2 py-1.5 rounded-md transition-colors ${inventory.stopType === 'quick' ? 'bg-amber-600 text-white' : 'bg-gray-600 hover:bg-gray-500'}`}>Quick</button>
                                        </div>
                                        <div className="flex justify-center"><input type="checkbox" checked={!!inventory.bRoll} onChange={(e) => handleInventoryChange(locationKey, 'bRoll', e.target.checked)} className="h-5 w-5 rounded bg-gray-900 border-gray-600 text-primary-accent focus:ring-primary-accent"/></div>
                                        <div className="flex justify-center"><input type="checkbox" checked={!!inventory.onCamera} onChange={(e) => handleInventoryChange(locationKey, 'onCamera', e.target.checked)} className="h-5 w-5 rounded bg-gray-900 border-gray-600 text-primary-accent focus:ring-primary-accent"/></div>
                                        <div className="flex justify-center"><input type="checkbox" checked={!!inventory.drone} onChange={(e) => handleInventoryChange(locationKey, 'drone', e.target.checked)} className="h-5 w-5 rounded bg-gray-900 border-gray-600 text-primary-accent focus:ring-primary-accent"/></div>
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
