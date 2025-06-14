// js/app.js

function App() {
    const [user, setUser] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [currentView, setCurrentView] = useState('dashboard');
    const [selectedProject, setSelectedProject] = useState(null);
    const [settings, setSettings] = useState({ geminiApiKey: '', googleMapsApiKey: '', styleGuideText: '' });
    const [projectDraft, setProjectDraft] = useState(null);
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [showNewProjectWizard, setShowNewProjectWizard] = useState(false);
    const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState(null);
    const [showProjectSelection, setShowProjectSelection] = useState(false);
    const [isLoading, setIsLoading] = useState(false); // Add a general loading state

    const { APP_ID, INITIAL_AUTH_TOKEN } = window.CREATOR_HUB_CONFIG;

    const handleLogin = useCallback(async () => {
        try {
            if (INITIAL_AUTH_TOKEN) {
                await auth.signInWithCustomToken(INITIAL_AUTH_TOKEN);
            } else {
                await auth.signInAnonymously();
            }
        } catch (error) {
            console.error("Authentication failed:", error);
            displayNotification(`Authentication Error: ${error.message}`);
        }
    }, [INITIAL_AUTH_TOKEN]);

    // Effect for handling authentication state changes
    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged(currentUser => {
            setUser(currentUser);
            if (!currentUser) {
                setSettings({ geminiApiKey: '', googleMapsApiKey: '', styleGuideText: '' });
                setProjectDraft(null);
            }
            setIsAuthReady(true);
        });
        return () => unsubscribeAuth();
    }, []);

    // Effect for loading user data and scripts once authenticated
    useEffect(() => {
        if (user) {
            const settingsDocRef = db.collection(`artifacts/${APP_ID}/users/${user.uid}/settings`).doc('styleGuide');
            const unsubscribeSettings = settingsDocRef.onSnapshot(docSnap => {
                const defaultSettings = {
                    geminiApiKey: '',
                    googleMapsApiKey: '',
                    styleGuideText: '',
                    myWriting: '',
                    admiredWriting: '',
                    keywords: '',
                    dosAndDonts: '',
                    excludedPhrases: '',
                    youtubeSeoKnowledgeBase: window.CREATOR_HUB_CONFIG.YOUTUBE_SEO_KNOWLEDGE_BASE
                };
                const data = docSnap.exists ? docSnap.data() : {};
                if (data.youtubeSeoKnowledgeBase === undefined) {
                    data.youtubeSeoKnowledgeBase = defaultSettings.youtubeSeoKnowledgeBase;
                }
                const newSettings = { ...defaultSettings, ...data };
                setSettings(newSettings);

                if (newSettings.googleMapsApiKey && !googleMapsLoaded) {
                    loadGoogleMapsScript(newSettings.googleMapsApiKey, () => {
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

    const handleShowSettings = () => setCurrentView('settings');
    const handleShowMyStudio = () => setCurrentView('myStudio');

    const handleSaveSettings = async (newSettings) => {
        if (!user) return;
        const settingsDocRef = db.collection(`artifacts/${APP_ID}/users/${user.uid}/settings`).doc('styleGuide');
        try {
            await settingsDocRef.set(newSettings, { merge: true });
            displayNotification('Settings saved successfully!');
            setCurrentView('dashboard');
        } catch (error) {
            console.error("Error saving settings:", error);
            displayNotification(`Error: ${error.message}`);
        }
    };
    
    const handleShowDeleteConfirm = (project) => {
        setProjectToDelete(project);
    };
    
    const handleConfirmDelete = async (projectId) => {
        if (!user || !projectId) return;

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
The user has provided the following data:
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
            const apiKey = settings.geminiApiKey || "";
            if (!apiKey) throw new Error("Please set your Gemini API Key in Settings.");
            
            const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } };
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
            const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!response.ok) { const err = await response.json(); throw new Error(err?.error?.message || 'API Error'); }
            
            const result = await response.json();
            const parsedJson = JSON.parse(result.candidates[0].content.parts[0].text);
            
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
        switch (currentView) {
            case 'project':
                return <ProjectView project={selectedProject} userId={user.uid} onBack={handleBackToDashboard} settings={settings} />;
            case 'settings':
                return <SettingsView settings={settings} onSave={handleSaveSettings} onBack={handleBackToDashboard} />;
            case 'myStudio':
                return <MyStudioView settings={settings} onSave={handleSaveSettings} onBack={handleBackToDashboard} />;
            case 'importProject':
                return <ImportProjectView onAnalyze={handleAnalyzeImportedProject} onBack={handleBackToDashboard} isLoading={isLoading} />;
            default:
                return <Dashboard 
                            userId={user.uid} 
                            onSelectProject={handleSelectProject} 
                            onShowSettings={handleShowSettings} 
                            onShowMyStudio={handleShowMyStudio} 
                            onShowProjectSelection={() => setShowProjectSelection(true)}
                            onShowDeleteConfirm={handleShowDeleteConfirm}
                        />;
        }
    }

    return (
        <div className="min-h-screen bg-gray-900">
            {showNotification && (<div className="fixed top-5 right-5 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">{notificationMessage}</div>)}
            {showNewProjectWizard && <NewProjectWizard userId={user.uid} settings={settings} onClose={() => { setShowNewProjectWizard(false); setProjectDraft(null); }} googleMapsLoaded={googleMapsLoaded} initialDraft={projectDraft} />}
            {projectToDelete && <DeleteConfirmationModal project={projectToDelete} onConfirm={handleConfirmDelete} onCancel={() => setProjectToDelete(null)} />}
            {showProjectSelection && <ProjectSelection onSelectWorkflow={handleSelectWorkflow} onClose={() => setShowProjectSelection(false)} />}
            <main>
                {!isAuthReady
                    ? <div className="min-h-screen flex justify-center items-center"><LoadingSpinner text="Initializing..." /></div>
                    : !user
                        ? <LoginScreen onLogin={handleLogin} />
                        : renderView()
                }
            </main>
        </div>
    );
}

const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);
root.render(<App />);
