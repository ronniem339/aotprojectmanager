// js/app.js

// NEW: Function to dynamically load the Google Maps script
/**
 * Dynamically loads the Google Maps script with the provided API key and executes a callback on completion.
 * @param {string} apiKey - Your Google Maps API key.
 * @param {function} callback - The function to call once the script has loaded.
 */
window.loadGoogleMapsScript = (apiKey, callback) => {
    // Check if the script is already on the page
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
        // If the script is already loaded, and google.maps is available, just run the callback
        if (window.google && window.google.maps) {
            callback();
        }
        // If the script is still loading, the callback will be handled by the initMap function
        return;
    }

    // Define the callback function that Google's script will call when it's ready
    window.initMap = () => {
        console.log("Google Maps API loaded and initialized.");
        callback();
    };

    // Create the script element and append it to the document head
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initMap`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
};


window.App = () => { // Exposing App component globally
    const { useState, useEffect, useCallback } = React;
    const [user, setUser] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [previousView, setPreviousView] = useState('dashboard');
    const [selectedProject, setSelectedProject] = useState(null);
    const [settings, setSettings] = useState({ 
        geminiApiKey: '', 
        googleMapsApiKey: '', 
        youtubeApiKey: '', 
        styleGuideText: '', 
        myWriting: '', admiredWriting: '', keywords: '', dosAndDonts: '', excludedPhrases: '',
        // NEW: Add AI model settings with defaults
        useProModelForComplexTasks: false,
        flashModelName: 'gemini-1.5-flash-latest',
        proModelName: 'gemini-1.5-pro-latest',
        knowledgeBases: {
            youtube: {
                whoAmI: '', videoTitles: '', videoDescriptions: '', thumbnailIdeas: '', videoTags: '',
                firstPinnedCommentExpert: '', shortsIdeaGeneration: '', youtubeSeoKnowledgeBase: window.CREATOR_HUB_CONFIG.YOUTUBE_SEO_KNOWLEDGE_BASE,
            },
            blog: {
                coreSeoEngine: '',
                ideaGeneration: '',
                destinationGuideBlueprint: '',
                listiclePostFramework: '',
            },
            storytelling: { // Add this new block
        videoStorytellingPrinciples: '',
    }
        },
        wordpress: { url: '', username: '', applicationPassword: '' }
    });
    const [activeProjectDraft, setActiveProjectDraft] = useState(null);
    const [activeDraftId, setActiveDraftId] = useState(null);
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [showNewProjectWizard, setShowNewProjectWizard] = useState(false);
    const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState(null);
    const [draftToDelete, setDraftToDelete] = useState(null);
    const [showProjectSelection, setShowProjectSelection] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [appError, setAppError] = useState(null);

    const [firebaseAppInstance, setFirebaseAppInstance] = useState(null);
    const [firebaseDb, setFirebaseDb] = useState(null);
    const [firebaseAuth, setFirebaseAuth] = useState(null);

    // START - ADDED FOR BLOG POST GENERATION QUEUE
    const [postGenerationQueue, setPostGenerationQueue] = useState([]);
    const [isGeneratingPost, setIsGeneratingPost] = useState(false);
    const [processingIdeaId, setProcessingIdeaId] = useState(null);
    // END - ADDED FOR BLOG POST GENERATION QUEUE

    const { APP_ID } = window.CREATOR_HUB_CONFIG;

    useEffect(() => {
        const initFirebase = async () => {
            try {
                let app;
                if (!firebase.apps.length) {
                    app = firebase.initializeApp(window.CREATOR_HUB_CONFIG.FIREBASE_CONFIG);
                } else {
                    app = firebase.app();
                }
                setFirebaseAppInstance(app);
                setFirebaseDb(app.firestore());
                setFirebaseAuth(app.auth());

                const unsubscribeAuth = app.auth().onAuthStateChanged(currentUser => {
                    setUser(currentUser);
                    setIsAuthReady(true); 
                    if (!currentUser) {
                        setSettings({ 
                            geminiApiKey: '', googleMapsApiKey: '', youtubeApiKey: '', styleGuideText: '', 
                            myWriting: '', admiredWriting: '', keywords: '', dosAndDonts: '', excludedPhrases: '',
                            // NEW: Reset AI model settings on logout
                            useProModelForComplexTasks: false,
                            flashModelName: 'gemini-1.5-flash-latest',
                            proModelName: 'gemini-1.5-pro-latest',
                            knowledgeBases: {
                                youtube: {
                                    whoAmI: '', videoTitles: '', videoDescriptions: '', thumbnailIdeas: '', videoTags: '',
                                    firstPinnedCommentExpert: '', shortsIdeaGeneration: '',
                                    youtubeSeoKnowledgeBase: window.CREATOR_HUB_CONFIG.YOUTUBE_SEO_KNOWLEDGE_BASE,
                                },
                                blog: {
                                    coreSeoEngine: '', ideaGeneration: '',
                                    destinationGuideBlueprint: '', listiclePostFramework: '',
                                },
                                storytelling: { // Add this new block
        videoStorytellingPrinciples: '',
    }
                            },
                            wordpress: { url: '', username: '', applicationPassword: '' }
                        }); 
                        setActiveProjectDraft(null);
                    }
                });

                return () => unsubscribeAuth();

            } catch (e) {
                console.error("Firebase initialization error:", e);
                setAppError(`Failed to initialize Firebase: ${e.message}`);
                setIsAuthReady(true);
            }
        };
        initFirebase();
    }, []);


    useEffect(() => {
        if (user && user.uid && firebaseDb) { 
            const settingsDocRef = firebaseDb.collection(`artifacts/${APP_ID}/users/${user.uid}/settings`).doc('styleGuide');
            const unsubscribeSettings = settingsDocRef.onSnapshot(docSnap => {
                const defaultSettings = {
                    geminiApiKey: '', googleMapsApiKey: '', youtubeApiKey: '', styleGuideText: '',
                    myWriting: '', admiredWriting: '', keywords: '', dosAndDonts: '', excludedPhrases: '',
                    // NEW: Include AI model settings in defaults
                    useProModelForComplexTasks: false,
                    flashModelName: 'gemini-1.5-flash-latest',
                    proModelName: 'gemini-1.5-pro-latest',
                    knowledgeBases: { 
                        youtube: {
                            whoAmI: '', videoTitles: '', videoDescriptions: '', thumbnailIdeas: '', videoTags: '',
                            firstPinnedCommentExpert: '', shortsIdeaGeneration: '',
                            youtubeSeoKnowledgeBase: window.CREATOR_HUB_CONFIG.YOUTUBE_SEO_KNOWLEDGE_BASE,
                        },
                        blog: {
                            coreSeoEngine: '', ideaGeneration: '',
                            destinationGuideBlueprint: '', listiclePostFramework: '',
                        }
                    },
                    wordpress: { url: '', username: '', applicationPassword: '' }
                };
                const data = docSnap.exists ? docSnap.data() : {};
                
                const mergedKnowledgeBases = {
                    ...defaultSettings.knowledgeBases, 
                    ...data.knowledgeBases, 
                    youtube: { ...defaultSettings.knowledgeBases.youtube, ...data.knowledgeBases?.youtube },
                    blog: { ...defaultSettings.knowledgeBases.blog, ...data.knowledgeBases?.blog },
                    storytelling: { ...defaultSettings.knowledgeBases.storytelling, ...data.knowledgeBases?.storytelling } // Add this line
                };

                const newSettings = { ...defaultSettings, ...data, knowledgeBases: mergedKnowledgeBases };
                setSettings(newSettings);

                if (newSettings.googleMapsApiKey && !googleMapsLoaded) {
                    window.loadGoogleMapsScript(newSettings.googleMapsApiKey, () => {
                        setGoogleMapsLoaded(true);
                    });
                }
            });
            return () => unsubscribeSettings();
        }
    }, [user, googleMapsLoaded, firebaseDb, APP_ID]);

    // START - ADDED FOR BLOG POST GENERATION QUEUE
    useEffect(() => {
        const processNextInQueue = async () => {
            if (isGeneratingPost || postGenerationQueue.length === 0 || !user || !firebaseDb) {
                return;
            }

            const ideaToProcess = postGenerationQueue[0];
            
            setIsGeneratingPost(true);
            setProcessingIdeaId(ideaToProcess.id);
            setPostGenerationQueue(prevQueue => prevQueue.slice(1));

            try {
                await firebaseDb.collection(`artifacts/${APP_ID}/users/${user.uid}/blogIdeas`).doc(ideaToProcess.id).update({
                    status: 'generating',
                    generationStartedAt: new Date().toISOString(),
                    generationError: null
                });
            } catch (error) {
                console.error("Error updating idea status to generating:", error);
                setIsGeneratingPost(false);
                setProcessingIdeaId(null);
                return;
            }

            try {
                const blogPostContent = await window.aiUtils.generateBlogPostContentAI({
                    idea: ideaToProcess,
                    coreSeoEngine: settings.knowledgeBases.blog.coreSeoEngine,
                    monetizationGoals: settings.knowledgeBases.blog.monetizationGoals,
                    listicleContent: settings.knowledgeBases.blog.listicleContent,
                    destinationGuideContent: settings.knowledgeBases.blog.destinationGuideContent,
                    settings: settings
                });

                await firebaseDb.collection(`artifacts/${APP_ID}/users/${user.uid}/blogIdeas`).doc(ideaToProcess.id).update({
                    status: 'generated',
                    blogPostContent: blogPostContent,
                    generationCompletedAt: new Date().toISOString()
                });

            } catch (error) {
                console.error("Error generating blog post:", error);
                await firebaseDb.collection(`artifacts/${APP_ID}/users/${user.uid}/blogIdeas`).doc(ideaToProcess.id).update({
                    status: 'failed',
                    generationError: error.message || 'Unknown error during generation',
                    generationCompletedAt: new Date().toISOString()
                });
            } finally {
                setIsGeneratingPost(false);
                setProcessingIdeaId(null);
            }
        };

        processNextInQueue();

    }, [postGenerationQueue, isGeneratingPost, user, firebaseDb, APP_ID, settings]);

    const handleWritePost = async (idea) => {
        if (idea.status === 'queued' || idea.status === 'generating') {
            return;
        }

        setPostGenerationQueue(prevQueue => [...prevQueue, idea]);

        try {
            await firebaseDb.collection(`artifacts/${APP_ID}/users/${user.uid}/blogIdeas`).doc(idea.id).update({
                status: 'queued',
                generationError: null
            });
        } catch (error) {
            console.error("Error adding idea to queue in Firestore:", error);
            setPostGenerationQueue(prevQueue => prevQueue.filter(item => item.id !== idea.id));
        }
    };
    // END - ADDED FOR BLOG POST GENERATION QUEUE


    const displayNotification = (message) => {
        setNotificationMessage(message);
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 3000);
    };

    const handleSelectProject = (project) => {
        setSelectedProject(project);
        setCurrentView('project');
    };

const handleNavigateBack = () => {
    setCurrentView(previousView);
};

    const handleShowSettings = () => setCurrentView('settingsMenu');
    const handleShowTools = () => setCurrentView('tools');
    const handleSelectTool = (toolId) => {
        if (toolId === 'blog') setCurrentView('blogTool');
        if (toolId === 'shorts') setCurrentView('shortsTool');
        if (toolId === 'contentLibrary') setCurrentView('contentLibrary');
    };
    const handleShowTechnicalSettings = () => setCurrentView('technicalSettings');
    const handleShowStyleAndTone = () => setCurrentView('myStudio');
    const handleShowKnowledgeBases = () => setCurrentView('knowledgeBases');
const handleNavigate = (view) => {
    setPreviousView(currentView);
    setCurrentView(view);
};
const handleSaveSettings = async (updater) => {
    if (!user || !firebaseDb) return;

    const settingsDocRef = firebaseDb.collection(`artifacts/${APP_ID}/users/${user.uid}/settings`).doc('styleGuide');

    try {
        // --- NEW READ-MODIFY-WRITE LOGIC ---

        // 1. Get the latest settings directly from Firestore.
        const currentDoc = await settingsDocRef.get();
        const currentSettings = currentDoc.exists() ? currentDoc.data() : {};

        // 2. Apply the requested changes to the settings object.
        //    The 'updater' is a function that we will define in the next step.
        const newSettings = updater(currentSettings);

        // 3. Write the entire, newly-merged settings object back.
        //    Using .set() here overwrites the old document with the complete new one.
        await settingsDocRef.set(newSettings);

        // 4. Update the application's local state with the saved data.
        setSettings(newSettings);
        
        console.log('Settings successfully saved with new read-modify-write method.');

    } catch (error) {
        console.error('A critical error occurred while saving settings:', error);
        alert('There was a critical error saving your style guide. Please try again.');
    }
};
    
    const handleShowDeleteConfirm = (project) => setProjectToDelete(project);
    
    const handleConfirmDelete = async (projectId) => {
        if (!user || !firebaseDb) return;
        const projectRef = firebaseDb.collection(`artifacts/${APP_ID}/users/${user.uid}/projects`).doc(projectId);
        const videosCollectionRef = projectRef.collection('videos');
        try {
            const videoSnapshot = await videosCollectionRef.get();
            const batch = firebaseDb.batch();
            videoSnapshot.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            await projectRef.delete();
            displayNotification('Project deleted successfully.');
            setProjectToDelete(null); 
        } catch (error) {
            console.error("Error deleting project:", error);
            displayNotification(`Error: ${error.message}`); 
        }
    };
    
    const handleShowDeleteDraftConfirm = (draftId) => setDraftToDelete(draftId);
    
    const handleConfirmDeleteDraft = async (draftId) => {
        if (!user || !firebaseDb) return;
        try {
            await firebaseDb.collection(`artifacts/${APP_ID}/users/${user.uid}/wizards`).doc(draftId).delete();
            displayNotification('Draft deleted successfully.');
            setDraftToDelete(null); 
        } catch (error) {
            console.error("Error deleting draft:", error);
            displayNotification(`Error: ${error.message}`); 
        }
    };
    
    const handleResumeDraft = async (draftId) => {
        if (!user || !firebaseDb) return;
        const draftRef = firebaseDb.collection(`artifacts/${APP_ID}/users/${user.uid}/wizards`).doc(draftId);
        try {
            const docSnap = await draftRef.get();
            if (docSnap.exists) {
                setActiveDraftId(draftId);
                setActiveProjectDraft({ id: docSnap.id, ...docSnap.data() });
                setShowProjectSelection(false);
                setShowNewProjectWizard(true);
            } else {
                displayNotification("Error: Draft not found.");
            }
        } catch (error) {
            console.error("Error resuming draft:", error);
            displayNotification(`Error: ${error.message}`); 
        }
    };

    const handleSelectWorkflow = async (type) => {
        if (!user || !firebaseDb) return;
        setShowProjectSelection(false);
        if (type === 'post-trip') {
            const newDraftRef = firebaseDb.collection(`artifacts/${APP_ID}/users/${user.uid}/wizards`).doc();
            const newDraftData = {
                step: 1, inputs: { location: '', theme: '' }, locations: [], footageInventory: {},
                keywordIdeas: [], selectedKeywords: [], editableOutline: null, finalizedTitle: null,
                finalizedDescription: null, selectedTitle: '', coverImageUrl: '',
                createdAt: new Date(), updatedAt: new Date(),
            };
            await newDraftRef.set(newDraftData);
            setActiveDraftId(newDraftRef.id);
            setActiveProjectDraft(newDraftData);
            setShowNewProjectWizard(true);
        } else if (type === 'import') {
            setCurrentView('importProject');
        }
    };

    const handleAnalyzeImportedProject = async (projectData) => {
        setIsLoading(true);
        if (!projectData.videos || projectData.videos.length === 0) {
            setIsLoading(false);
            displayNotification("No videos found to import. Please check the YouTube URL/ID.");
            return;
        }
        if (!user || !firebaseDb) {
            setIsLoading(false);
            displayNotification("Authentication not ready. Please try again.");
            return;
        }
    
        try {
            const batch = firebaseDb.batch();
            const projectRef = firebaseDb.collection(`artifacts/${APP_ID}/users/${user.uid}/projects`).doc();
            batch.set(projectRef, {
                playlistTitle: projectData.playlistTitle,
                playlistDescription: projectData.playlistDescription,
                locations: [], footageInventory: {}, coverImageUrl: projectData.coverImageUrl || '',
                createdAt: new Date().toISOString(), videoCount: projectData.videos.length
            });

            projectData.videos.forEach((video, index) => {
                const videoRef = projectRef.collection('videos').doc();
                batch.set(videoRef, {
                    title: video.title, concept: video.concept || '', script: video.script || '',
                    locations_featured: video.locations_featured || [], targeted_keywords: video.targeted_keywords || [],
                    estimatedLengthMinutes: video.estimatedLengthMinutes || '', thumbnailUrl: video.thumbnailUrl || '',
                    isManual: video.isManual || false, chapters: video.chapters || [],
                    tasks: video.tasks || {
                        scripting: video.script ? 'complete' : 'pending', videoEdited: 'complete',
                        feedbackProvided: 'complete', metadataGenerated: 'complete', thumbnailsGenerated: 'complete',
                        videoUploaded: 'complete', firstCommentGenerated: 'complete', tagsGenerated: 'complete'
                    },
                    publishDate: video.publishDate || '', metadata: video.metadata || '',
                    generatedThumbnails: video.generatedThumbnails || [], chosenTitle: video.chosenTitle || video.title,
                    order: index, createdAt: new Date().toISOString()
                });
            });

            await batch.commit();
            displayNotification('Project imported and created successfully!');
            setSelectedProject({ id: projectRef.id, playlistTitle: projectData.playlistTitle, playlistDescription: projectData.playlistDescription, coverImageUrl: projectData.coverImageUrl, videoCount: projectData.videos.length });
            setCurrentView('project');
        } catch (error) {
            console.error("Error importing project:", error);
            displayNotification(`Error importing project: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleCloseWizard = () => {
        setShowNewProjectWizard(false);
        setActiveProjectDraft(null);
        setActiveDraftId(null);
    };

    const renderView = () => {
        if (!isAuthReady || !firebaseDb || !firebaseAuth) {
            return <div className="min-h-screen flex justify-center items-center"><window.LoadingSpinner text="Initializing application..." /></div>;
        }
        
        if (!user) {
            return <window.LoginScreen onLogin={() => {}} firebaseAuth={firebaseAuth} />;
        }

        switch (currentView) {
            case 'project':
    return <window.ProjectView project={selectedProject} userId={user.uid} onCloseProject={handleBackToDashboard} settings={settings} onUpdateSettings={handleSaveSettings} googleMapsLoaded={googleMapsLoaded} db={firebaseDb} auth={firebaseAuth} firebaseAppInstance={firebaseAppInstance} onNavigate={handleNavigate} />; // Add onNavigate={handleNavigate} here
            case 'settingsMenu':
                return <window.SettingsMenu onBack={handleBackToDashboard} onShowTechnicalSettings={handleShowTechnicalSettings} onShowStyleAndTone={handleShowStyleAndTone} onShowKnowledgeBases={handleShowKnowledgeBases} />;
            case 'technicalSettings':
                return <window.TechnicalSettingsView settings={settings} onSave={handleSaveSettings} onBack={handleShowSettings} />;
           case 'myStudio':
    return <window.MyStudioView settings={settings} onSave={handleSaveSettings} onBack={handleNavigateBack} previousView={previousView} />;
            case 'importProject':
                return <window.ImportProjectView onAnalyze={handleAnalyzeImportedProject} onBack={handleBackToDashboard} isLoading={isLoading} settings={settings} firebaseDb={firebaseDb} firebaseAppInstance={firebaseAppInstance} />;
            case 'knowledgeBases':
                return <window.KnowledgeBaseView settings={settings} onSave={handleSaveSettings} onBack={handleShowSettings} />;
            case 'tools':
                return <window.ToolsView onBack={handleBackToDashboard} onSelectTool={handleSelectTool} />;
            case 'blogTool':
                return <window.BlogTool 
                            settings={settings} 
                            onBack={() => setCurrentView('tools')} 
                            onNavigateToSettings={() => setCurrentView('technicalSettings')} 
                            userId={user.uid} 
                            db={firebaseDb}
                            // START - ADDED FOR BLOG POST GENERATION QUEUE
                            onWritePost={handleWritePost}
                            processingIdeaId={processingIdeaId}
                            // END - ADDED FOR BLOG POST GENERATION QUEUE
                        />;
            case 'shortsTool':
                 return <window.ShortsTool settings={settings} onBack={() => setCurrentView('tools')} userId={user.uid} db={firebaseDb} />;
            case 'contentLibrary':
                 return <window.ContentLibrary onBack={() => setCurrentView('tools')} userId={user.uid} db={firebaseDb} />;
            default:
                return <window.Dashboard userId={user.uid} onSelectProject={handleSelectProject} onShowSettings={handleShowSettings} onShowProjectSelection={() => setShowProjectSelection(true)} onShowDeleteConfirm={handleShowDeleteConfirm} onShowTools={handleShowTools} db={firebaseDb} auth={firebaseAuth} />;
        }
    }

    return (
        <div className="min-h-screen"> 
            {appError && <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50">{appError}</div>}
            {showNotification && <div className="fixed top-5 right-5 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">{notificationMessage}</div>}
            {showNewProjectWizard && user && <window.NewProjectWizard userId={user.uid} settings={settings} onClose={handleCloseWizard} googleMapsLoaded={googleMapsLoaded} initialDraft={activeProjectDraft} draftId={activeDraftId} db={firebaseDb} auth={firebaseAuth} firebaseAppInstance={firebaseAppInstance}/>}
            {projectToDelete && <window.DeleteConfirmationModal project={projectToDelete} onConfirm={handleConfirmDelete} onCancel={() => setProjectToDelete(null)} />}
            {draftToDelete && <window.DeleteConfirmationModal project={{id: draftToDelete, playlistTitle: 'this draft'}} onConfirm={() => handleConfirmDeleteDraft(draftToDelete)} onCancel={() => setDraftToDelete(null)} />}
            {showProjectSelection && <window.ProjectSelection onSelectWorkflow={handleSelectWorkflow} onClose={() => setShowProjectSelection(false)} userId={user.uid} onResumeDraft={handleResumeDraft} onDeleteDraft={handleShowDeleteDraftConfirm} db={firebaseDb} auth={firebaseAuth} />}
            <main>{renderView()}</main>
        </div>
    );
}

const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);
root.render(<App />);
