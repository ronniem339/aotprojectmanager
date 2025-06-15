// js/components/ProjectView/EditVideoModal.js

const { useState, useCallback } = React; // Add React import for useState and useCallback

window.EditVideoModal = ({ video, userId, settings, project, onClose, googleMapsLoaded }) => {
    // Basic Details
    const [title, setTitle] = useState(video.chosenTitle || video.title);
    const [concept, setConcept] = useState(video.concept);
    
    // Locations & Keywords
    const [locationsFeatured, setLocationsFeatured] = useState(video.locations_featured ? video.locations_featured.map(name => project.locations.find(l => l.name === name) || { name, place_id: name }).filter(l => l.place_id !== name) : []);
    const [targetedKeywords, setTargetedKeywords] = useState(video.targeted_keywords || []);
    const [keywordInput, setKeywordInput] = useState('');

    // AI & UI State
    const [refinement, setRefinement] = useState('');
    const [generating, setGenerating] = useState(false);
    const [showConfirmComplete, setShowConfirmComplete] = useState(false);
    
    const appId = window.CREATOR_HUB_CONFIG.APP_ID;
    const videoDocRef = db.collection(`artifacts/${appId}/users/${userId}/projects/${project.id}/videos`).doc(video.id);

    const handleLocationsUpdate = useCallback((newLocations) => {
        setLocationsFeatured(newLocations);
    }, []);

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

    const handleSave = async () => {
        const projectDocRef = db.collection(`artifacts/${appId}/users/${userId}/projects`).doc(project.id);
        const existingProjectLocations = project.locations || [];
        const newLocationsForProject = [...existingProjectLocations];
        
        locationsFeatured.forEach(featuredLoc => {
            if (!existingProjectLocations.some(projLoc => projLoc.place_id === featuredLoc.place_id)) {
                newLocationsForProject.push(featuredLoc);
            }
        });

        if (newLocationsForProject.length > existingProjectLocations.length) {
            await projectDocRef.update({ locations: newLocationsForProject });
        }
        
        await videoDocRef.update({
            chosenTitle: title,
            concept: concept,
            locations_featured: locationsFeatured.map(l => l.name),
            targeted_keywords: targetedKeywords
        });
        onClose();
    };

    const handleMarkAllComplete = async () => {
        const completedTasks = {};
        window.TASK_PIPELINE.forEach(task => { // Use window.TASK_PIPELINE
            completedTasks[task.id] = 'complete';
        });
        await videoDocRef.update({ tasks: completedTasks });
        onClose();
    };
    
    const handleRefine = async (type) => {
        setGenerating(type);
        const apiKey = settings.geminiApiKey || "";
        let prompt = '';
        if (type === 'title') {
            prompt = `The user is creating a YouTube video. The current title is "${title}" and the concept is "${concept}". Their refinement instruction is: "${refinement}". Generate 3 NEW, creative title suggestions. Return as a JSON object like: {"suggestions": ["title1", "title2", "title3"]}`;
        } else {
            prompt = `The user is creating a YouTube video. The current title is "${title}" and the concept is "${concept}". Their refinement instruction is: "${refinement}". Rewrite the video concept to incorporate the feedback. Return as a JSON object like: {"suggestion": "new concept..."}`;
        }

        try {
            const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } };
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
            const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!response.ok) throw new Error(await response.text());
            const result = await response.json();
            const parsedJson = JSON.parse(result.candidates[0].content.parts[0].text);
            if (type === 'title' && parsedJson.suggestions) {
                setTitle(parsedJson.suggestions[0]);
            } else if (type === 'concept' && parsedJson.suggestion) {
                setConcept(parsedJson.suggestion);
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
            <div className="glass-card rounded-lg p-8 w-full max-w-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-6 text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
                <h2 className="text-2xl font-bold mb-6">Edit Video Details</h2>
                
                <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Video Title</label>
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full form-input" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Video Concept</label>
                        <textarea value={concept} onChange={(e) => setConcept(e.target.value)} rows="4" className="w-full form-textarea" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Locations Featured</label>
                         <div className="p-3 bg-gray-900/50 rounded-lg border border-gray-700">
                             {googleMapsLoaded 
                                ? <window.LocationSearchInput onLocationsChange={handleLocationsUpdate} existingLocations={locationsFeatured} /> 
                                : <window.MockLocationSearchInput />
                            }
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Targeted Keywords</label>
                        <div className="p-2 bg-gray-900/50 rounded-lg border border-gray-700">
                            <div className="flex flex-wrap gap-2 mb-2">
                                {targetedKeywords.map(kw => (
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

                     <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                        <label className="block text-sm font-medium text-gray-300 mb-2">Refine with AI</label>
                        <textarea value={refinement} onChange={(e) => setRefinement(e.target.value)} rows="2" className="w-full form-textarea" placeholder="e.g., 'Make the title catchier' or 'Focus the concept on the hiking aspect'"/>
                        <div className="flex gap-4 mt-2">
                             <button onClick={() => handleRefine('title')} disabled={generating || !refinement} className="px-4 py-2 text-sm bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold disabled:bg-gray-500 flex items-center gap-2">{generating === 'title' ? <window.LoadingSpinner/> : 'Refine Title'}</button>
                             <button onClick={() => handleRefine('concept')} disabled={generating || !refinement} className="px-4 py-2 text-sm bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold disabled:bg-gray-500 flex items-center gap-2">{generating === 'concept' ? <window.LoadingSpinner/> : 'Refine Concept'}</button>
                        </div>
                    </div>
                    
                    <div className="p-4 bg-amber-900/30 rounded-lg border border-amber-700">
                        <label className="block text-sm font-medium text-amber-300 mb-2">Fast-Forward</label>
                         <p className="text-xs text-amber-300/80 mb-3">If this video is already published, you can mark all production tasks as complete.</p>
                        {showConfirmComplete ? (
                            <div className="flex items-center gap-4">
                                <p className="text-sm font-semibold text-white">Are you sure?</p>
                                <button onClick={handleMarkAllComplete} className="px-4 py-1 text-sm bg-red-600 hover:bg-red-700 rounded-lg">Yes, Confirm</button>
                                <button onClick={() => setShowConfirmComplete(false)} className="px-4 py-1 text-sm bg-gray-600 hover:bg-gray-500 rounded-lg">Cancel</button>
                            </div>
                        ) : (
                             <button onClick={() => setShowConfirmComplete(true)} className="px-4 py-2 text-sm bg-amber-600 hover:bg-amber-700 rounded-lg font-semibold">Mark All Tasks Complete</button>
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-700">
                    <button onClick={onClose} className="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold">Cancel</button>
                    <button onClick={handleSave} className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold">Save Changes</button>
                </div>
            </div>
        </div>
    );
};
