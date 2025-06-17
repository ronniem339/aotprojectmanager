const { useState, useEffect, useCallback, useMemo } = React;

window.NewProjectWizard = ({ userId, settings, onClose, googleMapsLoaded, initialDraft, draftId, db, auth, firebaseAppInstance }) => {
    const [step, setStep] = useState(1);
    const [projectDraft, setProjectDraft] = useState(initialDraft || {});
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [isDirty, setIsDirty] = useState(false);

    // Debounce setup
    const debounce = (func, delay) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), delay);
        };
    };

    const saveDraft = useCallback(
        debounce(async (draft) => {
            if (!userId || !isDirty) return;
            setIsSaving(true);
            try {
                const docRef = db.collection(`artifacts/${window.CREATOR_HUB_CONFIG.APP_ID}/users/${userId}/projectDrafts`).doc(draft.id);
                await docRef.set(draft, { merge: true });
                console.log("Draft saved:", draft.id);
                setIsDirty(false);
            } catch (err) {
                console.error("Error saving draft:", err);
                setError("Failed to save draft. Please check your connection.");
            } finally {
                setIsSaving(false);
            }
        }, 2000), [userId, db, isDirty]
    );

    useEffect(() => {
        // Initialize draft if it's a new one
        if (!initialDraft && !draftId) {
             const newDraftId = db.collection(`artifacts/${window.CREATOR_HUB_CONFIG.APP_ID}/users/${userId}/projectDrafts`).doc().id;
             const newDraft = {
                id: newDraftId,
                name: '',
                concept: '',
                locations: [{ id: Date.now(), name: '', isMain: true, pointsOfInterest: [] }],
                keywords: [],
                title: '',
                description: '',
                videos: [],
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            };
            setProjectDraft(newDraft);
             setIsDirty(true); // Mark as dirty to trigger initial save
        } else if (initialDraft) {
            setProjectDraft(initialDraft);
        }
    }, [initialDraft, draftId, userId, db]);


    useEffect(() => {
        if (isDirty) {
            saveDraft(projectDraft);
        }
    }, [projectDraft, saveDraft, isDirty]);

    const updateDraft = (update) => {
        setProjectDraft(prev => ({ ...prev, ...update }));
        setIsDirty(true);
    };

    const handleGenerateKeywords = useCallback(async () => {
        if (!settings.geminiApiKey) {
             setError("Gemini API key is not set in settings.");
             return;
        }
        try {
            const result = await window.aiUtils.generateKeywordsAI({
                videoTitle: projectDraft.name,
                videoConcept: projectDraft.concept,
                locations: projectDraft.locations?.map(l => l.name),
                projectDescription: projectDraft.description,
                apiKey: settings.geminiApiKey,
                useProModelSetting: settings.useProModel, // Pass the setting
                flashModelName: settings.geminiFlashModelName, // Pass the setting
                proModelName: settings.geminiProModelName // Pass the setting
            });
            if (result.keywords) {
                 updateDraft({ keywords: [...new Set([...(projectDraft.keywords || []), ...result.keywords])] });
            }
        } catch (e) {
            console.error(e);
            setError("Failed to generate keywords.");
        }
    }, [projectDraft, settings]);

    const handleGenerateInitialOutline = useCallback(async () => {
        // This is a more complex AI call that doesn't fit the simple aiUtils structure
        // It might be used for generating a description or concept refinement
        const prompt = `Based on this project, suggest a video outline. Name: ${projectDraft.name}, Concept: ${projectDraft.concept}, Keywords: ${(projectDraft.keywords || []).join(', ')}`;
        try {
            const result = await window.aiUtils.callGeminiAPI(
                prompt, 
                settings.geminiApiKey,
                {},
                'handleGenerateInitialOutline', // Or a more precise taskType
                settings.useProModel,
                settings.geminiFlashModelName,
                settings.geminiProModelName
            );
            // Assuming result has a "description" field
            if(result.description) {
                 updateDraft({ description: projectDraft.description ? `${projectDraft.description}\n\n${result.description}` : result.description });
            }
        } catch(e) {
             console.error(e);
             setError("Failed to generate outline.");
        }
    }, [projectDraft, settings]);

    const handleRefineTitle = useCallback(async () => {
        const prompt = `Refine this YouTube title: "${projectDraft.title}". Make it catchier and more SEO friendly based on these keywords: ${ (projectDraft.keywords || []).join(', ')}`;
         try {
            const result = await window.aiUtils.callGeminiAPI(
                prompt, 
                settings.geminiApiKey, 
                {}, 
                'refineProjectTitle', // Example taskType
                settings.useProModel,
                settings.geminiFlashModelName,
                settings.geminiProModelName
            );
            // Assuming the AI returns { refinedTitle: "..." }
            if(result.refinedTitle) {
                 updateDraft({ title: result.refinedTitle });
            }
        } catch(e) {
             console.error(e);
             setError("Failed to refine title.");
        }
    }, [projectDraft, settings]);
    
    const handleRefineDescription = useCallback(async () => {
       const prompt = `Refine this YouTube description for the video titled "${projectDraft.title}":\n\n${projectDraft.description}\n\nMake it more engaging and add relevant hashtags based on these keywords: ${(projectDraft.keywords || []).join(', ')}.`;
         try {
            const result = await window.aiUtils.callGeminiAPI(
                prompt, 
                settings.geminiApiKey, 
                {}, 
                'refineProjectDescription', // Example taskType
                settings.useProModel,
                settings.geminiFlashModelName,
                settings.geminiProModelName
            );
            // Assuming the AI returns { refinedDescription: "..." }
            if(result.refinedDescription) {
                 updateDraft({ description: result.refinedDescription });
            }
        } catch(e) {
             console.error(e);
             setError("Failed to refine description.");
        }
    }, [projectDraft, settings]);


    const renderStep = () => {
        const commonProps = {
            projectDraft,
            updateDraft,
            setStep,
            settings,
            googleMapsLoaded,
            error,
            setError
        };

        switch (step) {
            case 1:
                return <window.WizardStep1_Foundation {...commonProps} />;
            case 2:
                return <window.WizardStep2_Inventory {...commonProps} />;
            case 3:
                 return <window.WizardStep3_Keywords {...commonProps} onGenerateKeywords={handleGenerateKeywords} />;
            case 4:
                 return <window.WizardStep4_Title {...commonProps} onRefine={handleRefineTitle} />;
            case 5:
                 return <window.WizardStep5_Description {...commonProps} onRefine={handleRefineDescription} />;
            case 6:
                return <window.WizardStep6_Review {...commonProps} onClose={onClose} db={db} userId={userId} />;
            default:
                return <div>Invalid Step</div>;
        }
    };
    
    // Final save on close
    const handleClose = async () => {
        await saveDraft.flush(projectDraft); // Using a hypothetical flush method if debounce library supports it
        onClose();
    };


    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl h-full max-h-[90vh] flex flex-col text-white">
                <div className="flex justify-between items-center p-6 border-b border-gray-700">
                    <h2 className="text-2xl font-bold">New Project Wizard</h2>
                    <div>
                        {isSaving && <span className="text-sm text-gray-400 mr-4">Saving...</span>}
                        <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
                    </div>
                </div>
                <div className="flex-grow p-6 overflow-y-auto">
                    {renderStep()}
                </div>
            </div>
        </div>
    );
};
