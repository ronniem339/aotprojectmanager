// js/components/ProjectView/ManageFootageModal.js

const { useState, useEffect, useCallback, useMemo } = React;

window.ManageFootageModal = ({ project, videos, userId, settings, googleMapsLoaded, onClose, onSaveAndSuggestConcepts }) => {
    // Stage 1: Edit Inventory
    const [localLocations, setLocalLocations] = useState(project.locations || []);
    // Initialize localFootageInventory by merging existing project footage with new locations
    const initialFootageInventory = useMemo(() => {
        const inventory = { ...project.footageInventory };
        (project.locations || []).forEach(loc => {
            if (!inventory[loc.place_id]) {
                inventory[loc.place_id] = { bRoll: false, onCamera: false, drone: false, importance: 'major' };
            }
        });
        return inventory;
    }, [project.footageInventory, project.locations]);

    const [localFootageInventory, setLocalFootageInventory] = useState(initialFootageInventory);
    
    const [aiLocationSuggestions, setAiLocationSuggestions] = useState([]);
    const [isFindingPois, setIsFindingPois] = useState(false);
    const [poiError, setPoiError] = useState('');
    
    // Stage 2: Concept Review
    const [impactedVideos, setImpactedVideos] = useState([]); // Array of { videoId, currentConcept, newConceptSuggestion (from AI) }
    const [currentModalStage, setCurrentModalStage] = useState('inventoryEdit'); // 'inventoryEdit' or 'conceptReview'
    const [isGeneratingConcept, setIsGeneratingConcept] = useState({}); // {videoId: true/false}
    const [conceptErrors, setConceptErrors] = useState({}); // {videoId: errorMessage}

    // Helper to determine importance (copied from WizardStep1_Foundation)
    const determineDefaultImportance = (types) => {
        const majorTypes = ['locality', 'administrative_area_level_1', 'administrative_area_level_2', 'country'];
        if (types.some(type => majorTypes.includes(type))) {
            return 'major';
        }
        return 'quick';
    };

    // Location search handling (copied from WizardStep1_Foundation)
    const handleLocationsUpdate = useCallback((newLocations) => {
        setLocalLocations(newLocations);
        const newInventory = { ...localFootageInventory };
        newLocations.forEach(loc => {
            if (!newInventory[loc.place_id]) {
                // Initialize new locations with default importance and no footage
                newInventory[loc.place_id] = { bRoll: false, onCamera: false, drone: false, importance: determineDefaultImportance(loc.types || []) };
            }
        });
        // Remove inventory for locations that no longer exist in newLocations
        Object.keys(newInventory).forEach(place_id => {
            if (!newLocations.some(loc => loc.place_id === place_id)) {
                delete newInventory[place_id];
            }
        });
        setLocalFootageInventory(newInventory);
    }, [localFootageInventory]);

    const handleInventoryChange = useCallback((place_id, type, value) => {
        setLocalFootageInventory(prev => ({
            ...prev,
            [place_id]: { ...(prev[place_id] || {}), [type]: value }
        }));
    }, []);

    const handleFindPointsOfInterest = async () => {
        const mainLocation = localLocations[0];
        if (!mainLocation) {
            setPoiError("Please add a main project location first.");
            return;
        }
        setIsFindingPois(true);
        setPoiError('');
        try {
            const points = await window.aiUtils.findPointsOfInterestAI(mainLocation.name, settings.geminiApiKey);
            const existingNames = localLocations.map(l => l.name.toLowerCase());
            const newSuggestions = points.filter(p => !existingNames.includes(p.toLowerCase()));
            setAiLocationSuggestions(newSuggestions);
        } catch (e) {
            setPoiError(`AI failed to find locations: ${e.message}`);
        } finally {
            setIsFindingPois(false);
        }
    };

    const handleSelectAiLocation = (locationName) => {
        if (!window.google?.maps?.Geocoder) {
            setPoiError("Google Maps service is not available.");
            return;
        }
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ 'address': `${locationName}, ${localLocations[0].name}` }, (results, status) => {
            if (status === 'OK' && results[0]) {
                const place = results[0];
                const newLocation = {
                    name: locationName,
                    place_id: place.place_id,
                    lat: place.geometry.location.lat(),
                    lng: place.geometry.location.lng(),
                    importance: determineDefaultImportance(place.types),
                    types: place.types
                };
                if (!localLocations.some(loc => loc.place_id === newLocation.place_id)) {
                    // Update locations and let handleLocationsUpdate re-derive inventory
                    setLocalLocations(prev => [...prev, newLocation]);
                    setAiLocationSuggestions(prev => prev.filter(name => name !== locationName));
                }
            } else {
                setPoiError(`Could not find details for "${locationName}". Please add it manually.`);
            }
        });
    };

    const calculateImpactedVideos = useCallback(() => {
        const affectedVideos = [];
        const currentProjectLocationsMap = new Map(project.locations.map(loc => [loc.place_id, project.footageInventory[loc.place_id] || {}]));
        const newProjectLocationsMap = new Map(localLocations.map(loc => [loc.place_id, localFootageInventory[loc.place_id] || {}]));
        
        videos.forEach(video => {
            let isImpacted = false;
            const videoLocationsFeatured = video.locations_featured || [];

            // Check for changes in locations that were previously featured in this video
            if (videoLocationsFeatured.length > 0) {
                isImpacted = videoLocationsFeatured.some(locName => {
                    const featuredLoc = project.locations.find(l => l.name === locName);
                    // If featuredLoc is null, it means this location was previously in the video.locations_featured
                    // but not in project.locations. This might indicate bad data or a scenario where
                    // a location was deleted from project.locations without affecting video.locations_featured.
                    // For robustness, treat as impacted if it *was* there and is now gone or changed.
                    if (!featuredLoc) return false; 

                    const oldInventory = currentProjectLocationsMap.get(featuredLoc.place_id) || {};
                    const newInventory = newProjectLocationsMap.get(featuredLoc.place_id); 

                    // If location removed from project locations OR its inventory/importance changed
                    if (!newInventory || // Location was removed from the project entirely
                        oldInventory.bRoll !== newInventory.bRoll ||
                        oldInventory.onCamera !== newInventory.onCamera ||
                        oldInventory.drone !== newInventory.drone ||
                        oldInventory.importance !== newInventory.importance
                    ) {
                        return true;
                    }
                    return false;
                });
            }

            // Also check if any *newly added* locations are now featured in this video's concept/title.
            // This is more of an inference, and might require AI to determine if concept should change.
            // For simplicity, focus on changes to explicitly linked/featured locations.
            // For now, if a video is already "impacted" by explicit changes, we add it.

            if (isImpacted) {
                affectedVideos.push({
                    videoId: video.id,
                    videoTitle: video.title,
                    currentConcept: video.concept,
                    newConceptSuggestion: null, // Will be filled by AI if regenerated
                    status: video.tasks?.scripting === 'complete' ? 'script_complete' : 'pending', // Indicate if scripting is done
                    locationsFeaturedInVideo: videoLocationsFeatured,
                    relevantFootageChanges: videoLocationsFeatured.map(locName => {
                        const featuredLoc = project.locations.find(l => l.name === locName);
                        // Ensure featuredLoc exists in the old project locations before trying to get its old inventory
                        const oldInv = featuredLoc ? (currentProjectLocationsMap.get(featuredLoc.place_id) || {}) : null;
                        const newInv = localFootageInventory[featuredLoc?.place_id] || null; // Safely get new inventory

                        return {
                            name: locName,
                            old: oldInv,
                            new: newInv
                        };
                    }).filter(Boolean)
                });
            }
        });
        return affectedVideos;
    }, [localLocations, localFootageInventory, project.locations, project.footageInventory, videos]);

    const handleSaveInventory = async () => {
        const impacted = calculateImpactedVideos();
        if (impacted.length > 0) {
            setImpactedVideos(impacted);
            setCurrentModalStage('conceptReview');
        } else {
            // No impacted videos, directly save and close
            await onSaveAndSuggestConcepts(localLocations, localFootageInventory, []); // Empty array for video updates
            onClose();
        }
    };

    const handleGenerateConcept = async (videoIndex) => {
        const videoToImpact = impactedVideos[videoIndex];
        setIsGeneratingConcept(prev => ({ ...prev, [videoToImpact.videoId]: true }));
        setConceptErrors(prev => ({ ...prev, [videoToImpact.videoId]: '' }));

        const oldVideo = videos.find(v => v.id === videoToImpact.videoId);
        const originalVideoConcept = oldVideo?.concept || '';

        const footageSummary = videoToImpact.relevantFootageChanges.map(change => {
            const oldStatus = change.old ? `(Old: B:${change.old.bRoll ? 'Yes' : 'No'} OC:${change.old.onCamera ? 'Yes' : 'No'} D:${change.old.drone ? 'Yes' : 'No'} Imp:${change.old.importance})` : 'N/A (Location was likely newly added or not previously detailed)';
            const newStatus = change.new ? `(New: B:${change.new.bRoll ? 'Yes' : 'No'} OC:${change.new.onCamera ? 'Yes' : 'No'} D:${change.new.drone ? 'Yes' : 'No'} Imp:${change.new.importance})` : 'Removed from Project Locations';
            return `- ${change.name}: ${oldStatus} -> ${newStatus}`;
        }).join('\n');

        try {
            const newConcept = await window.aiUtils.refineVideoConceptBasedOnInventory({
                videoTitle: videoToImpact.videoTitle,
                currentConcept: originalVideoConcept,
                footageChangesSummary: footageSummary,
                settings: settings
            });

            setImpactedVideos(prev => prev.map((video, idx) => 
                idx === videoIndex ? { ...video, newConceptSuggestion: newConcept } : video
            ));

        } catch (err) {
            console.error("Error generating concept:", err);
            setConceptErrors(prev => ({ ...prev, [videoToImpact.videoId]: `Failed to generate: ${err.message}` }));
        } finally {
            setIsGeneratingConcept(prev => ({ ...prev, [videoToImpact.videoId]: false }));
        }
    };

    const handleAcceptNewConcept = (videoIndex, newConcept) => {
        setImpactedVideos(prev => prev.map((video, idx) => 
            idx === videoIndex ? { ...video, newConceptSuggestion: newConcept, status: 'accepted' } : video 
        ));
    };

    const handleKeepOldConcept = (videoIndex) => {
        setImpactedVideos(prev => prev.map((video, idx) => 
            idx === videoIndex ? { ...video, newConceptSuggestion: video.currentConcept, status: 'accepted' } : video
        ));
    };

    const handleFinalizeConceptUpdates = async () => {
        const videosToUpdatePayload = impactedVideos.filter(v => v.status === 'accepted').map(v => ({
            videoId: v.videoId,
            newConcept: v.newConceptSuggestion !== null ? v.newConceptSuggestion : v.currentConcept, // Ensure we send *a* concept, even if it's the old one
            resetScriptingTask: v.status === 'script_complete' && v.newConceptSuggestion !== v.currentConcept // Only reset if script was complete AND concept actually changed
        }));
        
        await onSaveAndSuggestConcepts(localLocations, localFootageInventory, videosToUpdatePayload);
    };

    const allVideosReviewed = useMemo(() => {
        return impactedVideos.every(video => video.status === 'accepted');
    }, [impactedVideos]);


    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4">
            <div className="glass-card rounded-lg p-8 w-full h-full flex flex-col relative">
                <button onClick={onClose} className="absolute top-4 right-6 text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
                
                {currentModalStage === 'inventoryEdit' && (
                    <>
                        <h2 className="text-2xl font-bold mb-6">Manage Footage Inventory</h2>
                        <p className="text-gray-400 mb-6">Review and update the footage you have for each location in your project. Changes here might affect your video concepts.</p>
                        
                        <div className="flex-grow overflow-y-auto pr-2 space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Project Locations</label>
                                {googleMapsLoaded 
                                    ? <window.LocationSearchInput onLocationsChange={handleLocationsUpdate} existingLocations={localLocations} /> 
                                    : <window.MockLocationSearchInput />
                                }
                            </div>
                            {localLocations.length > 0 && (
                                <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Find Points of Interest in {localLocations[0]?.name}</label>
                                    <button onClick={handleFindPointsOfInterest} disabled={isFindingPois} className="w-full px-5 py-2.5 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold disabled:opacity-75 flex items-center justify-center gap-2">
                                        {isFindingPois ? <window.LoadingSpinner isButton={true} /> : `📍 Find Attractions in ${localLocations[0]?.name}`}
                                    </button>
                                    {poiError && <p className="text-red-400 mt-2 text-sm">{poiError}</p>}
                                    {aiLocationSuggestions.length > 0 && (
                                        <div className="mt-4 pt-4 border-t border-gray-700/50">
                                            <h4 className="text-sm font-semibold text-gray-300 mb-2">AI Suggestions:</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {aiLocationSuggestions.map(name => (
                                                    <button
                                                        key={name}
                                                        onClick={() => handleSelectAiLocation(name)}
                                                        className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 rounded-full font-medium"
                                                    >
                                                        + {name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {localLocations.length > 0 && (
                                <div className="glass-card p-4 rounded-lg">
                                    <h3 className="text-xl font-semibold mb-4">Footage Inventory Details</h3>
                                    <div className="max-h-80 overflow-y-auto pr-2">
                                        <table className="w-full text-left table-fixed"> {/* Added table-fixed */}
                                            <thead className="bg-gray-800/50 sticky top-0 backdrop-blur-sm">
                                                <tr>
                                                    <th className="p-3 text-sm font-semibold w-[40%]">Location</th> {/* Adjusted width: 40% */}
                                                    <th className="p-3 text-sm font-semibold text-center w-[10%]">B-Roll</th> {/* Adjusted width: 10% */}
                                                    <th className="p-3 text-sm font-semibold text-center w-[10%]">On-Cam</th> {/* Adjusted width: 10% */}
                                                    <th className="p-3 text-sm font-semibold text-center w-[10%]">Drone</th> {/* Adjusted width: 10% */}
                                                    <th className="p-3 text-sm font-semibold w-[30%]">Importance</th> {/* Adjusted width: 30% */}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {localLocations.map(loc => {
                                                    const inventory = localFootageInventory[loc.place_id] || {};
                                                    return (
                                                        <tr key={loc.place_id} className="border-b border-gray-700">
                                                            <td className="p-3 font-semibold text-primary-accent truncate">{loc.name}</td> {/* Added truncate */}
                                                            <td className="p-3 text-center">
                                                                <input 
                                                                    type="checkbox" 
                                                                    checked={inventory.bRoll || false} 
                                                                    onChange={(e) => handleInventoryChange(loc.place_id, 'bRoll', e.target.checked)} 
                                                                    className="h-5 w-5 rounded bg-gray-900 border-gray-600 text-primary-accent focus:ring-primary-accent appearance-none checked:bg-primary-accent checked:border-transparent cursor-pointer" // Added cursor-pointer
                                                                />
                                                            </td>
                                                            <td className="p-3 text-center">
                                                                <input 
                                                                    type="checkbox" 
                                                                    checked={inventory.onCamera || false} 
                                                                    onChange={(e) => handleInventoryChange(loc.place_id, 'onCamera', e.target.checked)} 
                                                                    className="h-5 w-5 rounded bg-gray-900 border-gray-600 text-primary-accent focus:ring-primary-accent appearance-none checked:bg-primary-accent checked:border-transparent cursor-pointer" // Added cursor-pointer
                                                                />
                                                            </td>
                                                            <td className="p-3 text-center">
                                                                <input 
                                                                    type="checkbox" 
                                                                    checked={inventory.drone || false} 
                                                                    onChange={(e) => handleInventoryChange(loc.place_id, 'drone', e.target.checked)} 
                                                                    className="h-5 w-5 rounded bg-gray-900 border-gray-600 text-primary-accent focus:ring-primary-accent appearance-none checked:bg-primary-accent checked:border-transparent cursor-pointer" // Added cursor-pointer
                                                                />
                                                            </td>
                                                            <td className="p-3">
                                                                {/* Replaced radio buttons with toggle buttons */}
                                                                <div className="flex gap-1 justify-center"> {/* Added justify-center for centering */}
                                                                    <button 
                                                                        onClick={() => handleInventoryChange(loc.place_id, 'importance', 'major')} 
                                                                        className={`flex-1 text-xs px-2 py-1 rounded-md transition-colors font-semibold 
                                                                                    ${inventory.importance === 'major' ? 'bg-green-600 text-white' : 'bg-gray-600 hover:bg-gray-500 text-white'}`}
                                                                    >
                                                                        Major
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => handleInventoryChange(loc.place_id, 'importance', 'quick')} 
                                                                        className={`flex-1 text-xs px-2 py-1 rounded-md transition-colors font-semibold 
                                                                                    ${inventory.importance === 'quick' ? 'bg-amber-600 text-white' : 'bg-gray-600 hover:bg-gray-500 text-white'}`}
                                                                    >
                                                                        Quick Stop
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex-shrink-0 pt-6 mt-6 border-t border-gray-700 text-right">
                            <button onClick={handleSaveInventory} className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold">
                                Save Changes & Review Concepts
                            </button>
                        </div>
                    </>
                )}

                {currentModalStage === 'conceptReview' && (
                    <>
                        <h2 className="text-2xl font-bold mb-4 text-amber-400">Review Video Concepts</h2>
                        <p className="text-gray-400 mb-6">Footage inventory changes might impact the following video concepts. Please review and decide whether to regenerate or keep the current plan.</p>

                        <div className="flex-grow overflow-y-auto pr-2 space-y-6">
                            {impactedVideos.length > 0 ? (
                                impactedVideos.map((video, index) => (
                                    <div key={video.videoId} className={`p-4 rounded-lg border ${video.newConceptSuggestion ? 'border-green-500 bg-green-900/20' : 'border-amber-500 bg-amber-900/20'} ${video.status === 'accepted' ? 'opacity-70' : ''}`}>
                                        <h3 className="font-bold text-lg text-white mb-2">{video.videoTitle}</h3>
                                        {video.status === 'script_complete' && (
                                            <p className="text-sm text-red-400 mb-3">⚠️ Warning: Scripting for this video is marked as COMPLETE. Regenerating the concept will make the current script outdated. You will need to manually update the script later.</p>
                                        )}
                                        
                                        <label className="block text-sm font-medium text-gray-300 mb-1">Current Concept:</label>
                                        <textarea readOnly value={video.currentConcept} rows="4" className="w-full form-textarea bg-gray-800/80 cursor-not-allowed mb-3"></textarea>

                                        {video.newConceptSuggestion && (
                                            <>
                                                <label className="block text-sm font-medium text-green-300 mb-1">AI Suggested Concept:</label>
                                                <textarea readOnly value={video.newConceptSuggestion} rows="4" className="w-full form-textarea bg-gray-800/80 cursor-not-allowed mb-3"></textarea>
                                            </>
                                        )}

                                        <div className="flex flex-wrap gap-2 mt-2">
                                            <button 
                                                onClick={() => handleGenerateConcept(index)} 
                                                disabled={isGeneratingConcept[video.videoId] || video.status === 'accepted'}
                                                className="px-4 py-2 text-sm bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold disabled:opacity-75 flex items-center justify-center gap-2"
                                            >
                                                {isGeneratingConcept[video.videoId] ? <window.LoadingSpinner isButton={true} /> : '✨ Regenerate Concept'}
                                            </button>
                                            <button 
                                                onClick={() => handleAcceptNewConcept(index, video.newConceptSuggestion || video.currentConcept)} 
                                                disabled={!video.newConceptSuggestion || video.status === 'accepted'}
                                                className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 rounded-lg font-semibold disabled:opacity-75"
                                            >
                                                Accept AI Concept
                                            </button>
                                            <button 
                                                onClick={() => handleKeepOldConcept(index)} 
                                                disabled={video.status === 'accepted'}
                                                className="px-4 py-2 text-sm bg-secondary-accent hover:bg-secondary-accent-darker rounded-lg font-semibold disabled:opacity-75"
                                            >
                                                Keep Current Concept
                                            </button>
                                        </div>
                                        {conceptErrors[video.videoId] && <p className="text-red-400 mt-2 text-sm">{conceptErrors[video.videoId]}</p>}
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-400 text-center py-4 italic">No videos impacted by inventory changes.</p>
                            )}
                        </div>

                        <div className="flex-shrink-0 pt-6 mt-6 border-t border-gray-700 text-right">
                            <button 
                                onClick={handleFinalizeConceptUpdates} 
                                disabled={!allVideosReviewed}
                                className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold disabled:opacity-75"
                            >
                                Finalize & Close
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
