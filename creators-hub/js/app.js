// js/app.js

window.App = () => { // Exposing App component globally
    const { useState, useEffect, useCallback } = React;
    const [user, setUser] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [currentView, setCurrentView] = useState('dashboard');
    const [selectedProject, setSelectedProject] = useState(null);
    const [settings, setSettings] = useState({ 
        geminiApiKey: '', 
        googleMapsApiKey: '', 
        youtubeApiKey: '', 
        styleGuideText: '', // This will remain for the combined style guide
        myWriting: '', admiredWriting: '', keywords: '', dosAndDonts: '', excludedPhrases: '', // For Style & Tone
        knowledgeBases: { // New nested structure for knowledge bases
            youtube: {
                whoAmI: '', // User description for authentic tone
                videoTitles: '', // YouTube video titles KB
                videoDescriptions: '', // YouTube video descriptions KB
                thumbnailIdeas: '', // YouTube thumbnail ideas KB
                firstPinnedCommentExpert: '', // YouTube first pinned comment KB
                shortsIdeaGeneration: '', // YouTube Shorts ideas KB
                youtubeSeoKnowledgeBase: window.CREATOR_HUB_CONFIG.YOUTUBE_SEO_KNOWLEDGE_BASE, // Keep the general SEO KB for broad context/fallback
            },
            blog: {
                postIdeaGeneration: '', // Blog post idea generation KB
                postDetailedWriter: '', // Blog post detailed writer KB
                postSeoWriter: '', // Blog post SEO writer KB (listicles, etc.)
                postAffiliateWriter: '', // Blog post affiliate writer KB
            }
        }
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
    const [isLoading, setIsLoading] = useState(false); // Add a general loading state

    // Firebase instances - initialized once and passed down
    const [firebaseAppInstance, setFirebaseAppInstance] = useState(null); // Keep track of the Firebase app instance
    const [firebaseDb, setFirebaseDb] = useState(null);
    const [firebaseAuth, setFirebaseAuth] = useState(null);

    const { APP_ID, INITIAL_AUTH_TOKEN } = window.CREATOR_HUB_CONFIG;

    const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};

    // Initialize Firebase app, Firestore, and Auth only once
    useEffect(() => {
        try {
            let app;
            // Get the default app if it exists, otherwise initialize it
            if (!firebase.apps.length) {
                app = firebase.initializeApp(firebaseConfig);
            } else {
                app = firebase.app();
            }
            setFirebaseAppInstance(app); // Store the app instance

            const dbInstance = app.firestore();
            const authInstance = app.auth();

            setFirebaseDb(dbInstance);
            setFirebaseAuth(authInstance);

            // Sign in anonymously if not already signed in (and auth is ready)
            // This is primarily for the Canvas environment to function.
            const signIn = async () => {
                if (!authInstance.currentUser) {
                    try {
                        if (typeof INITIAL_AUTH_TOKEN !== 'undefined' && INITIAL_AUTH_TOKEN) {
                            await authInstance.signInWithCustomToken(INITIAL_AUTH_TOKEN);
                            console.log("Signed in with custom token.");
                        } else {
                            await authInstance.signInAnonymously();
                            console.log("Signed in anonymously.");
                        }
                    } catch (signInError) {
                        console.error("Firebase Sign-in Error:", signInError);
                        setError(`Authentication failed: ${signInError.message}`);
                    }
                }
                // Only set isAuthReady to true AFTER the initial auth state is known
                // This ensures components don't try to access auth.currentUser before it's set.
                // If sign-in is managed elsewhere (like LoginScreen), this listener will react.
                if (!isAuthReady) setIsAuthReady(true); // Only set once
            };

            const unsubscribeAuth = authInstance.onAuthStateChanged(currentUser => {
                setUser(currentUser);
                if (!currentUser) {
                    // Clear settings for unauthenticated user
                    setSettings({ 
                        geminiApiKey: '', googleMapsApiKey: '', youtubeApiKey: '', styleGuideText: '', 
                        myWriting: '', admiredWriting: '', keywords: '', dosAndDonts: '', excludedPhrases: '',
                        knowledgeBases: {
                            youtube: {
                                whoAmI: '', videoTitles: '', videoDescriptions: '', thumbnailIdeas: '',
                                firstPinnedCommentExpert: '', shortsIdeaGeneration: '',
                                youtubeSeoKnowledgeBase: window.CREATOR_HUB_CONFIG.YOUTUBE_SEO_KNOWLEDGE_BASE,
                            },
                            blog: {
                                postIdeaGeneration: '', postDetailedWriter: '', postSeoWriter: '', postAffiliateWriter: '',
                            }
                        }
                    }); 
                    setActiveProjectDraft(null);
                }
                // Only set isAuthReady to true even if auth.currentUser is null,
                // because authStateChanged has fired and the auth state is known.
                // This prevents infinite loading if no user is signed in.
                setIsAuthReady(true); 
            });

            // Call signIn immediately to handle initial auth
            signIn();

            return () => unsubscribeAuth();

        } catch (e) {
            console.error("Firebase initialization error:", e);
            setError(`Failed to initialize Firebase: ${e.message}`);
            setIsAuthReady(true); // Set authReady to true even on error to stop loading
        }
    }, [firebaseConfig, INITIAL_AUTH_TOKEN]); // Removed isAuthReady from dependencies to prevent infinite loop

    // Effect for loading user data and scripts once authenticated AND Firebase is ready
    useEffect(() => {
        if (user && user.uid && firebaseDb && firebaseAuth) { // Ensure all necessary Firebase instances are ready
            const settingsDocRef = firebaseDb.collection(`artifacts/${APP_ID}/users/${user.uid}/settings`).doc('styleGuide');
            const unsubscribeSettings = settingsDocRef.onSnapshot(docSnap => {
                const defaultSettings = {
                    geminiApiKey: '',
                    googleMapsApiKey: '',
                    youtubeApiKey: '', 
                    styleGuideText: '',
                    myWriting: '',
                    admiredWriting: '',
                    keywords: '',
                    dosAndDonts: '',
                    excludedPhrases: '',
                    knowledgeBases: { // Default structure for new knowledge bases
                        youtube: {
                            whoAmI: '',
                            videoTitles: '',
                            videoDescriptions: '',
                            thumbnailIdeas: '',
                            firstPinnedCommentExpert: '',
                            shortsIdeaGeneration: '',
                            youtubeSeoKnowledgeBase: window.CREATOR_HUB_CONFIG.YOUTUBE_SEO_KNOWLEDGE_BASE, // Still default here
                        },
                        blog: {
                            postIdeaGeneration: '',
                            postDetailedWriter: '',
                            postSeoWriter: '',
                            postAffiliateWriter: '',
                        }
                    }
                };
                const data = docSnap.exists ? docSnap.data() : {};
                
                // Deep merge for knowledgeBases to preserve existing nested values
                const mergedKnowledgeBases = {
                    ...defaultSettings.knowledgeBases, // Start with all defaults
                    ...data.knowledgeBases, // Overlay any saved top-level KB objects if they were flat for some reason
                    youtube: { // Deep merge YouTube KBs
                        ...defaultSettings.knowledgeBases.youtube,
                        ...data.knowledgeBases?.youtube, // Overlay saved YouTube KBs
                        // Special handling for youtubeSeoKnowledgeBase to ensure default from config is used if not explicitly saved
                        youtubeSeoKnowledgeBase: data.knowledgeBases?.youtube?.youtubeSeoKnowledgeBase !== undefined ? 
                                                 data.knowledgeBases.youtube.youtubeSeoKnowledgeBase : 
                                                 (data.youtubeSeoKnowledgeBase !== undefined ? data.youtubeSeoKnowledgeBase : window.CREATOR_HUB_CONFIG.YOUTUBE_SEO_KNOWLEDGE_BASE)
                    },
                    blog: { // Deep merge Blog KBs
                        ...defaultSettings.knowledgeBases.blog,
                        ...data.knowledgeBases?.blog, // Overlay saved Blog KBs
                    }
                };

                const newSettings = { 
                    ...defaultSettings, // Start with all flat defaults
                    ...data, // Overlay any saved flat settings
                    knowledgeBases: mergedKnowledgeBases // Use the deeply merged KB object
                };

                // Remove the old top-level youtubeSeoKnowledgeBase if it exists directly on data, to prevent conflicts
                // This is specifically for migration from old structure.
                if (newSettings.youtubeSeoKnowledgeBase !== undefined && 
                    newSettings.youtubeSeoKnowledgeBase !== window.CREATOR_HUB_CONFIG.YOUTUBE_SEO_KNOWLEDGE_BASE &&
                    newSettings.youtubeSeoKnowledgeBase === mergedKnowledgeBases.youtube.youtubeSeoKnowledgeBase // Only delete if it's been successfully migrated
                ) {
                    delete newSettings.youtubeSeoKnowledgeBase; 
                }

                setSettings(newSettings);

                // Load Google Maps script only once and if API key is present
                if (newSettings.googleMapsApiKey && !googleMapsLoaded) {
                    window.loadGoogleMapsScript(newSettings.googleMapsApiKey, () => {
                        setGoogleMapsLoaded(true);
                    });
                }
            });

            return () => {
                unsubscribeSettings();
            };
        }
    }, [user, googleMapsLoaded, firebaseDb, firebaseAuth]); // Depend on all Firebase instances


    const displayNotification = (message) => {
        setNotificationMessage(message);
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 3000);
    };

    const handleSelectProject = (project) => {
        setSelectedProject(project);
        setCurrentView('project');
    };

    const handleBackToDashboard = () => {
        setSelectedProject(null);
        setCurrentView('dashboard');
    };

    // Updated navigation handlers
    const handleShowSettings = () => setCurrentView('settingsMenu');
    const handleShowTechnicalSettings = () => setCurrentView('settings');
    const handleShowStyleAndTone = () => setCurrentView('myStudio');
    const handleShowKnowledgeBases = () => setCurrentView('knowledgeBases');

    const handleSaveSettings = async (newSettings) => {
        if (!user || !firebaseDb) return;
        const settingsDocRef = firebaseDb.collection(`artifacts/${APP_ID}/users/${user.uid}/settings`).doc('styleGuide');
        try {
            await settingsDocRef.set(newSettings, { merge: true });
            displayNotification('Settings saved successfully!');
            if (currentView === 'settings' || currentView === 'myStudio' || currentView === 'knowledgeBases') {
                setCurrentView('settingsMenu');
            }
        } catch (error) {
            console.error("Error saving settings:", error);
            displayNotification(`Error: ${error.message}`);
        }
    };
    
    const handleShowDeleteConfirm = (project) => {
        setProjectToDelete(project);
    };
    
    const handleConfirmDelete = async (projectId) => {
        if (!user || !firebaseDb) return;

        const projectRef = firebaseDb.collection(`artifacts/${APP_ID}/users/${user.uid}/projects`).doc(projectId);
        const videosCollectionRef = projectRef.collection('videos');
        
        try {
            const videoSnapshot = await videosCollectionRef.get();
            const batch = firebaseDb.batch();
            videoSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();

            await projectRef.delete();
            
            displayNotification('Project deleted successfully.');
            setProjectToDelete(null); 
        } catch (error) {
            console.error("Error deleting project:", error);
            displayNotification(`Error: ${e.message}`); // Fixed typo: 'e' instead of 'error'
        }
    };
    
    const handleShowDeleteDraftConfirm = (draftId) => {
        setDraftToDelete(draftId);
    };
    
    const handleConfirmDeleteDraft = async (draftId) => {
        if (!user || !firebaseDb) return;
        try {
            await firebaseDb.collection(`artifacts/${APP_ID}/users/${user.uid}/wizards`).doc(draftId).delete();
            displayNotification('Draft deleted successfully.');
            setDraftToDelete(null); 
        } catch (error) {
            console.error("Error deleting draft:", error);
            displayNotification(`Error: ${e.message}`); // Fixed typo: 'e' instead of 'error'
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
            displayNotification(`Error: ${e.message}`); // Fixed typo: 'e' instead of 'error'
        }
    };

    const handleSelectWorkflow = async (type) => {
        if (!user || !firebaseDb) return;
        setShowProjectSelection(false);
        if (type === 'post-trip') {
             // Create a new draft document in Firestore
            const newDraftRef = firebaseDb.collection(`artifacts/${APP_ID}/users/${user.uid}/wizards`).doc();
            const newDraftData = {
                step: 1,
                inputs: { location: '', theme: '' },
                locations: [],
                footageInventory: {},
                keywordIdeas: [],
                selectedKeywords: [],
                editableOutline: null,
                finalizedTitle: null,
                finalizedDescription: null,
                selectedTitle: '',
                coverImageUrl: '',
                createdAt: new Date(),
                updatedAt: new Date(),
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
    
        // Create a new draft document in Firestore for the imported project
        const newDraftRef = firebaseDb.collection(`artifacts/${APP_ID}/users/${user.uid}/wizards`).doc();
        const newDraftData = {
            step: 6, // Go directly to the review video plan step for imported projects
            editableOutline: {
                playlistTitleSuggestions: [projectData.playlistTitle],
                playlistDescription: projectData.playlistDescription,
                videos: projectData.videos.map(video => ({
                    ...video,
                    script: video.script || '',
                    metadata: video.metadata || '',
                    publishDate: video.publishDate || '',
                    generatedThumbnails: video.generatedThumbnails || [],
                    chosenTitle: video.chosenTitle || video.title,
                    tasks: video.tasks || {
                        scripting: video.script ? 'complete' : 'pending',
                        videoEdited: 'complete',
                        feedbackProvided: 'complete',
                        metadataGenerated: 'complete',
                        thumbnailsGenerated: 'complete',
                        videoUploaded: 'complete',
                        firstCommentGenerated: 'complete',
                    },
                    status: 'accepted'
                }))
            },
            inputs: { location: projectData.playlistTitle, theme: projectData.projectOutline || '' },
            locations: [], // Imported projects don't directly map to this part of the wizard
            footageInventory: {}, // Not applicable for imported projects
            coverImageUrl: projectData.coverImageUrl || '',
            keywordIdeas: [],
            selectedKeywords: [],
            finalizedTitle: projectData.playlistTitle,
            finalizedDescription: projectData.playlistDescription,
            selectedTitle: projectData.playlistTitle,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
    
        await newDraftRef.set(newDraftData);
    
        setActiveDraftId(newDraftRef.id);
        setActiveProjectDraft(newDraftData);
    
        setCurrentView('dashboard');
        setShowNewProjectWizard(true);
        setIsLoading(false);
    };
    
    const handleCloseWizard = () => {
        setShowNewProjectWizard(false);
        setActiveProjectDraft(null);
        setActiveDraftId(null);
    };

    const renderView = () => {
        // Only render main app content if authentication and Firebase instances are ready
        if (!isAuthReady || !firebaseDb || !firebaseAuth) {
            return <div className="min-h-screen flex justify-center items-center"><window.LoadingSpinner text="Initializing application..." /></div>;
        }
        
        // Render LoginScreen if no user is authenticated
        if (!user) {
            return <window.LoginScreen onLogin={() => { /* auth is handled by LoginScreen internally */ }} firebaseAuth={firebaseAuth} />;
        }

        switch (currentView) {
            case 'project':
                // Only render ProjectView if selectedProject and its ID are available, AND Firebase instances are ready
                if (selectedProject && selectedProject.id && firebaseDb && firebaseAuth) {
                    return <window.ProjectView 
                                project={selectedProject} 
                                userId={user.uid} 
                                onCloseProject={handleBackToDashboard}
                                settings={settings} 
                                googleMapsLoaded={googleMapsLoaded}
                                db={firebaseDb} // Pass the Firestore instance
                                auth={firebaseAuth} // Pass the Auth instance
                            />;
                } else {
                    // Fallback if selectedProject is not ready but currentView is 'project'
                    return <div className="min-h-screen flex justify-center items-center">
                                <window.LoadingSpinner text="Loading project details..." />
                                {/* Optionally, add an error message here if selectedProject is null/undefined */}
                            </div>;
                }
            case 'settingsMenu':
                return <window.SettingsMenu onBack={handleBackToDashboard} onShowTechnicalSettings={handleShowTechnicalSettings} onShowStyleAndTone={handleShowStyleAndTone} onShowKnowledgeBases={handleShowKnowledgeBases} />;
            case 'settings':
                return <window.SettingsView settings={settings} onSave={handleSaveSettings} onBack={handleShowSettings} />;
            case 'myStudio':
                return <window.MyStudioView settings={settings} onSave={handleSaveSettings} onBack={handleShowSettings} />;
            case 'importProject':
                return <window.ImportProjectView onAnalyze={handleAnalyzeImportedProject} onBack={handleBackToDashboard} isLoading={isLoading} settings={settings} firebaseDb={firebaseDb} />;
            case 'knowledgeBases':
                return <window.KnowledgeBaseView settings={settings} onSave={handleSaveSettings} onBack={handleShowSettings} />;
            default:
                return <window.Dashboard 
                            userId={user.uid} 
                            onSelectProject={handleSelectProject} 
                            onShowSettings={handleShowSettings}
                            onShowProjectSelection={() => setShowProjectSelection(true)}
                            onShowDeleteConfirm={handleShowDeleteConfirm}
                            db={firebaseDb}
                            auth={firebaseAuth}
                        />;
        }
    }

    return (
        <div className="min-h-screen"> 
            {showNotification && (<div className="fixed top-5 right-5 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">{notificationMessage}</div>)}
            {showNewProjectWizard && user && firebaseDb && firebaseAuth && // Ensure all Firebase instances are ready
                <window.NewProjectWizard 
                    userId={user.uid} 
                    settings={settings} 
                    onClose={handleCloseWizard} 
                    googleMapsLoaded={googleMapsLoaded} 
                    initialDraft={activeProjectDraft} 
                    draftId={activeDraftId} 
                    db={firebaseDb} 
                    auth={firebaseAuth} 
                />
            }
            {projectToDelete && firebaseDb && <window.DeleteConfirmationModal project={projectToDelete} onConfirm={handleConfirmDelete} onCancel={() => setProjectToDelete(null)} />}
            {draftToDelete && firebaseDb && <window.DeleteConfirmationModal project={{id: draftToDelete, playlistTitle: 'this draft'}} onConfirm={handleConfirmDeleteDraft} onCancel={() => setDraftToDelete(null)} />}
            {showProjectSelection && user && firebaseDb && firebaseAuth && // Ensure all Firebase instances are ready
                <window.ProjectSelection 
                    onSelectWorkflow={handleSelectWorkflow} 
                    onClose={() => setShowProjectSelection(false)} 
                    userId={user.uid} 
                    onResumeDraft={handleResumeDraft} 
                    onDeleteDraft={handleShowDeleteDraftConfirm}
                    db={firebaseDb} 
                    auth={firebaseAuth} 
                />
            }
            <main>
                {renderView()}
            </main>
        </div>
    );
}

const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);
root.render(<App />);
