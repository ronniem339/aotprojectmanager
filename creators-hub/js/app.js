// creators-hub/js/app.js

const App = () => {
    const [user, setUser] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [currentView, setCurrentView] = React.useState('dashboard'); // e.g., 'dashboard', 'project', 'settings'
    const [selectedProject, setSelectedProject] = React.useState(null);
    const [projects, setProjects] = React.useState([]);
    const [settings, setSettings] = React.useState({});
     const [isNewProjectWizardOpen, setNewProjectWizardOpen] = React.useState(false);

    // Initial listener for auth state changes
    React.useEffect(() => {
        const unsubscribe = firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                setUser(user);
                try {
                    // Load user-specific data (projects, settings) from Firestore
                    const userDocRef = firebase.firestore().collection('users').doc(user.uid);
                    
                    // Load Projects
                    const projectsRef = userDocRef.collection('projects');
                    const projectsSnapshot = await projectsRef.get();
                    const projectsData = projectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setProjects(projectsData);

                    // Load Settings
                    const settingsDoc = await userDocRef.get();
                    if (settingsDoc.exists) {
                        setSettings(settingsDoc.data().settings || {});
                    }
                } catch (error) {
                    console.error("Error fetching user data from Firestore:", error);
                    console.error("This is likely a Firestore security rules issue. Please ensure the rules allow authenticated users to read from their own documents in the 'users' collection.");
                    // Clear any potentially stale data
                    setProjects([]);
                    setSettings({});
                }

            } else {
                // No user is signed in
                setUser(null);
                setProjects([]);
                setSettings({});
            }
            // This is critical: ensure we always stop loading, even if there's an error.
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleSignOut = () => {
        firebase.auth().signOut().then(() => {
            setUser(null);
            setCurrentView('dashboard');
            setSelectedProject(null);
        });
    };
    
    const handleSaveSettings = async (newSettings) => {
        if (user) {
            const userDocRef = firebase.firestore().collection('users').doc(user.uid);
            await userDocRef.set({ settings: newSettings }, { merge: true });
            setSettings(newSettings);
            alert('Settings saved!');
        }
    };

    const handleSelectProject = (projectId) => {
        const project = projects.find(p => p.id === projectId);
        setSelectedProject(project);
        setCurrentView('project');
    };
    
    const handleCreateProject = async (projectData) => {
        if (user) {
            const projectsRef = firebase.firestore().collection('users').doc(user.uid).collection('projects');
            const newProjectRef = await projectsRef.add(projectData);
            const newProject = { id: newProjectRef.id, ...projectData };
            setProjects([...projects, newProject]);
            handleSelectProject(newProject.id); // Select the new project
            setNewProjectWizardOpen(false); // Close the wizard
        }
    };
    
    const handleUpdateProject = (updatedProject) => {
        if (user && selectedProject) {
            const projectRef = firebase.firestore().collection('users').doc(user.uid).collection('projects').doc(selectedProject.id);
            projectRef.update(updatedProject);
            
            const updatedProjects = projects.map(p => p.id === selectedProject.id ? {...p, ...updatedProject} : p);
            setProjects(updatedProjects);
            setSelectedProject({...selectedProject, ...updatedProject});
        }
    };


    if (loading) {
        return React.createElement('div', null, 'Loading...');
    }
    
    const renderView = () => {
        if (!user) {
            // Simple sign-in UI
            return React.createElement('div', { className: 'auth-container' },
                React.createElement('h1', null, 'Creator\'s Hub'),
                React.createElement('p', null, 'Please sign in to continue.'),
                React.createElement('div', { id: 'firebaseui-auth-container' })
            );
        }

        switch (currentView) {
            case 'project':
                return React.createElement(ProjectView, { 
                    project: selectedProject, 
                    onBack: () => setCurrentView('dashboard'),
                    onUpdateProject: handleUpdateProject,
                    settings: settings,
                });
            case 'settings':
                return React.createElement(SettingsMenu, { 
                    onSave: handleSaveSettings,
                    initialSettings: settings,
                    onBack: () => setCurrentView('dashboard') 
                });
            case 'tools':
                return React.createElement(ToolsView, {
                    onNavigate: setCurrentView
                });
            case 'my-studio':
                 return React.createElement(MyStudioView, { projects: projects, onSelectProject: handleSelectProject, onNewProject: () => setNewProjectWizardOpen(true) });
            case 'content-library':
                return React.createElement(ContentLibrary, {});
            case 'import-project':
                return React.createElement(ImportProjectView, { onProjectCreated: handleCreateProject });
            case 'knowledge-base':
                return React.createElement(KnowledgeBaseView, { settings: settings });
            case 'dashboard':
            default:
                return React.createElement(Dashboard, {
                    onNavigate: setCurrentView,
                    projects: projects,
                    onSelectProject: handleSelectProject,
                    onNewProject: () => setNewProjectWizardOpen(true)
                });
        }
    };

    return React.createElement('div', { className: 'app-container' },
        user && React.createElement('header', { className: 'app-header' },
            React.createElement('h1', { onClick: () => setCurrentView('dashboard'), style: { cursor: 'pointer'} }, 'Creator\'s Hub'),
            React.createElement('nav', null,
                React.createElement('button', { onClick: () => setCurrentView('dashboard') }, 'Dashboard'),
                React.createElement('button', { onClick: () => setCurrentView('my-studio') }, 'My Studio'),
                React.createElement('button', { onClick: () => setCurrentView('tools') }, 'Tools'),
                React.createElement('button', { onClick: () => setCurrentView('content-library') }, 'Library'),
                React.createElement('button', { onClick: () => setCurrentView('knowledge-base') }, 'Knowledge Base'),
                React.createElement('button', { onClick: () => setCurrentView('settings') }, React.createElement('i', { className: 'fas fa-cog' })),
                React.createElement('button', { onClick: handleSignOut }, 'Sign Out')
            )
        ),
        React.createElement('main', null, renderView()),
        isNewProjectWizardOpen && React.createElement(NewProjectWizard, {
            onClose: () => setNewProjectWizardOpen(false),
            onCreateProject: handleCreateProject,
            settings: settings
        })
    );
};


// Use the legacy `ReactDOM.render` method for React 17
const container = document.getElementById('root');
ReactDOM.render(
    React.createElement(React.StrictMode, null, React.createElement(App)),
    container
);
