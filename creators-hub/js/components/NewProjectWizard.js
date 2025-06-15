// js/components/NewProjectWizard.js

window.ConfirmationModal = ({ onConfirm, onCancel }) => (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
        <div className="glass-card rounded-lg p-8 w-full max-w-md text-center">
            <h3 className="text-2xl font-bold mb-4">Are you sure?</h3>
            <p className="text-gray-300 mb-6">Starting over will permanently delete your current draft for this new project. This cannot be undone.</p>
            <div className="flex justify-center gap-4">
                <button onClick={onCancel} className="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold">Cancel</button>
                <button onClick={onConfirm} className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-semibold">Yes, Start Over</button>
            </div>
        </div>
    </div>
);


window.NewProjectWizard = ({ userId, settings, onClose, googleMapsLoaded, initialDraft }) => {
    // Shared state for the entire wizard
    const [step, setStep] = useState(initialDraft?.step || 1);
    const [inputs, setInputs] = useState(initialDraft?.inputs || { location: '', theme: '' });
    const [locations, setLocations] = useState(initialDraft?.locations || []);
    const [footageInventory, setFootageInventory] = useState(initialDraft?.footageInventory || {});
    
    // State for keyword research
    const [keywordIdeas, setKeywordIdeas] = useState(initialDraft?.keywordIdeas || []);
    const [selectedKeywords, setSelectedKeywords] = useState(initialDraft?.selectedKeywords || []);

    // State for the generated plan and its individual parts
    const [editableOutline, setEditableOutline] = useState(initialDraft?.editableOutline || null);
    const [finalizedTitle, setFinalizedTitle] = useState(initialDraft?.finalizedTitle || null);
    const [finalizedDescription, setFinalizedDescription] = useState(initialDraft?.finalizedDescription || null);
    const [selectedTitle, setSelectedTitle] = useState(initialDraft?.selectedTitle || '');

    // New state for cover image URL in NewProjectWizard
    const [coverImageUrl, setCoverImageUrl] = useState(initialDraft?.coverImageUrl || '');

    // State for refinement inputs
    const [refinement, setRefinement] = useState('');
    const [refiningVideoIndex, setRefiningVideoIndex] = useState(null);
    
    // UI state
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    
    const appId = window.CREATOR_HUB_CONFIG.APP_ID;
    // Persist state to Firestore to allow resuming
    const debouncedState = window.useDebounce({ step, inputs, locations, footageInventory, keywordIdeas, selectedKeywords, editableOutline, finalizedTitle, finalizedDescription, selectedTitle, coverImageUrl }, 1000);

    useEffect(() => {
        // Set the selected title to the first suggestion when the outline is first loaded.
        if (editableOutline && editableOutline.playlistTitleSuggestions && !selectedTitle) {
            setSelectedTitle(editableOutline.playlistTitleSuggestions[0]);
        }
    }, [editableOutline]);


    useEffect(() => {
        if (userId) {
            const draftRef = db.collection(`artifacts/${appId}/users/${userId}/wizards`).doc('newProjectDraft');
            draftRef.set(debouncedState, { merge: true });
        }
    }, [debouncedState, userId]);

    const handleStartOver = async () => {
        const draftRef = db.collection(`artifacts/${appId}/users/${userId}/wizards`).doc('newProjectDraft');
        await draftRef.delete();
        setStep(1);
        setInputs({ location: '', theme: '' });
        setLocations([]);
        setFootageInventory({});
        setKeywordIdeas([]);
        setSelectedKeywords([]);
        setEditableOutline(null);
        setFinalizedTitle(null);
        setFinalizedDescription(null);
        setSelectedTitle('');
        setCoverImageUrl(''); // Reset cover image URL
        setError('');
        setShowConfirmModal(false);
    };
    
    const handleLocationsUpdate = useCallback((newLocations) => {
        setLocations(newLocations);
        setInputs(prev => ({ ...prev, location: newLocations[0]?.name || '' }));

        const newInventory = {};
        newLocations.forEach(loc => {
            newInventory[loc.place_id] = footageInventory[loc.place_id] || { 
                bRoll: false, onCamera: false, drone: false, importance: loc.importance 
            };
        });
        setFootageInventory(newInventory);
    }, [footageInventory]);
    
    const handleInventoryChange = (placeId, field, value) => {
        setFootageInventory(prev => ({ ...prev, [placeId]: { ...prev[placeId], [field]: value } }));
    };
    
    const handleKeywordSelection = (keyword) => {
        setSelectedKeywords(prev => 
            prev.includes(keyword) ? prev.filter(k => k !== keyword) : [...prev, keyword]
        );
    };

    const handleSelectAllFootage = (type, isChecked) => {
        const newInventory = { ...footageInventory };
        locations.slice(1).forEach(loc => {
            if (!newInventory[loc.place_id]) {
                newInventory[loc.place_id] = { bRoll: false, onCamera: false, drone: false, importance: 'major' };
            }
            newInventory[loc.place_id][type] = isChecked;
        });
        setFootageInventory(newInventory);
    };
    
    // --- AI Interaction Functions ---
    const callGeminiAPI = async (prompt) => {
        const apiKey = settings.geminiApiKey || "";
        if (!apiKey) {
            setError("Please set your Gemini API Key in the settings first.");
            throw new Error("API Key not set");
        }
        const payload = {
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
        };
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
        const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err?.error?.message || 'API Error');
        }
        const result = await response.json();
        return JSON.parse(result.candidates[0].content.parts[0].text);
    };
    
    const handleGenerateKeywords = async () => {
        if (keywordIdeas.length > 0) { 
            setStep(3);
            return;
        }
        setIsLoading(true); setError('');
        
        const subLocationNames = locations.slice(1).map(l => l.name).join(', ');
        const prompt = `Act as a YouTube SEO expert and keyword research tool. The user is planning a video series about "${inputs.location}" with the theme "${inputs.theme}".
The series will feature these specific locations: ${subLocationNames}.
Generate a list of 50 potential search terms related to the main location, the sub-locations, and the overall theme. Provide a mix of:
- Short-tail keywords (e.g., "Scotland travel")
- Long-tail keywords (e.g., "best castles to visit in Scottish Highlands")
- Question-based keywords (e.g., "what to pack for a trip to Scotland")
Return the list as a JSON object like: {"keywords": ["keyword one", "keyword two", ...]}`;

        try {
            const parsedJson = await callGeminiAPI(prompt);
             if (parsedJson && Array.isArray(parsedJson.keywords)) {
                setKeywordIdeas(parsedJson.keywords);
                setStep(3);
            } else {
                throw new Error("AI returned an invalid keyword format.");
            }
        } catch (e) {
            setError(`Failed to generate keywords: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    };


    const handleGenerateInitialOutline = async () => {
        setIsLoading(true); setError('');
        
        const inventorySummary = locations.slice(1).map(loc => {
            const inventory = footageInventory[loc.place_id] || {};
            const types = [];
            if (inventory.bRoll) types.push("B-Roll");
            if (inventory.onCamera) types.push("On-camera segments");
            if (inventory.drone) types.push("Drone footage");
            const importanceLabel = inventory.importance === 'major' ? 'Major Feature' : 'Quick Section';
            return `- ${loc.name} (Role: ${importanceLabel}): Has ${types.join(', ')}.`;
        }).join('\n');
        
        const knowledgeBase = settings.youtubeSeoKnowledgeBase || window.CREATOR_HUB_CONFIG.YOUTUBE_SEO_KNOWLEDGE_BASE;
        const styleGuide = settings.styleGuideText ? `This is the user's personal style guide:\n${settings.styleGuideText}` : "No specific style guide was provided.";
        
        const prompt = `You are a professional YouTube producer creating a project plan about "${inputs.location}" with the theme "${inputs.theme}".
Context:
1.  YouTube SEO Knowledge Base: ${knowledgeBase}
2.  User's Style Guide: ${styleGuide}
3.  User's Inventory: ${inventorySummary.length > 0 ? inventorySummary : "No specific sub-locations listed."}
4.  User's Targeted Keywords: ${selectedKeywords.join(', ')}

Your Task:
Generate a complete project plan as a JSON object.
-   **playlistTitleSuggestions**: Create 3 diverse, catchy titles for the whole series, inspired by the targeted keywords.
-   **playlistDescription**: Write a long-form (300-400 words) SEO-optimized description that naturally incorporates the targeted keywords. Prioritize the SEO knowledge base for structure, then infuse the user's style guide for tone.
-   **videos**: Propose a video series. For each video, provide a title, a concept, an 'estimatedLengthMinutes' (e.g., "8-10"), a 'locations_featured' array, and a 'targeted_keywords' array. The 'locations_featured' array MUST ONLY contain names from the provided list of points of interest. The 'targeted_keywords' array should contain the specific keywords from the user's selection that are most relevant to that video's concept.`;

        try {
            const parsedJson = await callGeminiAPI(prompt);
            if (parsedJson && Array.isArray(parsedJson.playlistTitleSuggestions) && parsedJson.playlistDescription && Array.isArray(parsedJson.videos)) {
                parsedJson.videos.forEach(video => video.status = 'pending');
                setEditableOutline(parsedJson);
                setStep(4);
            } else {
                throw new Error("AI returned an invalid or incomplete project plan. Please try again.");
            }
        } catch (e) {
            setError(`Failed to generate outline: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleRefineTitle = async () => {
         setIsLoading(true); setError('');
         const prompt = `The user is creating a YouTube series about "${inputs.location}" with the theme "${inputs.theme}".
Previous title suggestions were: ${editableOutline.playlistTitleSuggestions.join(', ')}.
The user provided this feedback: "${refinement}".
Generate 3 NEW, creative, and SEO-friendly title suggestions that incorporate this feedback. Return as a JSON object like: {"playlistTitleSuggestions": ["title1", "title2", "title3"]}`;
         try {
             const parsedJson = await callGeminiAPI(prompt);
             if (parsedJson && Array.isArray(parsedJson.playlistTitleSuggestions)) {
                setEditableOutline(prev => ({...prev, playlistTitleSuggestions: parsedJson.playlistTitleSuggestions}));
                setSelectedTitle(parsedJson.playlistTitleSuggestions[0]); 
                setRefinement('');
             } else {
                 throw new Error("AI failed to return valid title suggestions.");
             }
         } catch(e) {
              setError(`Failed to refine titles: ${e.message}`);
         } finally {
             setIsLoading(false);
         }
    };

    const handleRefineDescription = async () => {
         setIsLoading(true); setError('');
         const prompt = `The user is creating a YouTube series titled "${finalizedTitle}". The current playlist description is: "${editableOutline.playlistDescription}".
The user provided this feedback for refinement: "${refinement}".
Rewrite the playlist description to incorporate the feedback, ensuring it remains SEO-optimized (300-400 words) and aligns with the user's style guide if provided.
Style Guide: ${settings.styleGuideText || 'Not provided.'}
SEO Knowledge Base: ${settings.youtubeSeoKnowledgeBase || window.CREATOR_HUB_CONFIG.YOUTUBE_SEO_KNOWLEDGE_BASE}
Return as a JSON object like: {"playlistDescription": "new description..."}`;
         try {
             const parsedJson = await callGeminiAPI(prompt);
             if(parsedJson && parsedJson.playlistDescription) {
                setEditableOutline(prev => ({...prev, playlistDescription: parsedJson.playlistDescription}));
                setRefinement('');
             } else {
                 throw new Error("AI failed to return a valid description.");
             }
         } catch(e) {
              setError(`Failed to refine description: ${e.message}`);
         } finally {
             setIsLoading(false);
         }
    };

    const handleRefineVideo = async (videoIndex) => {
        setIsLoading(true); setError('');
        const videoToRefine = editableOutline.videos[videoIndex];
        const subLocationNames = locations.slice(1).map(l => l.name).join(', ');
        const prompt = `A user is planning a YouTube series titled "${finalizedTitle}". You previously suggested this video idea as part of the series:
Original Video Idea: ${JSON.stringify(videoToRefine)}
The user has provided this feedback to refine it: "${refinement}"
Please generate a NEW, updated JSON object for only this video, incorporating the feedback. The overall project context (locations, theme, etc.) remains the same.
The 'locations_featured' array MUST ONLY contain names from this list of available sub-locations: ${subLocationNames}.
The 'targeted_keywords' array should contain relevant keywords from this main list: ${selectedKeywords.join(', ')}.
Return a single JSON object with the same structure: {"title": "...", "concept": "...", "estimatedLengthMinutes": "...", "locations_featured": [...], "targeted_keywords": [...]}`;
        try {
            const parsedJson = await callGeminiAPI(prompt);
            if (parsedJson && parsedJson.title && parsedJson.concept) {
                const newVideos = [...editableOutline.videos];
                newVideos[videoIndex] = { ...parsedJson, status: 'pending' };
                setEditableOutline(prev => ({ ...prev, videos: newVideos }));
                setRefinement('');
                setRefiningVideoIndex(null);
            } else {
                throw new Error("AI returned an invalid video structure.");
            }
        } catch(e) {
            setError(`Failed to refine video: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleAcceptVideo = (videoIndex) => {
        const newVideos = [...editableOutline.videos];
        newVideos[videoIndex].status = 'accepted';
        setEditableOutline(prev => ({ ...prev, videos: newVideos }));
        if (refiningVideoIndex === videoIndex) {
            setRefiningVideoIndex(null);
        }
    };
    
    const handleAcceptAllVideos = () => {
        const newVideos = editableOutline.videos.map(video => ({ ...video, status: 'accepted' }));
        setEditableOutline(prev => ({ ...prev, videos: newVideos }));
    };


    const handleCreateProject = async () => {
        if (!finalizedTitle || !finalizedDescription || !editableOutline.videos) return;
        setIsLoading(true);
        setError('');
        try {
            const batch = db.batch();
            const projectRef = db.collection(`artifacts/${appId}/users/${userId}/projects`).doc();
            batch.set(projectRef, {
                playlistTitle: finalizedTitle,
                playlistDescription: finalizedDescription,
                locations: locations, // Save the full location objects
                coverImageUrl: coverImageUrl, // Save the user-selected cover image URL
                createdAt: new Date().toISOString()
            });

            editableOutline.videos.forEach((video) => {
                const videoRef = projectRef.collection('videos').doc();
                // Ensure all fields from the AI are included
                batch.set(videoRef, {
                    ...video,
                    chosenTitle: video.title,
                    script: '',
                    metadata: '',
                    blogPost: '',
                    shortsIdeas: '',
                    createdAt: new Date().toISOString()
                });
            });
            await batch.commit();
            const draftRef = db.collection(`artifacts/${appId}/users/${userId}/wizards`).doc('newProjectDraft');
            await draftRef.delete();
            onClose();
        } catch(e) { console.error("Error creating project:", e); setError(`Failed to save project. ${e.message}`);
        } finally { setIsLoading(false); }
    };
    
    // --- Wizard Step Rendering ---

    const wizardStep = () => {
        switch (step) {
            case 1: // Define Foundation
                return (
                    <div>
                        <h2 className="text-2xl font-bold mb-4">New Project Wizard: Step 1 of 6</h2>
                        <p className="text-gray-400 mb-6">Define the project's foundation. The first location you add will be the main subject. Add more for specific points of interest.</p>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Project Locations</label>
                                {googleMapsLoaded ? <window.LocationSearchInput onLocationsChange={handleLocationsUpdate} existingLocations={locations} /> : <window.MockLocationSearchInput />}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Key Message or Theme</label>
                                <textarea name="theme" value={inputs.theme} onChange={(e) => setInputs(p => ({ ...p, theme: e.target.value }))} placeholder="e.g., 'Exploring ancient castles and misty lochs'" rows="3" className="w-full form-textarea"></textarea>
                            </div>
                            {/* New field for Cover Image URL in Step 1 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Cover Image URL (Optional - for dashboard tile)</label>
                                <input 
                                    type="url" 
                                    value={coverImageUrl} 
                                    onChange={(e) => setCoverImageUrl(e.target.value)} 
                                    className="w-full form-input" 
                                    placeholder="Paste image URL here (e.g., from Unsplash)"
                                />
                                {coverImageUrl && (
                                    <div className="mt-2 text-center">
                                        <img src={coverImageUrl} alt="Project Cover Preview" className="max-w-full h-auto rounded-lg mx-auto" style={{ maxHeight: '100px', objectFit: 'cover' }} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            case 2: // Footage Inventory
                 const subLocations = locations.slice(1);
                 const isInventoryComplete = subLocations.every(loc => {
                     const inventory = footageInventory[loc.place_id] || {};
                     return inventory.bRoll || inventory.onCamera || inventory.drone;
                 });
                 return (
                    <div>
                        <h2 className="text-2xl font-bold mb-4">New Project Wizard: Step 2 of 6</h2>
                        <p className="text-gray-400 mb-6">Log your available footage for each spot you'll visit within <span className="font-bold text-primary-accent">{inputs.location || 'your main location'}</span>.</p>
                        <div className="max-h-[60vh] overflow-y-auto">
                           <table className="w-full text-left">
                               <thead className="bg-gray-800/50 sticky top-0 backdrop-blur-sm">
                                   <tr>
                                       <th className="p-3 text-sm font-semibold">Location</th>
                                       <th className="p-3 text-sm font-semibold text-center w-24">
                                            B-Roll
                                            <input type="checkbox" onChange={(e) => handleSelectAllFootage('bRoll', e.target.checked)} className="ml-2 h-4 w-4 rounded bg-gray-900 border-gray-600 text-primary-accent focus:ring-primary-accent align-middle"/>
                                       </th>
                                       <th className="p-3 text-sm font-semibold text-center w-28">
                                            On-Camera
                                            <input type="checkbox" onChange={(e) => handleSelectAllFootage('onCamera', e.target.checked)} className="ml-2 h-4 w-4 rounded bg-gray-900 border-gray-600 text-primary-accent focus:ring-primary-accent align-middle"/>
                                       </th>
                                       <th className="p-3 text-sm font-semibold text-center w-24">
                                            Drone
                                            <input type="checkbox" onChange={(e) => handleSelectAllFootage('drone', e.target.checked)} className="ml-2 h-4 w-4 rounded bg-gray-900 border-gray-600 text-primary-accent focus:ring-primary-accent align-middle"/>
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
                                               <td className="p-3 text-center"><input type="checkbox" checked={inventory.bRoll || false} onChange={(e) => handleInventoryChange(loc.place_id, 'bRoll', e.target.checked)} className="h-5 w-5 rounded bg-gray-900 border-gray-600 text-primary-accent focus:ring-primary-accent"/></td>
                                               <td className="p-3 text-center"><input type="checkbox" checked={inventory.onCamera || false} onChange={(e) => handleInventoryChange(loc.place_id, 'onCamera', e.target.checked)} className="h-5 w-5 rounded bg-gray-900 border-gray-600 text-primary-accent focus:ring-primary-accent"/></td>
                                               <td className="p-3 text-center"><input type="checkbox" checked={inventory.drone || false} onChange={(e) => handleInventoryChange(loc.place_id, 'drone', e.target.checked)} className="h-5 w-5 rounded bg-gray-900 border-gray-600 text-primary-accent focus:ring-primary-accent"/></td>
                                               <td className="p-3">
                                                    <div className="flex gap-1">
                                                        <button onClick={() => handleInventoryChange(loc.place_id, 'importance', 'major')} className={`flex-1 text-xs px-2 py-1.5 rounded-md transition-colors ${inventory.importance === 'major' ? 'bg-green-600 text-white' : 'bg-gray-600 hover:bg-gray-500'}`}>Major Feature</button>
                                                        <button onClick={() => handleInventoryChange(loc.place_id, 'importance', 'quick')} className={`flex-1 text-xs px-2 py-1.5 rounded-md transition-colors ${inventory.importance === 'quick' ? 'bg-amber-600 text-white' : 'bg-gray-600 hover:bg-gray-500'}`}>Quick Section</button>
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
                        {error && <p className="text-red-400 mt-4 bg-red-900/50 p-3 rounded-lg">{error}</p>}
                        {!isInventoryComplete && subLocations.length > 0 && <p className="text-amber-400 mt-4 text-sm">Please select at least one footage type for each location with an amber border to continue.</p>}
                    </div>
                 );
            case 3: // Keyword Strategy
                return (
                    <div>
                        <h2 className="text-2xl font-bold mb-4">New Project Wizard: Step 3 of 6 - Keyword Strategy</h2>
                        <p className="text-gray-400 mb-6">Here are some popular search terms related to your project. Select the ones you want the AI to focus on when building the plan.</p>
                        {isLoading && <window.LoadingSpinner text="Generating keyword ideas..." />}
                        <div className="p-4 bg-gray-900/50 border border-gray-700 rounded-lg max-h-[60vh] overflow-y-auto pr-2 flex flex-wrap gap-2">
                            {keywordIdeas.map((keyword, index) => (
                                <button
                                    key={`${keyword}-${index}`}
                                    onClick={() => handleKeywordSelection(keyword)}
                                    className={`px-3 py-1.5 text-sm rounded-full transition-colors ${selectedKeywords.includes(keyword) ? 'bg-primary-accent text-white' : 'bg-gray-700 hover:bg-gray-600'}`}
                                >
                                    {keyword}
                                </button>
                            ))}
                        </div>
                        {error && <p className="text-red-400 mt-4 bg-red-900/50 p-3 rounded-lg">{error}</p>}
                    </div>
                );
            case 4: // Refine Playlist Title
                return (
                    <div>
                        <h2 className="text-2xl font-bold mb-4">New Project Wizard: Step 4 of 6 - Refine Title</h2>
                        <p className="text-gray-400 mb-6">Choose the best title for your series, or ask for new ideas.</p>
                        {isLoading && <window.LoadingSpinner text="Thinking..." />}
                        {editableOutline?.playlistTitleSuggestions && (
                            <div className="space-y-3">
                                {editableOutline.playlistTitleSuggestions.map(title => (
                                    <label key={title} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${selectedTitle === title ? 'bg-primary-accent/[.50] border-primary-accent' : 'bg-gray-800/60 border-gray-700 hover:bg-gray-700/60'} border`}>
                                        <input type="radio" name="playlistTitle" value={title} checked={selectedTitle === title} onChange={(e) => setSelectedTitle(e.target.value)} className="h-4 w-4 bg-gray-900 border-gray-600 text-primary-accent focus:ring-primary-accent"/>
                                        <span>{title}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                         <div className="mt-6">
                            <label className="block text-sm font-medium text-gray-300 mb-1">Refinement Instructions</label>
                            <textarea value={refinement} onChange={(e) => setRefinement(e.target.value)} rows="2" className="w-full form-textarea" placeholder="e.g., 'Make them more mysterious', 'Add the year', 'Focus on the adventure aspect'"/>
                        </div>
                        {error && <p className="text-red-400 mt-4 bg-red-900/50 p-3 rounded-lg">{error}</p>}
                    </div>
                );
            case 5: // Refine Playlist Description
                 return (
                    <div>
                        <h2 className="text-2xl font-bold mb-4">New Project Wizard: Step 5 of 6 - Refine Description</h2>
                        <p className="text-gray-400 mb-6">Review the AI-generated description for your playlist. Refine it if needed.</p>
                        {isLoading && !editableOutline?.playlistDescription && <window.LoadingSpinner text="Generating..." />}
                        {editableOutline?.playlistDescription && (
                             <textarea value={isLoading ? 'Regenerating...' : editableOutline.playlistDescription} readOnly={isLoading} rows="10" className="w-full form-textarea leading-relaxed bg-gray-800/60"/>
                        )}
                        <div className="mt-6">
                            <label className="block text-sm font-medium text-gray-300 mb-1">Refinement Instructions</label>
                            <textarea value={refinement} onChange={(e) => setRefinement(e.target.value)} rows="2" className="w-full form-textarea" placeholder="e.g., 'Make it more personal', 'Mention the drone footage specifically'"/>
                        </div>
                        {error && <p className="text-red-400 mt-4 bg-red-900/50 p-3 rounded-lg">{error}</p>}
                    </div>
                 );
             case 6: // Review Video Plan
                return (
                    <div>
                        <h2 className="text-2xl font-bold mb-4">New Project Wizard: Step 6 of 6 - Review Video Plan</h2>
                        <p className="text-gray-400 mb-6">This is the overall plan for your video series. Review and accept each video idea to finalize the project.</p>
                        {isLoading && !editableOutline?.videos && <window.LoadingSpinner text="Generating..." />}
                        {editableOutline?.videos && (
                            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                               {editableOutline.videos.map((video, index) => (
                                    <div key={index} className={`p-4 bg-gray-800/60 rounded-lg border transition-all ${video.status === 'accepted' ? 'border-green-500' : 'border-gray-700'}`}>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-bold text-lg text-primary-accent">{`Video ${index + 1}: ${video.title}`}</h3>
                                                <p className="text-sm text-gray-400 mt-1 italic">Est. Length: {video.estimatedLengthMinutes} minutes</p>
                                            </div>
                                            {video.status === 'accepted' && <span className="text-green-400 font-bold text-sm flex items-center gap-2">✅ Accepted</span>}
                                        </div>
                                        <p className="text-sm mt-3">{video.concept}</p>
                                        <div className="mt-3 pt-3 border-t border-gray-700/50 space-y-3">
                                            {video.locations_featured && video.locations_featured.length > 0 && (
                                                <div>
                                                     <label className="block text-xs font-medium text-gray-400 mb-1">Locations Featured:</label>
                                                     <div className="flex flex-wrap gap-2">
                                                        {video.locations_featured.map(locName => (
                                                            <span key={locName} className="px-2 py-0.5 text-xs bg-secondary-accent-darker-opacity text-secondary-accent-lighter-text rounded-full">{locName}</span>
                                                        ))}
                                                     </div>
                                                </div>
                                            )}
                                            {video.targeted_keywords && video.targeted_keywords.length > 0 && (
                                                <div>
                                                     <label className="block text-xs font-medium text-gray-400 mb-1">Targeted Keywords:</label>
                                                     <div className="flex flex-wrap gap-2">
                                                        {video.targeted_keywords.map(keyword => (
                                                            <span key={keyword} className="px-2 py-0.5 text-xs bg-secondary-accent-darker-opacity text-secondary-accent-lighter-text rounded-full">{keyword}</span>
                                                        ))}
                                                     </div>
                                                </div>
                                            )}
                                        </div>
                                        {video.status === 'pending' && (
                                            <div className="mt-4 pt-4 border-t border-gray-700">
                                                {refiningVideoIndex === index ? (
                                                     <div>
                                                        <label className="block text-sm font-medium text-gray-300 mb-1">Refinement Instructions</label>
                                                        <textarea value={refinement} onChange={(e) => setRefinement(e.target.value)} rows="2" className="w-full form-textarea" placeholder="e.g., 'Focus more on the history of this place'"/>
                                                        <div className="flex justify-end gap-2 mt-2">
                                                            <button onClick={() => setRefiningVideoIndex(null)} className="text-xs px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded-md">Cancel</button>
                                                            <button onClick={() => handleRefineVideo(index)} disabled={!refinement || isLoading} className="text-xs px-3 py-1 bg-primary-accent hover:bg-primary-accent-darker rounded-md flex items-center gap-1">{isLoading ? <window.LoadingSpinner/> : 'Submit'}</button>
                                                        </div>
                                                     </div>
                                                ) : (
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={() => { setRefiningVideoIndex(index); setRefinement(''); }} className="text-sm px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded-md">Refine</button>
                                                        <button onClick={() => handleAcceptVideo(index)} className="text-sm px-3 py-1 bg-green-700 hover:bg-green-600 rounded-md">Accept</button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                        {error && <p className="text-red-400 mt-4 bg-red-900/50 p-3 rounded-lg">{error}</p>}
                    </div>
                );
        }
    }
    
    const renderActionButtons = () => {
        const subLocations = locations.slice(1);
        const isInventoryComplete = subLocations.length === 0 || subLocations.every(loc => {
            const inventory = footageInventory[loc.place_id] || {};
            return inventory.bRoll || inventory.onCamera || inventory.drone;
        });
        const allVideosAccepted = editableOutline?.videos.every(v => v.status === 'accepted');

        return (
            <div className="flex justify-between items-center w-full">
                <div>
                    {step > 1 && <button onClick={() => setShowConfirmModal(true)} className="px-4 py-2 bg-red-800/80 hover:bg-red-700 rounded-lg text-xs text-red-100">Start Over</button>}
                </div>
                <div className="flex items-center gap-4">
                     {step > 1 && <button onClick={() => setStep(s => s - 1)} disabled={isLoading} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg">Back</button>}
                     
                     {step === 1 && <button onClick={() => setStep(2)} disabled={locations.length === 0} className="px-4 py-2 bg-primary-accent hover:bg-primary-accent-darker rounded-lg disabled:bg-gray-500 disabled:cursor-not-allowed">Next</button>}
                     
                     {step === 2 && <button onClick={handleGenerateKeywords} disabled={isLoading || !isInventoryComplete} className="px-4 py-2 bg-primary-accent hover:bg-primary-accent-darker rounded-lg flex items-center gap-2 disabled:bg-gray-500 disabled:cursor-not-allowed">{isLoading ? <window.LoadingSpinner/> : '💡 Get Keyword Ideas'}</button>}
                     
                     {step === 3 && <button onClick={handleGenerateInitialOutline} disabled={isLoading || selectedKeywords.length === 0} className="px-4 py-2 bg-primary-accent hover:bg-primary-accent-darker rounded-lg flex items-center gap-2 disabled:bg-gray-500 disabled:cursor-not-allowed">{isLoading ? <window.LoadingSpinner/> : '🪄 Generate Project Plan'}</button>}
                     
                     {step === 4 && (
                        <>
                            <button onClick={handleRefineTitle} disabled={isLoading || !refinement} className="px-4 py-2 bg-primary-accent hover:bg-primary-accent-darker rounded-lg flex items-center gap-2 disabled:bg-gray-500">🔁 Refine</button>
                            <button onClick={() => { setFinalizedTitle(selectedTitle); setStep(5); setRefinement(''); setError(''); }} disabled={isLoading || !selectedTitle} className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg flex items-center gap-2">Accept & Continue ➡️</button>
                        </>
                     )}
                     
                     {step === 5 && (
                        <>
                            <button onClick={handleRefineDescription} disabled={isLoading || !refinement} className="px-4 py-2 bg-primary-accent hover:bg-primary-accent-darker rounded-lg flex items-center gap-2 disabled:bg-gray-500">🔁 Refine</button>
                            <button onClick={() => { setFinalizedDescription(editableOutline.playlistDescription); setStep(6); setRefinement(''); setError('');}} disabled={isLoading} className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg flex items-center gap-2">Accept & Continue ➡️</button>
                        </>
                     )}
                     
                     {step === 6 && (
                        <>
                             <button onClick={handleAcceptAllVideos} disabled={isLoading || allVideosAccepted} className="px-4 py-2 bg-secondary-accent hover:bg-secondary-accent-darker rounded-lg disabled:bg-gray-500 disabled:cursor-not-allowed">Accept All</button>
                             <button onClick={handleCreateProject} disabled={isLoading || !allVideosAccepted} className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg flex items-center gap-2 text-lg font-semibold disabled:bg-gray-500 disabled:cursor-not-allowed">{isLoading ? <window.LoadingSpinner text="Finalizing..."/> : '✅ Finish & Create Project'}</button>
                        </>
                     )}
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4">
            {showConfirmModal && <window.ConfirmationModal onConfirm={handleStartOver} onCancel={() => setShowConfirmModal(false)} />}
            <div className="glass-card rounded-lg p-8 w-full max-w-5xl flex flex-col">
                <div className="flex-shrink-0">
                    <button onClick={onClose} className="absolute top-4 right-6 text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
                </div>
                <div className="flex-grow overflow-y-auto">
                    {wizardStep()}
                </div>
                <div className="flex-shrink-0 pt-6 mt-6 border-t border-gray-700">
                    {renderActionButtons()}
                </div>
            </div>
        </div>
    );
};
