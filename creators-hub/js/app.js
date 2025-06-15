// js/app.js

window.App = () => { // Exposing App component globally
    const [user, setUser] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [currentView, setCurrentView] = useState('dashboard');
    const [selectedProject, setSelectedProject] = useState(null);
    const [settings, setSettings] = useState({ geminiApiKey: '', googleMapsApiKey: '', youtubeApiKey: '', styleGuideText: '' }); // Added youtubeApiKey
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
                setSettings({ geminiApiKey: '', googleMapsApiKey: '', youtubeApiKey: '', styleGuideText: '' }); // Clear settings for unauthenticated user, including youtubeApiKey
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
                    youtubeApiKey: '', // Default for youtubeApiKey
                    styleGuideText: '',
                    myWriting: '',
                    admiredWriting: '',
                    keywords: '',
                    dosAndDonts: '',
                    excludedPhrases: '',
                    youtubeSeoKnowledgeBase: window.CREATOR_HUB_CONFIG.YOUTUBE_SEO_KNOWLEDGE_BASE // Ensure default KB is set if not present
                };
                const data = docSnap.exists ? docSnap.data() : {};
                if (data.youtubeSeoKnowledgeBase === undefined) {
                    data.youtubeSeoKnowledgeBase = defaultSettings.youtubeSeoKnowledgeBase;
                }
                const newSettings = { ...defaultSettings, ...data };
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
    }, [user, googleMapsLoaded]); // Depend on user and googleMapsLoaded


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
        const knowledgeBase = settings.youtubeSeoKnowledgeBase || window.CREATOR_HUB_CONFIG.YOUTUBE_SEO_KNOWLEDGE_BASE;
        const styleGuide = settings.styleGuideText ? `This is the user's personal style guide:\n${settings.styleGuideText}` : "No specific style guide was provided.";

        const prompt = `You are a professional YouTube producer tasked with analyzing an imported, partially complete project.
A user has provided the following data:
- Playlist Title: "${projectData.playlistTitle}"
- Overall Project Plan/Concept: "${projectData.projectOutline || 'Not provided'}"
- Existing Playlist Description: "${projectData.playlistDescription || 'Not provided'}"
- Existing Videos: ${JSON.stringify(projectData.videos, null, 2)}

Your task is to analyze this data and generate a complete project plan to help the user finish their series.
1.  **Analyze and Improve Playlist Title**: Based on the provided title and video concepts, generate 3 improved, SEO-friendly title suggestions. The first suggestion should be the user's original title if it's strong, or an improved version of it.
2.  **Analyze and Improve Playlist Description**: Synthesize information from the "Overall Project Plan/Concept" and the "Existing Playlist Description". Use this synthesis to create a single, new, long-form (300-400 words) SEO-optimized description. If one field is empty, rely on the other. If both are empty, create a description from the video concepts. Prioritize the SEO knowledge base, then infuse the user's style guide for tone.
3.  **Complete the Video Series**: Analyze the existing videos. If it seems like a complete series, return them as is. If there are obvious gaps (e.g., a missing introduction or conclusion), suggest 1-2 new video ideas to make the series feel complete.
4.  **Return a JSON object**: Your entire response MUST be a single, valid JSON object with the following structure: { "playlistTitleSuggestions": ["..."], "playlistDescription": "...", "videos": [{"title": "...", "concept": "...", "script": "...", "estimatedLengthMinutes": "8-10", "locations_featured": [], "targeted_keywords": []}] }`;
        
        try {
            const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings.geminiApiKey); // Use shared utility
            
            if (parsedJson && parsedJson.playlistTitleSuggestions && parsedJson.playlistDescription && parsedJson.videos) {
                setProjectDraft({
                    step: 4, 
                    editableOutline: parsedJson,
                    inputs: { location: projectData.playlistTitle, theme: projectData.projectOutline || '' },
                    locations: [], 
                    footageInventory: {}
                });
                setCurrentView('dashboard'); 
                setShowNewProjectWizard(true);
            } else {
                throw new Error("AI returned an invalid project plan. Please check the imported data and try again.");
            }
        } catch (e) {
            console.error("Error analyzing project:", e);
            displayNotification(`Analysis Error: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
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
