// js/components/NewProjectWizard.js

window.ConfirmationModal = ({ onConfirm, onCancel }) => (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-[60]">
        <div className="glass-card rounded-lg p-8 w-full max-w-md text-center">
            <h3 className="text-2xl font-bold mb-4">Are you sure?</h3>
            <p className="text-gray-300 mb-6">This action will permanently delete your current draft. This cannot be undone.</p>
            <div className="flex justify-center gap-4">
                <button onClick={onCancel} className="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold">Cancel</button>
                <button onClick={onConfirm} className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-semibold">Yes, Delete Draft</button>
            </div>
        </div>
    </div>
);

window.NewProjectWizard = ({ userId, settings, onClose, googleMapsLoaded, initialDraft, draftId, db, auth, firebaseAppInstance }) => {
    const { useState, useEffect, useCallback } = React;
    
    // Overall state for the entire wizard
    const [step, setStep] = useState(initialDraft?.step || 1);
    const [inputs, setInputs] = useState(initialDraft?.inputs || { location: '', theme: '' });
    const [locations, setLocations] = useState(initialDraft?.locations || []);
    const [footageInventory, setFootageInventory] = useState(initialDraft?.footageInventory || {});
    const [keywordIdeas, setKeywordIdeas] = useState(initialDraft?.keywordIdeas || []);
    const [selectedKeywords, setSelectedKeywords] = useState(initialDraft?.selectedKeywords || []);
    const [editableOutline, setEditableOutline] = useState(initialDraft?.editableOutline || null);
    const [finalizedTitle, setFinalizedTitle] = useState(initialDraft?.finalizedTitle || null);
    const [finalizedDescription, setFinalizedDescription] = useState(initialDraft?.finalizedDescription || null);
    const [selectedTitle, setSelectedTitle] = useState(initialDraft?.selectedTitle || '');
    const [coverImageUrl, setCoverImageUrl] = useState(initialDraft?.coverImageUrl || '');
    const [coverImageFile, setCoverImageFile] = useState(null); // New state for the uploaded file
    const [refinement, setRefinement] = useState('');
    const [planRefinement, setPlanRefinement] = useState(initialDraft?.planRefinement || ''); // New state for plan-level refinement
    const [refiningVideoIndex, setRefiningVideoIndex] = useState(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false); // General loading state for the wizard
    const [isGeneratingKeywords, setIsGeneratingKeywords] = useState(false); 
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    
    const appId = window.CREATOR_HUB_CONFIG.APP_ID;
    const debouncedState = window.useDebounce({ step, inputs, locations, footageInventory, keywordIdeas, selectedKeywords, editableOutline, finalizedTitle, finalizedDescription, selectedTitle, coverImageUrl, planRefinement }, 1000);

    // Initialize Firebase Storage
    const storage = firebaseAppInstance ? firebaseAppInstance.storage() : null;

    const downloadAndUploadImage = async (imageUrl, uploadPath) => {
        if (!imageUrl || !storage) {
            console.warn("No image URL or Firebase Storage instance available for upload.");
            return '';
        }
        const fetchUrl = `/.netlify/functions/fetch-image?url=${encodeURIComponent(imageUrl)}`;
        try {
            const response = await fetch(fetchUrl);
            if (!response.ok) {
                throw new Error(await response.text());
            }
            const blob = await response.blob();
            const storageRef = storage.ref(uploadPath);
            await storageRef.put(blob);
            return await storageRef.getDownloadURL();
        } catch (error) {
            console.error(`Error downloading or uploading image from ${imageUrl} to ${uploadPath}:`, error);
            return '';
        }
    };
    
    // New function to upload a file directly
    const uploadFile = async (file, uploadPath) => {
        if (!file || !storage) {
            console.warn("No file or Firebase Storage instance available for upload.");
            return '';
        }
        try {
            const storageRef = storage.ref(uploadPath);
            await storageRef.put(file);
            return await storageRef.getDownloadURL();
        } catch (error) {
            console.error(`Error uploading file to ${uploadPath}:`, error);
            return '';
        }
    };


    // Persist state to Firestore on change
    useEffect(() => {
        if (userId && draftId) {
            const draftRef = db.collection(`artifacts/${appId}/users/${userId}/wizards`).doc(draftId);
            draftRef.set({ ...debouncedState, updatedAt: new Date() }, { merge: true });
        }
    }, [debouncedState, userId, draftId, appId, db]);

    // Initialize selectedTitle when suggestions load
    useEffect(() => {
        if (editableOutline && editableOutline.playlistTitleSuggestions && !selectedTitle) {
            setSelectedTitle(editableOutline.playlistTitleSuggestions[0]);
        }
    }, [editableOutline, selectedTitle]);

    const handleClose = async () => {
        const isPristine = !inputs.location && !inputs.theme && (locations?.length || 0) === 0 && !coverImageUrl;
        if (isPristine && draftId) {
            await db.collection(`artifacts/${appId}/users/${userId}/wizards`).doc(draftId).delete().catch(console.error);
        }
        onClose();
    };

    const handleStartOver = async () => {
        if (draftId) {
            await db.collection(`artifacts/${appId}/users/${userId}/wizards`).doc(draftId).delete().catch(console.error);
        }
        setShowConfirmModal(false);
        onClose();
    };
    
    const handleLocationsUpdate = useCallback((newLocations) => {
        setLocations(newLocations);
        setInputs(prev => ({ ...prev, location: newLocations[0]?.name || '' }));
        const newInventory = { ...footageInventory };
        newLocations.forEach(loc => {
            if (!newInventory[loc.place_id]) {
                newInventory[loc.place_id] = { bRoll: false, onCamera: false, drone: false, importance: 'major' };
            }
        });
        setFootageInventory(newInventory);
    }, [footageInventory]);

    const handleInventoryChange = useCallback((place_id, type, value) => {
        setFootageInventory(prev => ({
            ...prev,
            [place_id]: { ...(prev[place_id] || {}), [type]: value }
        }));
    }, []);

    const handleSelectAllFootage = useCallback((type, isChecked) => {
        const newInventory = { ...footageInventory };
        locations.slice(1).forEach(loc => {
            newInventory[loc.place_id] = { ...(newInventory[loc.place_id] || {}), [type]: isChecked };
        });
        setFootageInventory(newInventory);
    }, [locations, footageInventory]);

    const handleKeywordSelection = (keyword) => {
        setSelectedKeywords(prevSelected => {
            if (prevSelected.includes(keyword)) {
                return prevSelected.filter(k => k !== keyword);
            } else {
                return [...prevSelected, keyword];
            }
        });
    };

    const handleGenerateKeywords = useCallback(async () => {
        if (keywordIdeas.length > 0) { setStep(3); return; }
        setIsGeneratingKeywords(true); 
        setError('');
        try {
            const keywords = await window.aiUtils.generateKeywordsAI({
                title: inputs.location, concept: inputs.theme, locationsFeatured: locations.slice(1).map(l => l.name),
                projectTitle: inputs.location, projectDescription: inputs.theme, settings
            });
            setKeywordIdeas(keywords);
            setStep(3);
        } catch (e) { setError(`Failed to generate keywords: ${e.message}`); } finally { 
            setIsGeneratingKeywords(false); 
        }
    }, [inputs, locations, settings, keywordIdeas]);
    
    const handleGenerateInitialOutline = useCallback(async () => {
        setIsLoading(true); setError('');
        const inventorySummary = locations.slice(1).map(loc => {
            const inv = footageInventory[loc.place_id] || {};
            const types = [inv.bRoll && "B-Roll", inv.onCamera && "On-camera", inv.drone && "Drone"].filter(Boolean).join(', ');
            return `- ${loc.name} (Role: ${inv.importance}): Has ${types || 'no specified footage'}.`;
        }).join('\n');
        
        const prompt = `You are a professional YouTube producer creating a project plan about "${inputs.location}" with the theme "${inputs.theme}".
Context:
- User Persona (Who Am I): ${settings.knowledgeBases?.youtube?.whoAmI || 'N/A'}
- User's Style Guide: ${settings.styleGuideText || 'N/A'}
- YouTube Video Title Guidelines: ${settings.knowledgeBases?.youtube?.videoTitles || 'Use catchy, SEO-friendly titles.'}
- YouTube Video Description Guidelines: ${settings.knowledgeBases?.youtube?.videoDescriptions || 'Write detailed and engaging descriptions.'}
- User's Inventory: ${inventorySummary || "No specific sub-locations listed."}
- User's Targeted Keywords: ${selectedKeywords.join(', ')}

Your Task:
Generate a complete project plan as a JSON object with keys:
"playlistTitleSuggestions" (array of 3 strings),
"playlistDescription" (string - a general, engaging, and brief overview for the entire YouTube playlist. This should be 2-3 sentences long and act as a teaser for the whole series. It should NOT include video-specific details, chapters, or timestamps. It is a placeholder to be refined later.),
"videos" (array of objects, each with:
    "title": string (the video's main title),
    "concept": string (a brief outline or high-level plan for the video's content, focusing on key segments and main takeaways, NOT a full script),
    "estimatedLengthMinutes": number,
    "locations_featured": array of strings,
    "targeted_keywords": array of strings
).`; 

        try {
            const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings);
            if (!parsedJson.playlistTitleSuggestions || !parsedJson.playlistDescription || !parsedJson.videos) throw new Error("AI returned an invalid plan.");
            parsedJson.videos.forEach(v => { v.status = 'pending'; v.tasks = {}; });
            setEditableOutline(parsedJson);
            setStep(4);
        } catch (e) { setError(`Failed to generate outline: ${e.message}`); } finally { setIsLoading(false); }
    }, [inputs, locations, footageInventory, selectedKeywords, settings]);
    
    const handleRefineTitle = useCallback(async () => {
        setIsLoading(true); setError('');
        const prompt = `Rewrite the YouTube series title "${selectedTitle}" based on this feedback: "${refinement}". Follow these guidelines: ${settings.knowledgeBases?.youtube?.videoTitles}. Return JSON: {"suggestions": ["new title 1", "new title 2", "new title 3"]}`;
        try {
            const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings);
            setEditableOutline(p => ({...p, playlistTitleSuggestions: parsedJson.suggestions}));
            setSelectedTitle(parsedJson.suggestions[0]);
            setRefinement('');
        } catch (e) { setError(`Failed to refine title: ${e.message}`); } finally { setIsLoading(false); }
    }, [selectedTitle, refinement, settings]);

    const handleRefineDescription = useCallback(async () => {
        setIsLoading(true); setError('');
        const prompt = `Rewrite this description: "${editableOutline.playlistDescription}" based on this feedback: "${refinement}". Follow these guidelines: ${settings.knowledgeBases?.youtube?.videoDescriptions}. Return JSON: {"playlistDescription": "new description"}`;
        try {
            const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings);
            setEditableOutline(p => ({...p, playlistDescription: parsedJson.playlistDescription}));
            setRefinement('');
        } catch (e) { setError(`Failed to refine description: ${e.message}`); } finally { setIsLoading(false); }
    }, [editableOutline, refinement, settings]);

    const handleRefineVideo = useCallback(async (index) => {
        setIsLoading(true); setError('');
        const video = editableOutline.videos[index];
        const prompt = `Refine this video concept outline/plan: ${JSON.stringify(video)} based on this feedback: "${refinement}". Return a single JSON object for the updated video (only the video object itself, not the full outline). The 'concept' field should remain a brief outline or high-level plan.`;
        try {
            const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings);
            const newVideos = [...editableOutline.videos];
            newVideos[index] = { ...newVideos[index], ...parsedJson, status: 'pending' };
            setEditableOutline(p => ({ ...p, videos: newVideos }));
            setRefiningVideoIndex(null);
            setRefinement('');
        } catch (e) { setError(`Failed to refine video: ${e.message}`); } finally { setIsLoading(false); }
    }, [editableOutline, refinement, settings]);

    const handleRefineEntirePlan = useCallback(async () => {
        setIsLoading(true);
        setError('');
        const prompt = `You are a YouTube series producer. A user has created an initial plan for a video series and wants to refine it based on their feedback.

Original Video Plan:
---
${JSON.stringify(editableOutline, null, 2)}
---

User's Refinement Instructions for the ENTIRE plan: "${planRefinement}"

Your Task:
Rewrite the ENTIRE video plan based on the user's feedback. You can add, remove, or modify videos. You can change the titles, concepts, and lengths. The structure of your response must be an updated JSON object that is IDENTICAL in format to the original plan.

The JSON object must have keys:
"playlistTitleSuggestions" (array of 3 strings),
"playlistDescription" (string),
"videos" (array of objects, each with: "title", "concept", "estimatedLengthMinutes", "locations_featured", "targeted_keywords").

Return ONLY the updated JSON object.`;

        try {
            const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings, {}, true); // Mark as complex task
            if (!parsedJson.playlistTitleSuggestions || !parsedJson.playlistDescription || !parsedJson.videos) {
                throw new Error("AI returned an invalid plan format.");
            }
            // Reset status for all videos in the new plan
            parsedJson.videos.forEach(v => { v.status = 'pending'; v.tasks = {}; });
            setEditableOutline(parsedJson);
            setPlanRefinement(''); // Clear the input after refinement
        } catch (e) {
            setError(`Failed to refine the entire plan: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    }, [editableOutline, planRefinement, settings]);

    const handleAcceptVideo = (index) => {
        const newVideos = [...editableOutline.videos];
        newVideos[index].status = 'accepted';
        setEditableOutline(prev => ({ ...prev, videos: newVideos }));
        if (refiningVideoIndex === index) setRefiningVideoIndex(null);
    };

    const handleDeleteVideoSuggestion = (indexToDelete) => {
        setEditableOutline(prev => {
            const newVideos = prev.videos.filter((_, index) => index !== indexToDelete);
            return { ...prev, videos: newVideos };
        });
    };
    
const handleCreateProject = async () => {
    const acceptedVideos = editableOutline.videos.filter(v => v.status === 'accepted');
    if (!finalizedTitle || !finalizedDescription || acceptedVideos.length === 0) return;
    setIsLoading(true);
    setError('');

    let finalCoverImageUrl = '';

    // Upload cover image if one exists
    if (coverImageFile) {
        const path = `project_thumbnails/${Date.now()}_${userId}_${coverImageFile.name}`;
        finalCoverImageUrl = await uploadFile(coverImageFile, path);
    } else if (coverImageUrl) {
        const fileExtension = coverImageUrl.split('.').pop().split('?')[0];
        const path = `project_thumbnails/${Date.now()}_${userId}.${fileExtension}`;
        finalCoverImageUrl = await downloadAndUploadImage(coverImageUrl, path);
    }

    try {
        const projectRef = db.collection(`artifacts/${appId}/users/${userId}/projects`).doc();

        // Start the first batch
        let batch = db.batch();

        // 1. Set the main project data
        batch.set(projectRef, {
            playlistTitle: finalizedTitle,
            playlistDescription: finalizedDescription,
            locations,
            footageInventory: footageInventory,
            targeted_keywords: selectedKeywords,
            videoCount: acceptedVideos.length,
            coverImageUrl: finalCoverImageUrl,
            createdAt: new Date().toISOString()
        });

        // 2. Add video creations to the batch, committing in chunks
        for (let i = 0; i < acceptedVideos.length; i++) {
            const video = acceptedVideos[i];
            const videoRef = projectRef.collection('videos').doc();
            batch.set(videoRef, { ...video, chosenTitle: video.title, script: '', order: i, createdAt: new Date().toISOString() });

            // **THE FIX**: Commit the batch every 400 writes and start a new one.
            // This prevents a single batch from getting too large.
            if ((i + 1) % 400 === 0) {
                await batch.commit();
                batch = db.batch(); // Start a new batch for the next chunk
            }
        }

        // 3. Commit any remaining operations in the last batch
        await batch.commit();

        // 4. Clean up the draft
        if (draftId) {
            await db.collection(`artifacts/${appId}/users/${userId}/wizards`).doc(draftId).delete();
        }

        onClose(); // Close the wizard on success

    } catch (e) {
        setError(`Failed to save project. ${e.message}`);
        console.error("Error creating project:", e); // It's good practice to log the full error
    } finally {
        setIsLoading(false);
    }
};
    
    
    const renderWizardStep = () => {
        switch (step) {
            case 1: return <window.WizardStep1_Foundation 
                                 inputs={inputs} 
                                 locations={locations} 
                                 coverImageUrl={coverImageUrl} 
                                 settings={settings} 
                                 googleMapsLoaded={googleMapsLoaded} 
                                 onInputChange={(name, val) => setInputs(p => ({ ...p, [name]: val }))} 
                                 onLocationsUpdate={handleLocationsUpdate} 
                                 onCoverImageUrlChange={setCoverImageUrl}
                                 onCoverImageFileChange={setCoverImageFile}
                             />;
            case 2: return <window.WizardStep2_Inventory 
                               locations={locations}
                               footageInventory={footageInventory}
                               onLocationsUpdate={handleLocationsUpdate}
                               onInventoryChange={handleInventoryChange}
                               onSelectAllFootage={handleSelectAllFootage}
                               googleMapsLoaded={googleMapsLoaded}
                           />;
            case 3: return <window.WizardStep3_Keywords keywordIdeas={keywordIdeas} selectedKeywords={selectedKeywords} onKeywordSelection={handleKeywordSelection} isLoading={isGeneratingKeywords} error={error} />;
            case 4: return <window.WizardStep4_Title suggestions={editableOutline?.playlistTitleSuggestions || []} selectedTitle={selectedTitle} refinement={refinement} isLoading={isLoading} error={error} onTitleSelect={setSelectedTitle} onRefinementChange={setRefinement} onRefine={handleRefineTitle} />;
            case 5: return <window.WizardStep5_Description description={editableOutline?.playlistDescription} refinement={refinement} isLoading={isLoading} error={error} onDescriptionChange={(val) => setEditableOutline(p => ({...p, playlistDescription: val}))} onRefinementChange={setRefinement} onRefine={handleRefineDescription} />;
            case 6: return <window.WizardStep6_Review 
                                 videos={editableOutline?.videos || []} 
                                 refiningVideoIndex={refiningVideoIndex} 
                                 refinement={refinement} 
                                 planRefinement={planRefinement}
                                 isLoading={isLoading} 
                                 error={error} 
                                 onRefinementChange={setRefinement} 
                                 onPlanRefinementChange={setPlanRefinement}
                                 onSetRefiningVideoIndex={setRefiningVideoIndex} 
                                 onRefineVideo={handleRefineVideo} 
                                 onRefineEntirePlan={handleRefineEntirePlan}
                                 onAcceptVideo={handleAcceptVideo} 
                                 onDeleteVideo={handleDeleteVideoSuggestion} 
                             />;
            default: return <p>Step {step} not found.</p>;
        }
    };
    
    const renderActionButtons = () => {
        const isInventoryComplete = locations.length <= 1 || locations.slice(1).every(loc => footageInventory[loc.place_id] && (footageInventory[loc.place_id].bRoll || footageInventory[loc.place_id].onCamera || footageInventory[loc.place_id].drone));
        const atLeastOneVideoAccepted = editableOutline?.videos.some(v => v.status === 'accepted');
        const allVideosHandled = editableOutline?.videos.every(v => v.status === 'accepted');

        return (
            <div className="flex justify-between items-center w-full">
                <div><button onClick={() => setShowConfirmModal(true)} className="px-4 py-2 bg-red-800/80 hover:bg-red-700 rounded-lg text-xs text-red-100">Delete Draft</button></div>
                <div className="flex items-center gap-4">
                        {step > 1 && <button onClick={() => setStep(s => s - 1)} disabled={isLoading} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg">Back</button>}
                        {step === 1 && <button onClick={() => setStep(2)} disabled={locations.length === 0} className="px-4 py-2 bg-primary-accent hover:bg-primary-accent-darker rounded-lg disabled:bg-gray-500">Next</button>}
                        {step === 2 && <button onClick={handleGenerateKeywords} disabled={isGeneratingKeywords || !isInventoryComplete} className="px-4 py-2 bg-primary-accent hover:bg-primary-accent-darker rounded-lg flex items-center gap-2 disabled:bg-gray-500">{isGeneratingKeywords ? <window.LoadingSpinner isButton={true} /> : '💡 Get Keyword Ideas'}</button>}
                        {step === 3 && <button onClick={handleGenerateInitialOutline} disabled={isLoading || selectedKeywords.length === 0} className="px-4 py-2 bg-primary-accent hover:bg-primary-accent-darker rounded-lg flex items-center gap-2 disabled:bg-gray-500">{isLoading ? <window.LoadingSpinner isButton={true} /> : '🪄 Generate Project Plan'}</button>}
                        {step === 4 && <button onClick={() => { setFinalizedTitle(selectedTitle); setStep(5); setRefinement(''); setError(''); }} disabled={isLoading || !selectedTitle} className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg">Accept & Continue ➡️</button>}
                        {step === 5 && <button onClick={() => { setFinalizedDescription(editableOutline.playlistDescription); setStep(6); setRefinement(''); setError('');}} disabled={isLoading} className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg">Accept & Continue ➡️</button>}
                        {step === 6 && (
                            <>
                                <button onClick={() => editableOutline.videos.forEach((v, i) => v.status === 'pending' && handleAcceptVideo(i))} disabled={isLoading || allVideosHandled} className="px-4 py-2 bg-secondary-accent hover:bg-secondary-accent-darker rounded-lg disabled:bg-gray-500">Accept All Remaining</button>
                                <button onClick={handleCreateProject} disabled={isLoading || !atLeastOneVideoAccepted} className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg flex items-center gap-2 text-lg font-semibold disabled:bg-gray-500">{isLoading ? <window.LoadingSpinner isButton={true} /> : '✅ Finish & Create Project'}</button>
                            </>
                        )}
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4 sm:p-6 md:p-8">
            {showConfirmModal && <ConfirmationModal onConfirm={handleStartOver} onCancel={() => setShowConfirmModal(false)} />}
            <div className="glass-card rounded-lg p-4 sm:p-6 md:p-8 w-full h-full max-w-4xl flex flex-col" onClick={e => e.stopPropagation()}> 
                <button onClick={handleClose} className="absolute top-4 right-6 text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
                <div className="flex-grow overflow-y-auto pr-2"> 
                    {renderWizardStep()}
                </div>
                <div className="flex-shrink-0 pt-4 sm:pt-6 mt-4 sm:mt-6 border-t border-gray-700">
                    {renderActionButtons()}
                </div>
            </div>
        </div>
    );
};
