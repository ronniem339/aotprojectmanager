// js/components/NewProjectWizard/WizardStep2_Inventory.js

window.WizardStep2_Inventory = ({ locations, footageInventory, onInventoryChange, onSelectAllFootage }) => {
    const subLocations = locations.slice(1);

    return (
        <div className="max-h-[70vh] overflow-y-auto pr-4">
            <h2 className="text-2xl font-bold mb-4">New Project Wizard: Step 2 of 6</h2>
            <p className="text-gray-400 mb-6">Log your available footage for each spot you'll visit within <span className="font-bold text-primary-accent">{locations[0]?.name || 'your main location'}</span>.</p>
            <div className="max-h-[60vh] overflow-y-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-800/50 sticky top-0 backdrop-blur-sm">
                        <tr>
                            <th className="p-3 text-sm font-semibold">Location</th>
                            <th className="p-3 text-sm font-semibold text-center w-24">
                                B-Roll
                                <input type="checkbox" onChange={(e) => onSelectAllFootage('bRoll', e.target.checked)} className="ml-2 h-4 w-4 rounded bg-gray-900 border-gray-600 text-primary-accent focus:ring-primary-accent align-middle"/>
                            </th>
                            <th className="p-3 text-sm font-semibold text-center w-28">
                                On-Camera
                                <input type="checkbox" onChange={(e) => onSelectAllFootage('onCamera', e.target.checked)} className="ml-2 h-4 w-4 rounded bg-gray-900 border-gray-600 text-primary-accent focus:ring-primary-accent align-middle"/>
                            </th>
                            <th className="p-3 text-sm font-semibold text-center w-24">
                                Drone
                                <input type="checkbox" onChange={(e) => onSelectAllFootage('drone', e.target.checked)} className="ml-2 h-4 w-4 rounded bg-gray-900 border-gray-600 text-primary-accent focus:ring-primary-accent align-middle"/>
                            </th>
                            <th className="p-3 text-sm font-semibold w-48">Narrative Role</th>
                        </tr>
                    </thead>
                    <tbody>
                        {subLocations.map(loc => {
                            const inventory = footageInventory[loc.place_id] || {};
                            const isCardComplete = inventory.bRoll || inventory.onCamera || inventory.drone;
                            return (
                                <tr key={loc.place_id} className={`border-b transition-colors ${isCardComplete ? 'border-gray-700' : 'border-amber-500'}`}>
                                    <td className="p-3 font-semibold text-primary-accent">{loc.name}</td>
                                    <td className="p-3 text-center"><input type="checkbox" checked={inventory.bRoll || false} onChange={(e) => onInventoryChange(loc.place_id, 'bRoll', e.target.checked)} className="h-5 w-5 rounded bg-gray-900 border-gray-600 text-primary-accent focus:ring-primary-accent"/></td>
                                    <td className="p-3 text-center"><input type="checkbox" checked={inventory.onCamera || false} onChange={(e) => onInventoryChange(loc.place_id, 'onCamera', e.target.checked)} className="h-5 w-5 rounded bg-gray-900 border-gray-600 text-primary-accent focus:ring-primary-accent"/></td>
                                    <td className="p-3 text-center"><input type="checkbox" checked={inventory.drone || false} onChange={(e) => onInventoryChange(loc.place_id, 'drone', e.target.checked)} className="h-5 w-5 rounded bg-gray-900 border-gray-600 text-primary-accent focus:ring-primary-accent"/></td>
                                    <td className="p-3">
                                        <div className="flex gap-1">
                                            <button onClick={() => onInventoryChange(loc.place_id, 'importance', 'major')} className={`flex-1 text-xs px-2 py-1.5 rounded-md transition-colors ${inventory.importance === 'major' ? 'bg-green-600 text-white' : 'bg-gray-600 hover:bg-gray-500'}`}>Major Feature</button>
                                            <button onClick={() => onInventoryChange(loc.place_id, 'importance', 'quick')} className={`flex-1 text-xs px-2 py-1.5 rounded-md transition-colors ${inventory.importance === 'quick' ? 'bg-amber-600 text-white' : 'bg-gray-600 hover:bg-gray-500'}`}>Quick Section</button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {locations.length <= 1 && (
                    <div className="p-4 border border-dashed border-gray-600 rounded-lg text-center text-gray-400 mt-4">
                        <p>Add more locations in the previous step to define your specific points of interest.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
