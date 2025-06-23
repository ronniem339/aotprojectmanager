// creators-hub/js/components/NewProjectWizard/WizardStep2_Inventory.js

window.WizardStep2_Inventory = ({
    locations,
    footageInventory,
    onLocationsUpdate,
    onInventoryChange,
    onSelectAllFootage,
    googleMapsLoaded
}) => {
    // This component is now fully "controlled" by its parent, NewProjectWizard.
    // This resolves the state management bug that caused search results to disappear.

    const handleDeleteLocation = (locationKeyToDelete) => {
        const newLocations = locations.filter(loc => (loc.place_id || loc.name) !== locationKeyToDelete);
        onLocationsUpdate(newLocations);
    };

    return (
        <div>
            <h2 className="text-2xl font-bold text-white mb-4">Step 2: Where did you go?</h2>
            <p className="text-gray-400 mb-6">Add the key locations from your trip. This will help the AI understand the geography of your project and will be used to generate location-specific ideas later.</p>

            <div className="space-y-6">
                <div className="bg-gray-800/50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-amber-300 mb-3">Project Locations</h3>
                    {googleMapsLoaded
                        ? <window.LocationSearchInput 
                                onLocationsChange={onLocationsUpdate} 
                                existingLocations={locations} />
                        : <p className="text-gray-400 text-center">Loading location search...</p>
                    }
                </div>

                {locations.length > 0 && (
                    <div className="bg-gray-800/50 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-amber-300 mb-3">Footage Inventory</h3>
                        <p className="text-gray-400 mb-4 text-sm">For each location, tell us what kind of footage you captured. This helps tailor scripting and editing suggestions.</p>
                        
                        <div className="hidden md:grid grid-cols-7 gap-4 text-xs font-semibold text-gray-400 border-b border-gray-700 px-4 py-2">
                            <div className="col-span-2">Location</div>
                            <div>Importance</div>
                            <div className="text-center">B-Roll <input type="checkbox" onChange={(e) => onSelectAllFootage('bRoll', e.target.checked)} className="ml-2 h-4 w-4 rounded bg-gray-900 border-gray-600 text-primary-accent focus:ring-primary-accent align-middle"/></div>
                            <div className="text-center">On-Camera <input type="checkbox" onChange={(e) => onSelectAllFootage('onCamera', e.target.checked)} className="ml-2 h-4 w-4 rounded bg-gray-900 border-gray-600 text-primary-accent focus:ring-primary-accent align-middle"/></div>
                            <div className="text-center">Drone <input type="checkbox" onChange={(e) => onSelectAllFootage('drone', e.target.checked)} className="ml-2 h-4 w-4 rounded bg-gray-900 border-gray-600 text-primary-accent focus:ring-primary-accent align-middle"/></div>
                            <div className="text-center">Actions</div>
                        </div>

                        <div>
                            {locations.map(location => {
                                const locationKey = location.place_id || location.name;
                                const inventory = footageInventory[locationKey] || {};
                                return (
                                    <div key={locationKey} className="grid grid-cols-1 md:grid-cols-7 gap-4 items-center px-4 py-3 border-b border-gray-800 last:border-b-0">
                                        <div className="md:col-span-2 font-semibold text-gray-200 truncate" title={location.name}>{location.name}</div>
                                        <div className="flex gap-1">
                                            <button onClick={() => onInventoryChange(locationKey, 'importance', 'major')} className={`flex-1 text-xs px-2 py-1.5 rounded-md transition-colors ${inventory.importance === 'major' ? 'bg-green-600 text-white' : 'bg-gray-600 hover:bg-gray-500'}`}>Major</button>
                                            <button onClick={() => onInventoryChange(locationKey, 'importance', 'quick')} className={`flex-1 text-xs px-2 py-1.5 rounded-md transition-colors ${inventory.importance === 'quick' ? 'bg-amber-600 text-white' : 'bg-gray-600 hover:bg-gray-500'}`}>Quick</button>
                                        </div>
                                        <div className="flex justify-center"><input type="checkbox" checked={!!inventory.bRoll} onChange={(e) => onInventoryChange(locationKey, 'bRoll', e.target.checked)} className="h-5 w-5 rounded bg-gray-900 border-gray-600 text-primary-accent focus:ring-primary-accent"/></div>
                                        <div className="flex justify-center"><input type="checkbox" checked={!!inventory.onCamera} onChange={(e) => onInventoryChange(locationKey, 'onCamera', e.target.checked)} className="h-5 w-5 rounded bg-gray-900 border-gray-600 text-primary-accent focus:ring-primary-accent"/></div>
                                        <div className="flex justify-center"><input type="checkbox" checked={!!inventory.drone} onChange={(e) => onInventoryChange(locationKey, 'drone', e.target.checked)} className="h-5 w-5 rounded bg-gray-900 border-gray-600 text-primary-accent focus:ring-primary-accent"/></div>
                                        <div className="flex justify-center">
                                            <button onClick={() => handleDeleteLocation(locationKey)} className="text-red-400 hover:text-red-300 p-1" title="Delete Location">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                            </button>
                                        </div>
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
