window.components = window.components || {};

const { LoadingSpinner, LoginScreen, ProjectView, SettingsMenu, TechnicalSettingsView, MyStudioView, ImportProjectView, KnowledgeBaseView, ToolsView, BlogTool, ShortsTool, ContentLibrary, Dashboard } = window;

window.components.Router = (props) => {
    const {
        currentView,
        isAuthReady,
        firebaseDb,
        firebaseAuth,
        user,
        onSelectProject,
        onShowSettings,
        onShowProjectSelection,
        onShowDeleteConfirm,
        onShowTools,
        selectedProject,
        handleBackToDashboard,
        settings,
        handleSaveSettings,
        googleMapsLoaded,
        firebaseAppInstance,
        handleNavigate,
        handleShowTechnicalSettings,
        handleShowStyleAndTone,
        handleShowKnowledgeBases,
        handleNavigateBack,
        previousView,
        handleAnalyzeImportedProject,
        isLoading,
        handleSelectTool,
        handleGeneratePostTask,
        handleOpenPublisher,
        taskQueue,
        handleViewGeneratedPost,
        displayNotification
    } = props;
    if (!isAuthReady || !firebaseDb || !firebaseAuth) {
        return <div className="min-h-screen flex justify-center items-center"><LoadingSpinner text="Initializing application..." /></div>;
    }

    if (!user) {
        return <LoginScreen onLogin={() => { }} firebaseAuth={firebaseAuth} />;
    }

    switch (currentView) {
        case 'project':
            return <ProjectView {...props} />;
        case 'settingsMenu':
            return <SettingsMenu {...props} />;
        case 'technicalSettings':
            return <TechnicalSettingsView {...props} />;
        case 'myStudio':
            return <MyStudioView {...props} />;
        case 'importProject':
            return <ImportProjectView {...props} />;
        case 'knowledgeBases':
            return <KnowledgeBaseView {...props} />;
        case 'tools':
            return <ToolsView {...props} />;
        case 'blogTool':
            if (!user || !user.uid || !firebaseDb) {
                return <div className="h-screen flex justify-center items-center"><LoadingSpinner text="Loading User Data..."/></div>;
            }
            return <BlogTool {...props} />;
        case 'shortsTool':
            return <ShortsTool settings={settings} onBack={() => handleNavigate('tools')} userId={user.uid} db={firebaseDb} />;
        case 'contentLibrary':
            return <ContentLibrary onBack={() => handleNavigate('tools')} userId={user.uid} db={firebaseDb} />;
        default:
            return <Dashboard {...props} />;
    }
};
