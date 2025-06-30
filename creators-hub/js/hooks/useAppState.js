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

            // Process the first queued task
            const taskToProcess = taskQueue[0];
            if (taskToProcess && taskToProcess.status === 'queued') {
                setIsTaskQueueProcessing(true);
                if (taskToProcess.type === 'generate-post') {
                    await handlers.executeGenerateBlogContent(taskToProcess);
                } else if (taskToProcess.type === 'publish-post') {
                    await handlers.executePublishToWordPress(taskToProcess);
                }
                setIsTaskQueueProcessing(false);
            }
        };

        // Set a timer to periodically check and clean up the queue
        const cleanupInterval = setInterval(() => {
            setTaskQueue(prevQueue => {
                const now = Date.now();
                return prevQueue.filter(task => {
                    if ((task.status === 'complete' || task.status === 'failed') && task.completedAt) {
                        return (now - task.completedAt) < 120000; // Keep for 120 seconds (2 minutes)
                    }
                    return true; // Keep other tasks (queued, generating, publishing)
                });
            });
        }, 5000); // Check every 5 seconds

        processTaskQueue();

        return () => clearInterval(cleanupInterval); // Cleanup interval on unmount
    }, [taskQueue, isTaskQueueProcessing, handlers]);

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
                    let newName = task.name;
                    let newStatus = status;
                    let completedAt = task.completedAt;

                    if (status === 'complete' || status === 'failed') {
                        completedAt = Date.now();
                    }

                    if (task.type === 'generate-post') {
                        if (status === 'generating') {
                            newName = `Generating content for: ${task.data.idea.title} - ${result?.message || ''}`;
                        } else if (status === 'complete') {
                            newName = `Content generated for: ${task.data.idea.title}`;
                        } else if (status === 'failed') {
                            newName = `Failed to generate content for: ${task.data.idea.title}`;
                        }
                    } else if (task.type === 'publish-post') {
                        if (status === 'publishing') {
                            newName = `Publishing to WordPress: ${task.data.idea.title}`;
                        } else if (status === 'complete') {
                            newName = `Published to WordPress: ${task.data.idea.title}`;
                        } else if (status === 'failed') {
                            newName = `Failed to publish to WordPress: ${task.data.idea.title}`;
                        }
                    }
                    return { ...task, status: newStatus, result, name: newName, completedAt };
                }
                return task;
            }));
        },
        // Placeholder for task execution logic
        executeGenerateBlogContent: async (task) => {
            const { idea, video } = task.data;
            try {
                handlers.updateTaskStatus(task.id, 'generating');
                const result = await window.aiUtils.generateBlogPostContentAI(idea, settings, video, (progressMessage) => {
                    handlers.updateTaskStatus(task.id, 'generating', { message: progressMessage });
                });
                handlers.updateTaskStatus(task.id, 'complete', { ...result, viewable: true });
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
                handlers.updateTaskStatus(task.id, 'publishing', { message: 'Generating final HTML for WordPress...' });

                // Step 1: Generate the final HTML content and metadata using the AI function
                // **FIX:** Added the 'tone' parameter to the function call
                const { htmlContent, excerpt, tags, categories } = await window.aiUtils.generateWordPressPostHTMLAI({
                    idea: idea,
                    settings: settings,
                    tone: settings.tone || 'neutral'
                });

                const wordpressConfig = settings.wordpress;
                if (!wordpressConfig || !wordpressConfig.url || !wordpressConfig.username || !wordpressConfig.applicationPassword) {
                    throw new Error('WordPress settings are not fully configured.');
                }

                // Step 2: Get or create tag IDs
                handlers.updateTaskStatus(task.id, 'publishing', { message: 'Processing tags...' });
                const tagIds = await window.wordpressUtils.getAndCreateTags(tags, wordpressConfig);

                // Step 3: Get WordPress category ID
                handlers.updateTaskStatus(task.id, 'publishing', { message: 'Processing categories...' });
                const availableCategories = await window.wordpressUtils.getWordPressCategories(wordpressConfig);
                const categoryName = categories && categories.length > 0 ? categories[0] : 'Uncategorized';
                const category = availableCategories.find(cat => cat.name.toLowerCase() === categoryName.toLowerCase());
                const categoryId = category ? category.id : null; // Default to null if not found

                // Step 4: Post the generated content to WordPress
                handlers.updateTaskStatus(task.id, 'publishing', { message: 'Uploading to WordPress...' });

                const postData = {
                    title: idea.title,
                    htmlContent,
                    excerpt,
                    tags: tagIds, // Use the retrieved/created tag IDs
                    categoryId, // Use the found category ID
                };

                const result = await window.wordpressUtils.postToWordPress(postData, wordpressConfig);

                // Step 5: Update task status and Firestore
                handlers.updateTaskStatus(task.id, 'complete', result);
                const ideaRef = firebaseDb.collection(`artifacts/${APP_ID}/users/${user.uid}/blogIdeas`).doc(idea.id);
                await ideaRef.update({
                    status: 'published',
                    finalHtmlContent: htmlContent, // Optionally save the final HTML
                    publishedAt: new Date()
                });

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
                name: `Generating: ${idea.title}`,
                status: 'queued',
                data: { idea, video },
                createdAt: new Date(),
            };
            handlers.addTask(task);
        },
        handleOpenPublisher: (ideas) => {
            setIdeasToPublish(ideas);
            setShowPublisherModal(true);
        },
        handlePublishPostsTask: (ideas) => {
            if (!user || !firebaseDb) return;
            ideas.forEach(idea => {
                const task = {
                    id: `publish-post-${idea.id}`,
                    type: 'publish-post',
                    name: `Publishing: ${idea.title}`,
                    status: 'queued',
                    data: { idea },
                    createdAt: new Date(),
                };
                handlers.addTask(task);
            });
            handlers.setShowPublisherModal(false);
        },
              handleViewGeneratedPost: (ideaOrTaskId) => {
            let ideaId;

            if (typeof ideaOrTaskId === 'string') {
                // It's a taskId from the TaskQueue, e.g., "generate-post-someIdeaId"
                ideaId = ideaOrTaskId.replace('generate-post-', '');
            } else if (typeof ideaOrTaskId === 'object' && ideaOrTaskId !== null) {
                // It's an idea object from the BlogIdeasDashboard
                ideaId = ideaOrTaskId.id;
            } else {
                handlers.displayNotification('Invalid item provided to view handler.', 'error');
                return;
            }

            if (!ideaId) {
                handlers.displayNotification('Could not determine the idea to view.', 'error');
                return;
            }

            // Fetch the latest content directly from Firestore to ensure it's up-to-date.
            const ideaRef = firebaseDb.collection(`artifacts/${APP_ID}/users/${user.uid}/blogIdeas`).doc(ideaId);
            ideaRef.get().then(doc => {
                if (doc.exists && doc.data().blogPostContent) {
                    setContentToView({ id: doc.id, ...doc.data() });
                } else {
                    handlers.displayNotification('Content not available yet or an error occurred.', 'info');
                }
            }).catch(error => {
                console.error("Error fetching document from Firestore:", error);
                handlers.displayNotification('Error fetching content from the database.', 'error');
            });
        },
        setProjectToDelete,
        setDraftToDelete,
        setShowProjectSelection,
        setShowPublisherModal,
        setContentToView,
        handleRetryTask: (taskId) => {
            setTaskQueue(prevQueue => prevQueue.map(task => {
                if (task.id === taskId && task.status === 'failed') {
                    return { ...task, status: 'queued', completedAt: null, result: null };
                }
                return task;
            }));
        },
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
