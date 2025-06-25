window.components = window.components || {};

const { LoadingSpinner, LoginScreen, ProjectView, SettingsMenu, TechnicalSettingsView, MyStudioView, ImportProjectView, KnowledgeBaseView, ToolsView, BlogTool, ShortsTool, ContentLibrary, Dashboard } = window;

window.components.Router = ({
    currentView,
    isAuthReady,
    firebaseDb,
    firebaseAuth,
    user,
    // Props for Dashboard
    onSelectProject,
    onShowSettings,
    onShowProjectSelection,
    onShowDeleteConfirm,
    onShowTools,
    // Props for ProjectView
    selectedProject,
    handleBackToDashboard,
    settings,
    handleSaveSettings,
    googleMapsLoaded,
    firebaseAppInstance,
    handleNavigate,
    // Props for Settings
    handleShowTechnicalSettings,
    handleShowStyleAndTone,
    handleShowKnowledgeBases,
    handleNavigateBack,
    previousView,
    // Props for Import
    handleAnalyzeImportedProject,
    isLoading,
    // Props for Tools
    handleSelectTool,
    // Props for BlogTool
    handleGeneratePostTask,
    handleOpenPublisher,
    taskQueue,
    handleViewGeneratedPost
}) => {
    if (!isAuthReady || !firebaseDb || !firebaseAuth) {
        return <div className="min-h-screen flex justify-center items-center"><LoadingSpinner text="Initializing application..." /></div>;
    }

    if (!user) {
        return <LoginScreen onLogin={() => { }} firebaseAuth={firebaseAuth} />;
    }

    switch (currentView) {
        case 'project':
            return <ProjectView project={selectedProject} userId={user.uid} onCloseProject={handleBackToDashboard} settings={settings} onUpdateSettings={handleSaveSettings} googleMapsLoaded={googleMapsLoaded} db={firebaseDb} auth={firebaseAuth} firebaseAppInstance={firebaseAppInstance} onNavigate={handleNavigate} />;
        case 'settingsMenu':
            return <SettingsMenu onBack={handleBackToDashboard} onShowTechnicalSettings={handleShowTechnicalSettings} onShowStyleAndTone={handleShowStyleAndTone} onShowKnowledgeBases={handleShowKnowledgeBases} />;
        case 'technicalSettings':
            return <TechnicalSettingsView settings={settings} onSave={handleSaveSettings} onBack={handleShowSettings} />;
        case 'myStudio':
            return <MyStudioView settings={settings} onSave={handleSaveSettings} onBack={handleNavigateBack} previousView={previousView} />;
        case 'importProject':
            return <ImportProjectView onAnalyze={handleAnalyzeImportedProject} onBack={handleBackToDashboard} isLoading={isLoading} settings={settings} firebaseDb={firebaseDb} firebaseAppInstance={firebaseAppInstance} />;
        case 'knowledgeBases':
            return <KnowledgeBaseView settings={settings} onSave={handleSaveSettings} onBack={handleShowSettings} />;
        case 'tools':
            return <ToolsView onBack={handleBackToDashboard} onSelectTool={handleSelectTool} />;
        case 'blogTool':
            if (!user || !user.uid || !firebaseDb) {
                return <div className="h-screen flex justify-center items-center"><LoadingSpinner text="Loading User Data..."/></div>;
            }
            return <BlogTool
                settings={settings}
                onBack={() => handleNavigate('tools')}
                onNavigateToSettings={() => handleNavigate('technicalSettings')}
                userId={user.uid}
                db={firebaseDb}
                onGeneratePost={handleGeneratePostTask}
                onPublishPosts={handleOpenPublisher}
                taskQueue={taskQueue}
                onViewPost={handleViewGeneratedPost}
            />;
        case 'shortsTool':
            return <ShortsTool settings={settings} onBack={() => handleNavigate('tools')} userId={user.uid} db={firebaseDb} />;
        case 'contentLibrary':
            return <ContentLibrary onBack={() => handleNavigate('tools')} userId={user.uid} db={firebaseDb} />;
        default:
            return <Dashboard userId={user.uid} onSelectProject={onSelectProject} onShowSettings={onShowSettings} onShowProjectSelection={onShowProjectSelection} onShowDeleteConfirm={onShowDeleteConfirm} onShowTools={onShowTools} db={firebaseDb} auth={firebaseAuth} />;
    }
};
