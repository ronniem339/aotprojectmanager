// creators-hub/js/components/ProjectView/EditProjectModal.js

const { useState, useEffect, useCallback } = React;

window.EditProjectModal = ({ project, videos, userId, settings, onClose, googleMapsLoaded, firebaseAppInstance, db }) => {
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

    const appId = window.CREATOR_HUB_CONFIG.APP_ID;
    const projectDocRef = db.collection(`artifacts/${appId}/users/${userId}/projects`).doc(project.id);
    const storage = firebaseAppInstance ? firebaseAppInstance.storage() : null;

    useEffect(() => {
        setFootageInventory(prevInventory => {
            const newInventory = {};
            locations.forEach(loc => {
                newInventory[loc.name] = prevInventory[loc.name] || {
                    name: loc.name,
                    bRoll: false,
                    onCamera: false,
                    drone: false,
                    stopType: 'quick' // Default to 'quick'
                };
            });
            return newInventory;
        });
    }, [locations]);

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

    const handleLocationsUpdate = useCallback((newLocations) => {
        setLocations(newLocations);
    }, []);

    const handleInventoryChange = (locationName, field, value) => {
        setFootageInventory(prev => {
            const currentLoc = prev[locationName] || { name: locationName };
            return {
                ...prev,
                [locationName]: {
                    ...currentLoc,
                    [field]: value,
                }
            };
        });
    };
    
    const handleSelectAllFootage = (type, isChecked) => {
        const newInventory = { ...footageInventory };
        locations.forEach(loc => {
            newInventory[loc.name] = { ...(newInventory[loc.name] || { name: loc.name }), [type]: isChecked };
        });
        setFootageInventory(newInventory);
    };


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
        try {
            await projectDocRef.update({
                playlistTitle: title,
                playlistDescription: description,
                locations: locations,
                coverImageUrl: finalCoverImageUrl,
                targeted_keywords: targetedKeywords,
                footageInventory: footageInventory
            });
            onClose();
        } catch (error) {
            console.error("Error saving project details:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleRefine = async (type) => {
        setGenerating(type);
        const apiKey = settings.geminiApiKey || "";
        const videoSummary = videos.map(v => `- Video Title: "${v.title}", Concept: "${v.concept}"`).join('\n');
        const styleGuide = settings.styleGuideText || 'The user has not provided a style guide.';
        let prompt = '';
        if (type === 'title') {
            prompt = `A user is creating a YouTube series. Based on the individual video concepts and the user's style guide below, refine the overall series title.

Current Series Title: "${title}"
User's Refinement Instruction: "${refinement}"
Creator's Style Guide:
---
${styleGuide}
---
Video Concepts in this Series:
---
${videoSummary}
---
Generate 3 NEW, creative, and SEO-friendly title suggestions for the series that reflect the video content AND the creator's style guide. Return as a JSON object like: {"suggestions": ["title1", "title2", "title3"]}`;
        } else {
            prompt = `A user is creating a YouTube series. Based on the individual video concepts and the user's style guide below, rewrite the overall series description.

Current Series Description: "${description}"
User's Refinement Instruction: "${refinement}"
Creator's Style Guide:
---
${styleGuide}
---
Video Concepts in this Series:
---
${videoSummary}
---
Rewrite the playlist description to incorporate the user's feedback, accurately summarize the videos, and match the creator's style guide. Keep it SEO-optimized. Return as a JSON object like: {"suggestion": "new description..."}`;
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
            } else if (type === 'description' && parsedJson.suggestion) {
                setDescription(parsedJson.suggestion);
            }
        } catch (error) {
            console.error(`Error refining ${type}:`, error);
        } finally {
            setGenerating(false);
            setRefinement('');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4">
            <div className="glass-card rounded-lg p-6 md:p-8 w-full max-w-5xl relative">
                <button onClick={onClose} className="absolute top-4 right-6 text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
                <h2 className="text-2xl font-bold mb-6">Edit Project Details</h2>
                
                <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-4 custom-scrollbar">
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
                            ? <window.LocationSearchInput onLocationsChange={handleLocationsUpdate} existingLocations={locations} /> 
                            : <window.MockLocationSearchInput />
                        }
                    </div>

                    {/* --- UI OVERHAUL: Footage Inventory Grid --- */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Footage Inventory</label>
                        <div className="bg-gray-900/50 rounded-lg border border-gray-700">
                             <div className="grid grid-cols-6 text-xs font-semibold text-gray-400 border-b border-gray-700 px-4 py-2">
                                <div className="col-span-2">Location</div>
                                <div>Stop Type</div>
                                <div className="text-center">
                                    B-Roll
                                    <input type="checkbox" onChange={(e) => handleSelectAllFootage('bRoll', e.target.checked)} className="ml-2 h-4 w-4 rounded bg-gray-900 border-gray-600 text-primary-accent focus:ring-primary-accent align-middle"/>
                                </div>
                                <div className="text-center">
                                    On-Camera
                                     <input type="checkbox" onChange={(e) => handleSelectAllFootage('onCamera', e.target.checked)} className="ml-2 h-4 w-4 rounded bg-gray-900 border-gray-600 text-primary-accent focus:ring-primary-accent align-middle"/>
                                </div>
                                <div className="text-center">
                                    Drone
                                    <input type="checkbox" onChange={(e) => handleSelectAllFootage('drone', e.target.checked)} className="ml-2 h-4 w-4 rounded bg-gray-900 border-gray-600 text-primary-accent focus:ring-primary-accent align-middle"/>
                                </div>
                            </div>
                            <div className="max-h-56 overflow-y-auto custom-scrollbar">
                                {locations.length > 0 ? (
                                    locations.map(location => {
                                        const inventory = footageInventory[location.name] || {};
                                        return (
                                            <div key={location.place_id || location.name} className="grid grid-cols-6 items-center px-4 py-3 border-b border-gray-800 last:border-b-0">
                                                <div className="col-span-2 pr-2">
                                                    <p className="font-semibold text-gray-200 truncate" title={location.name}>{location.name}</p>
                                                </div>
                                                <div className="flex gap-1">
                                                     <button onClick={() => handleInventoryChange(location.name, 'stopType', 'major')} className={`flex-1 text-xs px-2 py-1.5 rounded-md transition-colors ${inventory.stopType === 'major' ? 'bg-green-600 text-white' : 'bg-gray-600 hover:bg-gray-500'}`}>Major</button>
                                                     <button onClick={() => handleInventoryChange(location.name, 'stopType', 'quick')} className={`flex-1 text-xs px-2 py-1.5 rounded-md transition-colors ${inventory.stopType === 'quick' ? 'bg-amber-600 text-white' : 'bg-gray-600 hover:bg-gray-500'}`}>Quick</button>
                                                </div>
                                                <div className="flex justify-center">
                                                    <input type="checkbox" checked={!!inventory.bRoll} onChange={(e) => handleInventoryChange(location.name, 'bRoll', e.target.checked)} className="form-checkbox-small"/>
                                                </div>
                                                <div className="flex justify-center">
                                                    <input type="checkbox" checked={!!inventory.onCamera} onChange={(e) => handleInventoryChange(location.name, 'onCamera', e.target.checked)} className="form-checkbox-small"/>
                                                </div>
                                                <div className="flex justify-center">
                                                    <input type="checkbox" checked={!!inventory.drone} onChange={(e) => handleInventoryChange(location.name, 'drone', e.target.checked)} className="form-checkbox-small"/>
                                                </div>
                                            </div>
                                        )
                                    })
                                ) : (
                                    <p className="text-gray-500 text-sm text-center p-4">Add locations to the project to manage their footage inventory.</p>
                                )}
                            </div>
                        </div>
                    </div>
                    {/* --- END OF UI OVERHAUL --- */}

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Project Keywords</label>
                        <div className="p-2 bg-gray-900/50 rounded-lg border border-gray-700">
                            <div className="flex flex-wrap gap-2 mb-2">
                                {(targetedKeywords || []).map(kw => (
                                    <div key={kw} className="flex items-center gap-2 px-2.5 py-1 text-xs bg-secondary-accent-darker-opacity text-secondary-accent-lighter-text rounded-full">
                                        <span>{kw}</span>
                                        <button onClick={() => handleKeywordRemove(kw)} className="text-secondary-accent-lighter-text hover:text-white font-bold leading-none">&times;</button>
                                    </div>
                                ))}
                            </div>
                            <input
                                type="text"
                                value={keywordInput}
                                onChange={(e) => setKeywordInput(e.target.value)}
                                onKeyDown={handleKeywordAdd}
                                className="w-full form-input bg-gray-800 border-gray-600"
                                placeholder="Type a keyword and press Enter..."
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Cover Image URL (e.g., from Unsplash)</label>
                        <input
                            type="url"
                            value={coverImageUrl}
                            onChange={(e) => setCoverImageUrl(e.target.value)}
                            className="w-full form-input"
                            placeholder="Paste image URL here (e.g., from Unsplash)"
                        />
                        {coverImageUrl && (
                            <div className="mt-2 text-center">
                                <window.ImageComponent src={coverImageUrl} alt="Project Cover Preview" className="max-w-full h-auto rounded-lg mx-auto" style={{ maxHeight: '150px', objectFit: 'cover' }} />
                            </div>
                        )}
                    </div>
                     <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                        <label className="block text-sm font-medium text-gray-300 mb-1">Project Thumbnail</label>
                        <p className="text-xs text-gray-400 mb-3">Use Canva to create the main thumbnail for your YouTube playlist.</p>
                        <a
                            href="https://www.canva.com/create/youtube-thumbnails/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold"
                        >
                            Create Project Thumbnail on Canva
                        </a>
                    </div>
                    <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                        <label className="block text-sm font-medium text-gray-300 mb-2">Refine with AI</label>
                        <button onClick={handleRegenerateFromVideos} className="w-full mb-4 px-4 py-2 text-sm bg-secondary-accent hover:bg-secondary-accent-darker rounded-lg font-semibold flex items-center justify-center gap-2">
                            🔄 Regenerate Locations & Keywords from Videos
                        </button>
                        <textarea value={refinement} onChange={(e) => setRefinement(e.target.value)} rows="2" className="w-full form-textarea" placeholder="e.g., 'Make the title more mysterious' or 'Add more about the history in the description'"/>
                        <div className="flex gap-4 mt-2">
                             <button onClick={() => handleRefine('title')} disabled={generating || !refinement} className="px-4 py-2 text-sm bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold disabled:bg-gray-500 flex items-center gap-2">{generating === 'title' ? <window.LoadingSpinner/> : 'Refine Title'}</button>
                             <button onClick={() => handleRefine('description')} disabled={generating || !refinement} className="px-4 py-2 text-sm bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold disabled:bg-gray-500 flex items-center gap-2">{generating === 'description' ? <window.LoadingSpinner/> : 'Refine Description'}</button>
                        </div>
                    </div>
                </div>

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
