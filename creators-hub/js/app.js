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

    const handleImportProject = async (projectData) => {
        if (!user) return;
        
        try {
            const searchTerm = projectData.playlistTitle || 'abstract';
            const thumbnailUrl = `https://source.unsplash.com/600x400/?${encodeURIComponent(searchTerm)}`;
            
            const batch = db.batch();
            const projectRef = db.collection(`artifacts/${APP_ID}/users/${user.uid}/projects`).doc();
            
            batch.set(projectRef, {
                playlistTitle: projectData.playlistTitle,
                playlistDescription: projectData.playlistDescription,
                thumbnailUrl: thumbnailUrl,
                locations: [], // Imported projects won't have map locations initially
                createdAt: new Date().toISOString()
            });

            projectData.videos.forEach((video) => {
                const videoRef = projectRef.collection('videos').doc();
                batch.set(videoRef, { 
                    title: video.title, 
                    concept: video.concept, 
                    script: video.script, 
                    metadata: '', 
                    blogPost: '', 
                    shortsIdeas: '', 
                    createdAt: new Date().toISOString() 
                });
            });

            await batch.commit();
            displayNotification('Project imported successfully!');
            setCurrentView('dashboard');

        } catch (e) {
            console.error("Error importing project:", e);
            displayNotification(`Error importing project: ${e.message}`);
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
                return <ImportProjectView onImport={handleImportProject} onBack={handleBackToDashboard} />;
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
            {showNewProjectWizard && <NewProjectWizard userId={user.uid} settings={settings} onClose={() => setShowNewProjectWizard(false)} googleMapsLoaded={googleMapsLoaded} initialDraft={projectDraft} />}
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
