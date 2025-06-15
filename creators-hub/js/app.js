// js/app.js

window.App = () => { // Exposing App component globally
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
    const [projectDraft, setProjectDraft] = useState(null);
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [showNewProjectWizard, setShowNewProjectWizard] = useState(false);
    const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState(null);
    const [showProjectSelection, setShowProjectSelection] = useState(false);
    const [isLoading, setIsLoading] = useState(false); // Add a general loading state

    const { APP_ID, INITIAL_AUTH_TOKEN } = window.CREATOR_HUB_CONFIG;

    // The handleLogin function now is simpler because LoginScreen handles its own auth calls
    const handleLogin = useCallback(async () => {
        // This function can be empty or trigger specific post-login actions if needed,
        // as authentication is handled within LoginScreen directly.
        // The onAuthStateChanged listener will update the user state.
    }, []);

    // Effect for handling authentication state changes
    useEffect(() => {
        // onAuthStateChanged is the primary way to manage user state in Firebase
        const unsubscribeAuth = auth.onAuthStateChanged(currentUser => {
            setUser(currentUser);
            if (!currentUser) {
                // IMPORTANT: Removed automatic anonymous sign-in here.
                // The LoginScreen is now responsible for handling user authentication.
                // Clear settings for unauthenticated user, including new KB structures
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
                setProjectDraft(null);
            }
            setIsAuthReady(true);
        });
        return () => unsubscribeAuth();
    }, [INITIAL_AUTH_TOKEN]); // Depend on INITIAL_AUTH_TOKEN if it changes, though usually it's static.


    // Effect for loading user data and scripts once authenticated
    useEffect(() => {
        if (user && user.uid) { // Ensure user and uid exist
            const settingsDocRef = db.collection(`artifacts/${APP_ID}/users/${user.uid}/settings`).doc('styleGuide');
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

            const draftRef = db.collection(`artifacts/${APP_ID}/users/${user.uid}/wizards`).doc('newProjectDraft');
            const unsubscribeDraft = draftRef.onSnapshot(docSnap => {
                setProjectDraft(docSnap.exists ? docSnap.data() : null);
            });

            return () => {
                unsubscribeSettings();
                unsubscribeDraft();
            };
        }
    }, [user, googleMapsLoaded]);


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
    const handleShowSettings = () => setCurrentView('settingsMenu'); // Navigate to the new settings menu
    const handleShowTechnicalSettings = () => setCurrentView('settings'); // Navigate to the specific Technical Settings view
    const handleShowStyleAndTone = () => setCurrentView('myStudio'); // Renamed from myStudio to styleAndTone view
    const handleShowKnowledgeBases = () => setCurrentView('knowledgeBases');

    const handleSaveSettings = async (newSettings) => {
        if (!user) return;
        const settingsDocRef = db.collection(`artifacts/${APP_ID}/users/${user.uid}/settings`).doc('styleGuide');
        try {
            // Firestore does deep merges, so sending the whole object should work.
            // However, ensure you're not unintentionally overwriting the entire knowledgeBases object
            // if only a sub-part changed. The approach in state update should manage this.
            await settingsDocRef.set(newSettings, { merge: true });
            displayNotification('Settings saved successfully!');
            // After saving, go back to the settings menu if applicable, otherwise dashboard
            if (currentView === 'settings' || currentView === 'myStudio' || currentView === 'knowledgeBases') {
                setCurrentView('settingsMenu'); // Go back to the settings menu after saving a sub-setting
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
        if (!user) return; // Ensure user is authenticated

        const projectRef = db.collection(`artifacts/${APP_ID}/users/${user.uid}/projects`).doc(projectId);
        const videosCollectionRef = projectRef.collection('videos');
        
        try {
            const videoSnapshot = await videosCollectionRef.get();
            const batch = db.batch();
            videoSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();

            await projectRef.delete();
            
            displayNotification('Project deleted successfully.');
            setProjectToDelete(null); 
        } catch (error) {
            console.error("Error deleting project:", error);
            displayNotification(`Error: ${error.message}`);
        }
    };

    const handleSelectWorkflow = (type) => {
        setShowProjectSelection(false);
        if (type === 'post-trip') {
            setShowNewProjectWizard(true);
        } else if (type === 'import') {
            setCurrentView('importProject');
        }
    };

    const handleAnalyzeImportedProject = async (projectData) => {
        setIsLoading(true);
        // The general knowledge base for YouTube SEO might still be useful here for overall context
        // const youtubeSeoKnowledgeBase = settings.knowledgeBases.youtube.youtubeSeoKnowledgeBase; 
        // const styleGuide = settings.styleGuideText; // Use the combined style guide text

        if (!projectData.videos || projectData.videos.length === 0) {
            setIsLoading(false);
            displayNotification("No videos found to import. Please check the YouTube URL/ID.");
            return;
        }

        // Set the editableOutline directly from imported projectData
        setProjectDraft({
            step: 6, // Go directly to the review video plan step for imported projects
            editableOutline: {
                playlistTitleSuggestions: [projectData.playlistTitle], // Use imported title as first suggestion
                playlistDescription: projectData.playlistDescription,
                videos: projectData.videos.map(video => ({
                    ...video,
                    script: video.script || '', // Preserve imported script or default empty
                    metadata: video.metadata || '', // Preserve imported metadata or default empty
                    publishDate: video.publishDate || '', // Preserve imported publishDate
                    generatedThumbnails: video.generatedThumbnails || [], // Preserve imported thumbnails
                    chosenTitle: video.chosenTitle || video.title, // Preserve chosen title
                    tasks: video.tasks || { // Ensure tasks are initialized or preserved
                        scripting: video.script ? 'complete' : 'pending', // If script exists, mark complete
                        videoEdited: 'complete',
                        feedbackProvided: 'complete',
                        metadataGenerated: 'complete',
                        thumbnailsGenerated: 'complete',
                        videoUploaded: 'complete',
                        firstCommentGenerated: 'complete',
                    },
                    status: 'accepted' // Mark imported videos as accepted by default
                }))
            },
            inputs: { location: projectData.playlistTitle, theme: projectData.projectOutline || '' },
            locations: [], // Imported projects don't directly map to this part of the wizard
            footageInventory: {}, // Not applicable for imported projects
            coverImageUrl: projectData.coverImageUrl || '', // Carry over the imported cover image
            // Also need to set these so the wizard doesn't complain about missing data
            keywordIdeas: [],
            selectedKeywords: [],
            finalizedTitle: projectData.playlistTitle,
            finalizedDescription: projectData.playlistDescription,
            selectedTitle: projectData.playlistTitle,
        });
        
        setCurrentView('dashboard'); 
        setShowNewProjectWizard(true);
        setIsLoading(false);
    };

    const renderView = () => {
        // Only render main app content if authentication is ready
        if (!isAuthReady) {
            return <div className="min-h-screen flex justify-center items-center"><window.LoadingSpinner text="Initializing..." /></div>;
        }
        
        // Render LoginScreen if no user is authenticated
        if (!user) {
            return <window.LoginScreen onLogin={handleLogin} />;
        }

        switch (currentView) {
            case 'project':
                return <window.ProjectView project={selectedProject} userId={user.uid} onBack={handleBackToDashboard} settings={settings} googleMapsLoaded={googleMapsLoaded} />;
            case 'settingsMenu': // For the Settings Menu
                return <window.SettingsMenu onBack={handleBackToDashboard} onShowTechnicalSettings={handleShowTechnicalSettings} onShowStyleAndTone={handleShowStyleAndTone} onShowKnowledgeBases={handleShowKnowledgeBases} />;
            case 'settings': // Technical Settings View
                return <window.SettingsView settings={settings} onSave={handleSaveSettings} onBack={handleShowSettings} />; // Go back to SettingsMenu
            case 'myStudio': // Style & Tone View
                return <window.MyStudioView settings={settings} onSave={handleSaveSettings} onBack={handleShowSettings} />; // Go back to SettingsMenu
            case 'importProject':
                return <window.ImportProjectView onAnalyze={handleAnalyzeImportedProject} onBack={handleBackToDashboard} isLoading={isLoading} settings={settings} />; // Pass settings to ImportProjectView
            case 'knowledgeBases':
                return <window.KnowledgeBaseView settings={settings} onSave={handleSaveSettings} onBack={handleShowSettings} />; // Go back to SettingsMenu
            default:
                return <window.Dashboard 
                            userId={user.uid} 
                            onSelectProject={handleSelectProject} 
                            onShowSettings={handleShowSettings} // Now leads to settingsMenu
                            onShowProjectSelection={() => setShowProjectSelection(true)}
                            onShowDeleteConfirm={handleShowDeleteConfirm}
                        />;
        }
    }

    return (
        <div className="min-h-screen"> 
            {showNotification && (<div className="fixed top-5 right-5 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">{notificationMessage}</div>)}
            {showNewProjectWizard && user && <window.NewProjectWizard userId={user.uid} settings={settings} onClose={() => { setShowNewProjectWizard(false); setProjectDraft(null); }} googleMapsLoaded={googleMapsLoaded} initialDraft={projectDraft} />}
            {projectToDelete && <window.DeleteConfirmationModal project={projectToDelete} onConfirm={handleConfirmDelete} onCancel={() => setProjectToDelete(null)} />}
            {showProjectSelection && <window.ProjectSelection onSelectWorkflow={handleSelectWorkflow} onClose={() => setShowProjectSelection(false)} />}
            <main>
                {renderView()}
            </main>
        </div>
    );
}

const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);
root.render(<App />);
