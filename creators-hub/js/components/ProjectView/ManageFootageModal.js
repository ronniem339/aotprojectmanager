window.ManageFootageModal = ({ project, video, onSave, onClose, settings, googleMapsLoaded }) => {
    const { useState, useEffect } = React;

    const [mainLocation, setMainLocation] = useState(null);
    const [localLocations, setLocalLocations] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const projectLocations = project.locations || [];
        setMainLocation(projectLocations.find(l => l.isMain) || projectLocations[0] || null);
        setLocalLocations(project.locations || []);
    }, [project]);

    const handleFindPointsOfInterest = async () => {
        if (!mainLocation || !settings.geminiApiKey) {
            setError("Main location or Gemini API key is missing.");
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            const result = await window.aiUtils.findPointsOfInterestAI({
                mainLocationName: mainLocation.name,
                currentLocations: localLocations,
                apiKey: settings.geminiApiKey,
                useProModelSetting: settings.useProModel, // Pass the setting
                flashModelName: settings.geminiFlashModelName, // Pass the setting
                proModelName: settings.geminiProModelName // Pass the setting
            });

            if (result.pointsOfInterest) {
                const newPois = result.pointsOfInterest.map(poi => ({
                    id: `poi_${Date.now()}_${Math.random()}`,
                    ...poi
                }));

                setLocalLocations(prev => {
                    const mainLocationIndex = prev.findIndex(l => l.id === mainLocation.id);
                    if (mainLocationIndex > -1) {
                        const updatedLocation = { ...prev[mainLocationIndex] };
                        updatedLocation.pointsOfInterest = [
                            ...(updatedLocation.pointsOfInterest || []),
                            ...newPois
                        ];
                        const newLocations = [...prev];
                        newLocations[mainLocationIndex] = updatedLocation;
                        return newLocations;
                    }
                    return prev;
                });
            }
        } catch (e) {
            console.error("Error finding points of interest:", e);
            setError(e.message || "Failed to find points of interest.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRefineVideoConcept = async () => {
         if (!video.concept || !settings.geminiApiKey) {
            setError("Video concept or Gemini API key is missing.");
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            const footageInventory = localLocations.flatMap(loc =>
                (loc.pointsOfInterest || []).map(poi => ({ location: loc.name, pointOfInterest: poi.name }))
            );

            const result = await window.aiUtils.refineVideoConceptBasedOnInventory({
                videoConcept: video.concept,
                footageInventory: footageInventory,
                apiKey: settings.geminiApiKey,
                useProModelSetting: settings.useProModel, // Pass the setting
                flashModelName: settings.geminiFlashModelName, // Pass the setting
                proModelName: settings.geminiProModelName // Pass the setting
            });

            if (result.refinedConcept) {
                // This is tricky - how to update the video in the project?
                // The modal should probably return the new concept and the parent handles the update.
                // For now, let's just log it.
                console.log("Refined concept:", result.refinedConcept);
                alert("Refined concept generated! Check the console. Saving this requires more complex state management.");

                 // To make this work, onSave should probably accept a video concept update
                 // onSave({ ...project, videos: [...], refinedVideoConcept: {videoId: video.id, concept: result.refinedConcept} })
            }
        } catch(e) {
             console.error("Error refining video concept:", e);
            setError(e.message || "Failed to refine video concept.");
        } finally {
             setIsLoading(false);
        }
    };

    const handleSaveAndClose = () => {
        onSave({ ...project, locations: localLocations });
        onClose();
    };


    if (!project) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl h-full max-h-[90vh] flex flex-col">
                <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold">Manage Footage & Locations</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
                </div>

                <div className="flex-grow p-6 overflow-y-auto space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Main Location: {mainLocation?.name}</h3>
                        <button
                            onClick={handleFindPointsOfInterest}
                            disabled={isLoading || !mainLocation}
                            className="btn-secondary"
                        >
                            {isLoading ? "Searching..." : "Find Points of Interest with AI"}
                        </button>
                    </div>

                    {video && (
                         <div>
                            <h3 className="text-lg font-semibold mb-2">Refine Video Concept</h3>
                            <p className="text-sm text-gray-400 mb-2">Current Concept: "{video.concept}"</p>
                            <button
                                onClick={handleRefineVideoConcept}
                                disabled={isLoading || !video.concept}
                                className="btn-secondary"
                            >
                                {isLoading ? "Refining..." : "Refine Concept based on Footage"}
                            </button>
                        </div>
                    )}
                    
                    {error && <p className="text-red-400 mt-4">{error}</p>}

                    <div className="space-y-4">
                        {localLocations.map(location => (
                            <div key={location.id} className="bg-gray-700 p-4 rounded-lg">
                                <h4 className="font-bold text-primary-accent">{location.name} {location.isMain && "(Main)"}</h4>
                                {location.pointsOfInterest && location.pointsOfInterest.length > 0 ? (
                                    <ul className="mt-2 space-y-2 pl-4">
                                        {location.pointsOfInterest.map(poi => (
                                            <li key={poi.id} className="text-sm">
                                                <strong className="text-gray-200">{poi.name}</strong>
                                                <p className="text-gray-400">{poi.description}</p>
                                                 {poi.bRoll && <p className="text-xs text-gray-500">B-Roll: {poi.bRoll.join(', ')}</p>}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-gray-500 mt-2">No points of interest added yet.</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-6 bg-gray-900 flex justify-end space-x-4 rounded-b-lg">
                    <button onClick={onClose} className="btn-secondary">Cancel</button>
                    <button onClick={handleSaveAndClose} className="btn-primary">Save Changes</button>
                </div>
            </div>
        </div>
    );
};
