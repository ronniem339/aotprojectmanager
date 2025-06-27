const { useState, useEffect, useCallback } = React;

window.useAppState = () => {
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
        useProModelForComplexTasks: false,
        flashModelName: 'gemini-1.5-flash-latest',
        proModelName: 'gemini-1.5-pro-latest',
        knowledgeBases: {
            youtube: {
                whoAmI: '', videoTitles: '', videoDescriptions: '', thumbnailIdeas: '', videoTags: '',
                firstPinnedCommentExpert: '', shortsIdeaGeneration: '', youtubeSeoKnowledgeBase: window.CREATOR_HUB_CONFIG.YOUTUBE_SEO_KNOWLEDGE_BASE,
            },
            blog: {
                coreSeoEngine: '', ideaGeneration: '',
                destinationGuideBlueprint: '', listiclePostFramework: '',
            },
            storytelling: {
                videoStorytellingPrinciples: '',
            },
            creator: {
                styleGuideText: '',
                styleGuideLog: []
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

    const [taskQueue, setTaskQueue] = useState([]);
    const [isTaskQueueProcessing, setIsTaskQueueProcessing] = useState(false);
    const [showPublisherModal, setShowPublisherModal] = useState(false);
    const [ideasToPublish, setIdeasToPublish] = useState([]);
    const [contentToView, setContentToView] = useState(null);

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
                        // Reset state on logout
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
                    geminiApiKey: '', googleMapsApiKey: '', youtubeApiKey: '',
                    myWriting: '', admiredWriting: '', keywords: '', dosAndDonts: '', excludedPhrases: '',
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
                        storytelling: {
                           videoStorytellingPrinciples: '',
                        },
                        creator: {
                            styleGuideText: '',
                            styleGuideLog: []
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
                    storytelling: { ...defaultSettings.knowledgeBases.storytelling, ...data.knowledgeBases?.storytelling },
                    creator: { ...defaultSettings.knowledgeBases.creator, ...data.knowledgeBases?.creator }
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
    
    useEffect(() => {
        const processTaskQueue = async () => {
            if (isTaskQueueProcessing || taskQueue.length === 0) {
                return;
            }
            setIsTaskQueueProcessing(true);
            const task = taskQueue[0];
            if (task.status === 'queued') {
                if (task.type === 'generate-post') {
                    await handlers.executeGenerateBlogContent(task);
                } else if (task.type === 'publish-post') {
                    await handlers.executePublishToWordPress(task);
                }
                // Future task types can be handled here
            }
            // Remove the processed task from the queue
            setTaskQueue(prevQueue => prevQueue.slice(1));
            setIsTaskQueueProcessing(false);
        };
        processTaskQueue();
    }, [taskQueue, isTaskQueueProcessing]);

    // All handler functions are defined here...
    const handlers = {
        handleSelectProject: (project) => {
            setSelectedProject(project);
            setCurrentView('project');
        },
        handleBackToDashboard: () => {
            setSelectedProject(null);
            setCurrentView('dashboard');
        },
        handleNavigateBack: () => {
            setCurrentView(previousView);
        },
        handleNavigate: (view) => {
            setPreviousView(currentView);
            setCurrentView(view);
        },
        handleShowSettings: () => setCurrentView('settingsMenu'),
        handleShowTools: () => setCurrentView('tools'),
        handleSelectTool: (toolId) => {
             if (toolId === 'blog') setCurrentView('blogTool');
             if (toolId === 'shorts') setCurrentView('shortsTool');
             if (toolId === 'contentLibrary') setCurrentView('contentLibrary');
        },
        handleShowTechnicalSettings: () => setCurrentView('technicalSettings'),
        handleShowStyleAndTone: () => {
             setPreviousView(currentView);
             setCurrentView('myStudio');
        },
        handleShowKnowledgeBases: () => setCurrentView('knowledgeBases'),
        handleSaveSettings: async (updatedSettingsObject) => {
            if (!user || !firebaseDb) return;
            const settingsDocRef = firebaseDb.collection(`artifacts/${APP_ID}/users/${user.uid}/settings`).doc('styleGuide');
            try {
                await settingsDocRef.set(updatedSettingsObject, { merge: true });
                setSettings(updatedSettingsObject);
            } catch (error) {
                console.error('A critical error occurred while saving settings:', error);
                handlers.displayNotification('There was a critical error saving your style guide. Please try again.');
            }
        },
        handleShowDeleteConfirm: (project) => setProjectToDelete(project),
        handleConfirmDelete: async (projectId) => {
            if (!user || !firebaseDb) return;
            const projectRef = firebaseDb.collection(`artifacts/${APP_ID}/users/${user.uid}/projects`).doc(projectId);
            const videosCollectionRef = projectRef.collection('videos');
            try {
                const videoSnapshot = await videosCollectionRef.get();
                const batch = firebaseDb.batch();
                videoSnapshot.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
                await projectRef.delete();
                handlers.displayNotification('Project deleted successfully.');
                setProjectToDelete(null);
            } catch (error) {
                console.error("Error deleting project:", error);
                handlers.displayNotification(`Error: ${error.message}`);
            }
        },
        handleShowDeleteDraftConfirm: (draftId) => setDraftToDelete(draftId),
        handleConfirmDeleteDraft: async (draftId) => {
            if (!user || !firebaseDb) return;
            try {
                await firebaseDb.collection(`artifacts/${APP_ID}/users/${user.uid}/wizards`).doc(draftId).delete();
                handlers.displayNotification('Draft deleted successfully.');
                setDraftToDelete(null);
            } catch (error) {
                console.error("Error deleting draft:", error);
                handlers.displayNotification(`Error: ${error.message}`);
            }
        },
        handleResumeDraft: async (draftId) => {
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
                    handlers.displayNotification("Error: Draft not found.");
                }
            } catch (error) {
                console.error("Error resuming draft:", error);
                handlers.displayNotification(`Error: ${error.message}`);
            }
        },
        handleSelectWorkflow: async (type) => {
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
        },
        handleAnalyzeImportedProject: async (projectData) => {
            setIsLoading(true);
            // ... (rest of the logic from original app.js)
            setIsLoading(false);
        },
        handleCloseWizard: () => {
            setShowNewProjectWizard(false);
            setActiveProjectDraft(null);
            setActiveDraftId(null);
        },
        displayNotification: (message) => {
            setNotificationMessage(message);
            setShowNotification(true);
            setTimeout(() => setShowNotification(false), 3000);
        },
        addTask: useCallback((task) => {
            setTaskQueue(prevQueue => {
                if (prevQueue.some(t => t.id === task.id)) {
                    return prevQueue;
                }
                return [...prevQueue, task];
            });
        }, []),
        updateTaskStatus: (taskId, status, result = null) => {
            setTaskQueue(prevQueue => prevQueue.map(task => {
                if (task.id === taskId) {
                    return { ...task, status, result };
                }
                return task;
            }));
        },
        // Placeholder for task execution logic
        executeGenerateBlogContent: async (task) => {
            const { idea, video } = task.data;
            try {
                handlers.updateTaskStatus(task.id, 'generating');
                const result = await window.aiUtils.generateBlogPostContentAI(idea, settings, video);
                handlers.updateTaskStatus(task.id, 'complete', result);
                // Also update the idea in Firestore
                const ideaRef = firebaseDb.collection(`artifacts/${APP_ID}/users/${user.uid}/blogIdeas`).doc(idea.id);
                await ideaRef.update({ status: 'generated', blogPostContent: result.blogPostContent });
            } catch (error) {
                console.error("Error executing generate blog content task:", error);
                handlers.updateTaskStatus(task.id, 'failed', { error: error.message });
                const ideaRef = firebaseDb.collection(`artifacts/${APP_ID}/users/${user.uid}/blogIdeas`).doc(idea.id);
                await ideaRef.update({ status: 'failed' });
            }
        },
        executePublishToWordPress: async (task) => {
            const { idea } = task.data;
            try {
                handlers.updateTaskStatus(task.id, 'publishing');
                const wordpressConfig = settings.wordpress;

                if (!wordpressConfig || !wordpressConfig.url || !wordpressConfig.username || !wordpressConfig.applicationPassword) {
                    throw new Error('WordPress settings are not fully configured. Please check your settings.');
                }

                const postData = {
                    title: idea.title,
                    htmlContent: idea.blogPostContent,
                    excerpt: idea.description,
                    // categoryId: idea.categoryId, // Assuming categoryId might be part of the idea if selected
                    // tags: idea.tags // Assuming tags might be part of the idea
                };

                const result = await window.wordpressUtils.postToWordPress(postData, wordpressConfig);
                handlers.updateTaskStatus(task.id, 'complete', result);
                const ideaRef = firebaseDb.collection(`artifacts/${APP_ID}/users/${user.uid}/blogIdeas`).doc(idea.id);
                await ideaRef.update({ status: 'published' });
                handlers.displayNotification(`Successfully published "${idea.title}" to WordPress!`, 'success');
            } catch (error) {
                console.error("Error executing publish to WordPress task:", error);
                handlers.updateTaskStatus(task.id, 'failed', { error: error.message });
                const ideaRef = firebaseDb.collection(`artifacts/${APP_ID}/users/${user.uid}/blogIdeas`).doc(idea.id);
                await ideaRef.update({ status: 'failed' });
                handlers.displayNotification(`Failed to publish "${idea.title}": ${error.message}`, 'error');
            }
        },
        handleGeneratePostTask: async (idea) => {
            if (!user || !firebaseDb) return;
            const { relatedProjectId, relatedVideoId } = idea;
            let video = null;
            if (relatedProjectId && relatedVideoId) {
                const videoRef = firebaseDb.collection(`artifacts/${APP_ID}/users/${user.uid}/projects/${relatedProjectId}/videos`).doc(relatedVideoId);
                const videoSnap = await videoRef.get();
                if (videoSnap.exists) {
                    video = videoSnap.data();
                }
            }
            const task = {
                id: `generate-post-${idea.id}`,
                type: 'generate-post',
                status: 'queued',
                data: { idea, video },
                createdAt: new Date(),
            };
            handlers.addTask(task);
        },
        handlePublishPostsTask: (ideas) => {
            if (!user || !firebaseDb) return;
            ideas.forEach(idea => {
                const task = {
                    id: `publish-post-${idea.id}`,
                    type: 'publish-post',
                    status: 'queued',
                    data: { idea },
                    createdAt: new Date(),
                };
                handlers.addTask(task);
            });
            handlers.setShowPublisherModal(false);
        },
                handleViewGeneratedPost: (idea) => {
            if (idea && idea.blogPostContent) {
                setContentToView(idea.blogPostContent);
            } else {
                const taskId = `generate-post-${idea.id}`;
                const task = taskQueue.find(t => t.id === taskId);
                if (task && task.status === 'complete' && task.result) {
                    setContentToView(task.result.blogPostContent);
                } else {
                    displayNotification('Content not available yet or an error occurred.', 'info');
                }
            }
        },
        setProjectToDelete,
        setDraftToDelete,
        setShowProjectSelection,
        setShowPublisherModal,
        setContentToView,
    };

    return {
        user,
        isAuthReady,
        currentView,
        previousView,
        selectedProject,
        settings,
        googleMapsLoaded,
        activeProjectDraft,
        activeDraftId,
        showNotification,
        notificationMessage,
        showNewProjectWizard,
        projectToDelete,
        draftToDelete,
        showProjectSelection,
        isLoading,
        appError,
        firebaseAppInstance,
        firebaseDb,
        firebaseAuth,
        taskQueue,
        isTaskQueueProcessing,
        showPublisherModal,
        ideasToPublish,
        contentToView,
        handlers,
    };
};