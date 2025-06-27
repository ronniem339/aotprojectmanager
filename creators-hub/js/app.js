const { useState, useEffect, useCallback } = React;

// Correctly import components from their actual locations
const { Router } = window.components; // This one is on window.components
const {
    NewProjectWizard,
    DeleteConfirmationModal,
    ProjectSelection,
    WordpressPublisher,
    GeneratedPostViewer,
    TaskQueue,
    LoadingSpinner,
    ImageComponent,
    LoginScreen,
    LocationSearchInput,
    MockLocationSearchInput,
    CopyButton,
    CanvaModal,
    Accordion
} = window;

// The main App component is now much cleaner.
window.App = () => {
    // All state and handlers are managed within the useAppState hook.
    const {
        user,
        isAuthReady,
        currentView,
        selectedProject,
        settings,
        googleMapsLoaded,
        showNewProjectWizard,
        projectToDelete,
        draftToDelete,
        showProjectSelection,
        isLoading,
        appError,
        showNotification,
        notificationMessage,
        taskQueue,
        showPublisherModal,
        ideasToPublish,
        contentToView,
        firebaseAppInstance,
        firebaseDb,
        firebaseAuth,
        previousView,
        activeProjectDraft,
        activeDraftId,
        handlers,
    } = useAppState(); // Custom hook to manage all app logic

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            {appError && <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50">{appError}</div>}
            {showNotification && <div className="fixed top-5 right-5 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">{notificationMessage}</div>}

            {/* Modals are managed here at the top level */}
            {showNewProjectWizard && user && <NewProjectWizard userId={user.uid} settings={settings} onClose={handlers.handleCloseWizard} googleMapsLoaded={googleMapsLoaded} initialDraft={activeProjectDraft} draftId={activeDraftId} db={firebaseDb} auth={firebaseAuth} firebaseAppInstance={firebaseAppInstance} />}
            {projectToDelete && <DeleteConfirmationModal project={projectToDelete} onConfirm={handlers.handleConfirmDelete} onCancel={() => handlers.setProjectToDelete(null)} />}
            {draftToDelete && <DeleteConfirmationModal project={{ id: draftToDelete, playlistTitle: 'this draft' }} onConfirm={() => handlers.handleConfirmDeleteDraft(draftToDelete)} onCancel={() => handlers.setDraftToDelete(null)} />}
            {showProjectSelection && <ProjectSelection onSelectWorkflow={handlers.handleSelectWorkflow} onClose={() => handlers.setShowProjectSelection(false)} userId={user.uid} onResumeDraft={handlers.handleResumeDraft} onDeleteDraft={handlers.handleShowDeleteDraftConfirm} db={firebaseDb} auth={firebaseAuth} />}
            {showPublisherModal && (
                <WordpressPublisher
                    ideas={ideasToPublish}
                    settings={settings}
                    onPublish={handlers.handlePublishPostsTask}
                    onCancel={() => handlers.setShowPublisherModal(false)}
                />
            )}
            {contentToView && (
                <GeneratedPostViewer
                    content={contentToView}
                    onClose={() => handlers.setContentToView(null)}
                />
            )}
            
            <TaskQueue tasks={taskQueue} onView={handlers.handleViewGeneratedPost} />

            <main className="p-4 sm:p-6 lg:p-8">
                <Router
                    currentView={currentView}
                    isAuthReady={isAuthReady}
                    firebaseDb={firebaseDb}
                    firebaseAuth={firebaseAuth}
                    user={user}
                    onSelectProject={handlers.handleSelectProject}
                    onShowSettings={handlers.handleShowSettings}
                    onShowProjectSelection={() => handlers.setShowProjectSelection(true)}
                    onShowDeleteConfirm={handlers.handleShowDeleteConfirm}
                    onShowTools={handlers.handleShowTools}
                    selectedProject={selectedProject}
                    handleBackToDashboard={handlers.handleBackToDashboard}
                    settings={settings}
                    handleSaveSettings={handlers.handleSaveSettings}
                    googleMapsLoaded={googleMapsLoaded}
                    firebaseAppInstance={firebaseAppInstance}
                    handleNavigate={handlers.handleNavigate}
                    handleShowTechnicalSettings={handlers.handleShowTechnicalSettings}
                    handleShowStyleAndTone={handlers.handleShowStyleAndTone}
                    handleShowKnowledgeBases={handlers.handleShowKnowledgeBases}
                    handleNavigateBack={handlers.handleNavigateBack}
                    previousView={previousView}
                    handleAnalyzeImportedProject={handlers.handleAnalyzeImportedProject}
                    isLoading={isLoading}
                    handleSelectTool={handlers.handleSelectTool}
                    handleGeneratePostTask={handlers.handleGeneratePostTask}
                    handleOpenPublisher={handlers.handleOpenPublisher}
                    taskQueue={taskQueue}
                    handleViewGeneratedPost={handlers.handleViewGeneratedPost}
                    displayNotification={handlers.displayNotification}
                />
            </main>
        </div>
    );
}

const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);
root.render(<App />);
