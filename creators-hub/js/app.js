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
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,marker&v=beta&callback=initMap`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
};


window.App = () => { // Exposing App component globally
    const { useState, useEffect, useCallback } = React;
    const [user, setUser] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [currentView, setCurrentView] = useState('dashboard');
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
const [taskQueue, setTaskQueue] = useState([]);
const [isTaskQueueProcessing, setIsTaskQueueProcessing] = useState(false);
const [showPublisherModal, setShowPublisherModal] = useState(false);
const [ideasToPublish, setIdeasToPublish] = useState([]);
const [contentToView, setContentToView] = useState(null); // For viewing generated content
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

    // --- START: New Unified Task Queue Engine ---

const addTask = useCallback((task) => {
    setTaskQueue(prevQueue => {
        // Avoid adding duplicate tasks
        if (prevQueue.some(t => t.id === task.id)) {
            console.log(`Task ${task.id} is already in the queue.`);
            return prevQueue;
        }
        return [...prevQueue, task];
    });
}, []);

const updateTaskStatus = (taskId, status, result = null) => {
    setTaskQueue(prevQueue => prevQueue.map(task => {
        if (task.id === taskId) {
            return { ...task, status, result };
        }
        return task;
    }));
};

useEffect(() => {
    const processTaskQueue = async () => {
        if (isTaskQueueProcessing) return;

        const nextTask = taskQueue.find(t => t.status === 'pending');
        if (!nextTask) {
            // Optional: Clear completed tasks after a delay
            if (taskQueue.length > 0 && taskQueue.every(t => t.status === 'completed' || t.status === 'failed')) {
                setTimeout(() => setTaskQueue([]), 15000);
            }
            return;
        }

        setIsTaskQueueProcessing(true);
        updateTaskStatus(nextTask.id, 'in-progress');

        try {
            let result;
            switch (nextTask.type) {
                case 'generateBlogContent':
                    result = await executeGenerateBlogContent(nextTask.data);
                    break;
                case 'publishToWordPress':
                    result = await executePublishToWordPress(nextTask.data);
                    break;
            }
            updateTaskStatus(nextTask.id, 'completed', result);
        } catch (error) {
            console.error(`Task ${nextTask.id} failed:`, error);
            updateTaskStatus(nextTask.id, 'failed', { error: error.message });
        } finally {
            setIsTaskQueueProcessing(false);
        }
    };

    processTaskQueue();
}, [taskQueue, isTaskQueueProcessing]); // Reruns whenever the queue changes or a task finishes

const executeGenerateBlogContent = async (data) => {
    const { ideaId } = data;
    if (!user || !firebaseDb) throw new Error("User or database not available.");

    const ideaRef = firebaseDb.collection(`artifacts/<span class="math-inline">\{APP\_ID\}/users/</span>{user.uid}/blogIdeas`).doc(ideaId);

    await ideaRef.update({ status: 'generating', generationError: null });

    const ideaSnap = await ideaRef.get();
    const idea = ideaSnap.data();

    const blogPostContent = await window.aiUtils.generateBlogPostContentAI({
        idea: idea,
        coreSeoEngine: settings.knowledgeBases.blog.coreSeoEngine,
        monetizationGoals: settings.knowledgeBases.blog.monetizationGoals,
        settings: settings
    });

    await ideaRef.update({
        status: 'generated',
        blogPostContent: blogPostContent,
        generationCompletedAt: new Date().toISOString()
    });

    return { content: blogPostContent, viewable: true };
};

const executePublishToWordPress = async (data) => {
    const { ideaId, categoryId } = data;
    if (!user || !firebaseDb) throw new Error("User or database not available.");

    const ideaRef = firebaseDb.collection(`artifacts/<span class="math-inline">\{APP\_ID\}/users/</span>{user.uid}/blogIdeas`).doc(ideaId);

    await ideaRef.update({ status: 'publishing', generationError: null });

    const ideaSnap = await ideaRef.get();
    const idea = ideaSnap.data();

    // Step 1: Generate the full HTML for WordPress
    const htmlContent = await window.aiUtils.generateWordPressPostHTMLAI({
        idea: idea,
        settings: settings,
        tone: idea.tone || 'Informative'
    });

    // Step 2: Post to WordPress
    const wordpressConfig = settings.wordpress;
    if (!wordpressConfig.url || !wordpressConfig.username || !wordpressConfig.applicationPassword) {
        throw new Error("WordPress settings are not fully configured.");
    }

    const postData = {
        title: idea.title,
        htmlContent: htmlContent,
        excerpt: idea.blogPostContent ? idea.blogPostContent.substring(0, 250) + '...' : idea.description,
        categoryId: categoryId,
    };

    const response = await window.wordpressUtils.postToWordPress(postData, wordpressConfig);

    // Step 3: Update the idea in Firestore with the final status and WordPress link
    await ideaRef.update({
        status: 'published',
        wordpressId: response.id,
        wordpressLink: response.link,
        publishedAt: new Date().toISOString()
    });

    return { link: response.link };
};

// --- END: New Unified Task Queue Engine ---

    const handleGeneratePostTask = useCallback((idea) => {
    addTask({
        id: `generate-${idea.id}`,
        name: `Generating post: "${idea.title}"`,
        type: 'generateBlogContent',
        status: 'pending',
        data: { ideaId: idea.id }
    });
}, [addTask]);

const handlePublishPostsTask = useCallback((selectedIdeas, categoryId) => {
    selectedIdeas.forEach(idea => {
        addTask({
            id: `publish-${idea.id}`,
            name: `Publishing: "${idea.title}"`,
            type: 'publishToWordPress',
            status: 'pending',
            data: { ideaId: idea.id, categoryId: categoryId }
        });
    });
    setShowPublisherModal(false);
    setIdeasToPublish([]);
}, [addTask]);

const handleOpenPublisher = useCallback((selectedIdeas) => {
    setIdeasToPublish(selectedIdeas);
    setShowPublisherModal(true);
}, []);

const handleViewGeneratedPost = useCallback(async (taskId) => {
    const task = taskQueue.find(t => t.id === taskId);
    if (task && task.result && task.result.content) {
        setContentToView(task.result.content);
        return;
    }
    // Fallback for viewing content not in the current queue (from a previous session)
    const ideaId = taskId.replace('generate-', '');
    const ideaRef = firebaseDb.collection(`artifacts/<span class="math-inline">\{APP\_ID\}/users/</span>{user.uid}/blogIdeas`).doc(ideaId);
    const doc = await ideaRef.get();
    if (doc.exists && doc.data().blogPostContent) {
        setContentToView(doc.data().blogPostContent);
    } else {
        displayNotification("Could not find generated content for this post.");
    }
}, [taskQueue, user, firebaseDb, APP_ID]);


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
const handleShowStyleAndTone = () => {
    setPreviousView(currentView);
    setCurrentView('myStudio');
};
    const handleShowKnowledgeBases = () => setCurrentView('knowledgeBases');
const handleNavigate = (view) => {
    setPreviousView(currentView);
    setCurrentView(view);
};
const handleSaveSettings = async (updatedSettingsObject) => {
    if (!user || !firebaseDb) return;

    const settingsDocRef = firebaseDb.collection(`artifacts/${APP_ID}/users/${user.uid}/settings`).doc('styleGuide');

    try {
        // Use .set() with { merge: true } to safely update the document in Firestore.
        // This updates only the fields in our object, creating the document if it doesn't exist.
        await settingsDocRef.set(updatedSettingsObject, { merge: true });

        // Update the application's local state with the newly saved data.
        setSettings(updatedSettingsObject);

        console.log('Settings successfully saved to Firestore.');

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
        // Pass new handlers
        onGeneratePost={handleGeneratePostTask}
        onPublishPosts={handleOpenPublisher}
        taskQueue={taskQueue} // Pass the queue to show status
        onViewPost={handleViewGeneratedPost}
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
        <div className="min-h-screen bg-gray-900 text-white"> 
            {appError && <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50">{appError}</div>}
            {showNotification && <div className="fixed top-5 right-5 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">{notificationMessage}</div>}
            {showNewProjectWizard && user && <window.NewProjectWizard userId={user.uid} settings={settings} onClose={handleCloseWizard} googleMapsLoaded={googleMapsLoaded} initialDraft={activeProjectDraft} draftId={activeDraftId} db={firebaseDb} auth={firebaseAuth} firebaseAppInstance={firebaseAppInstance}/>}
            {projectToDelete && <window.DeleteConfirmationModal project={projectToDelete} onConfirm={handleConfirmDelete} onCancel={() => setProjectToDelete(null)} />}
            {draftToDelete && <window.DeleteConfirmationModal project={{id: draftToDelete, playlistTitle: 'this draft'}} onConfirm={() => handleConfirmDeleteDraft(draftToDelete)} onCancel={() => setDraftToDelete(null)} />}
            {showProjectSelection && <window.ProjectSelection onSelectWorkflow={handleSelectWorkflow} onClose={() => setShowProjectSelection(false)} userId={user.uid} onResumeDraft={handleResumeDraft} onDeleteDraft={handleShowDeleteDraftConfirm} db={firebaseDb} auth={firebaseAuth} />}
            {showPublisherModal && (
    <window.WordpressPublisher
        ideas={ideasToPublish}
        settings={settings}
        onPublish={handlePublishPostsTask}
        onCancel={() => setShowPublisherModal(false)}
    />
)}
{contentToView && (
    <window.GeneratedPostViewer
        content={contentToView}
        onClose={() => setContentToView(null)}
    />
)}
<window.TaskQueue tasks={taskQueue} onView={handleViewGeneratedPost} />
                <main className="p-4 sm:p-6 lg:p-8">{renderView()}</main>
        </div>
    );
}

const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);
root.render(<App />);
