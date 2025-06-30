// creators-hub/js/components/BlogTool.js

(() => { // Wrapped in an IIFE to prevent variable scope issues
    const { useState, useMemo, useCallback, useEffect } = React;

    // --- MODAL COMPONENTS ---
    // These components are defined locally within the IIFE and are safe to use.
    
    const VideoCompanionModal = ({ onGenerate, onCancel, db, userId, APP_ID, displayNotification, isGenerating }) => {
        const [projects, setProjects] = useState([]);
        const [videos, setVideos] = useState([]);
        const [selectedProjectId, setSelectedProjectId] = useState('');
        const [selectedVideoId, setSelectedVideoId] = useState('');

        useEffect(() => {
            const projectsRef = db.collection(`artifacts/${APP_ID}/users/${userId}/projects`);
            const unsub = projectsRef.onSnapshot(snap => setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
            return unsub;
        }, [db, APP_ID, userId]);

        useEffect(() => {
            if (!selectedProjectId) { setVideos([]); return; }
            const videosRef = db.collection(`artifacts/${APP_ID}/users/${userId}/projects/${selectedProjectId}/videos`);
            const unsub = videosRef.onSnapshot(snap => setVideos(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
            return unsub;
        }, [db, APP_ID, userId, selectedProjectId]);

        const handleSubmit = () => {
            const selectedVideo = videos.find(v => v.id === selectedVideoId);
            if (!selectedVideo) {
                displayNotification('Please select a valid video.', 'error');
                return;
            }
            onGenerate({
                aiFunction: window.aiUtils.blog.generateBlogPostFromVideo,
                options: { ...selectedVideo },
                title: `${selectedVideo.title} - Blog Companion`,
                postType: 'Video Companion',
            });
        };

        return (
            React.createElement('div', { className: "fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50" },
                React.createElement('div', { className: "glass-card p-6 rounded-lg w-full max-w-lg" },
                    React.createElement('h3', { className: "text-xl font-bold mb-4" }, "Create Video Companion Post"),
                    React.createElement('div', { className: "space-y-4" },
                        React.createElement('select', { value: selectedProjectId, onChange: e => setSelectedProjectId(e.target.value), className: "form-select w-full" },
                            React.createElement('option', { value: "" }, "Select a Project"),
                            projects.map(p => React.createElement('option', { key: p.id, value: p.id }, p.playlistTitle || 'Untitled Project'))
                        ),
                        React.createElement('select', { value: selectedVideoId, onChange: e => setSelectedVideoId(e.target.value), className: "form-select w-full", disabled: !selectedProjectId },
                            React.createElement('option', { value: "" }, "Select a Video"),
                            videos.map(v => React.createElement('option', { key: v.id, value: v.id }, v.title || 'Untitled Video'))
                        )
                    ),
                    React.createElement('div', { className: "flex justify-end space-x-4 mt-6" },
                        React.createElement('button', { onClick: onCancel, className: "btn btn-secondary" }, "Cancel"),
                        React.createElement('button', { onClick: handleSubmit, disabled: !selectedVideoId || isGenerating, className: "btn btn-primary" }, "Generate Post")
                    )
                )
            )
        );
    };

    const AffiliatePostModal = ({ onGenerate, onCancel, displayNotification, isGenerating }) => {
        const [postType, setPostType] = useState('hotel');
        const [location, setLocation] = useState('');
        const [audience, setAudience] = useState('');
        const [specifics, setSpecifics] = useState('');

        const handleSubmit = () => {
            if (!location) {
                displayNotification('Please enter a location.', 'error');
                return;
            }
            const titleMap = { hotel: 'Top Hotels', 'road-trip': 'Road Trip Itinerary', tours: 'Best Tours' };
            onGenerate({
                aiFunction: window.aiUtils.blog.generateAffiliatePost,
                options: { postType, location, audience, specifics },
                title: `${titleMap[postType]} in ${location}`,
                postType: titleMap[postType],
                location: location,
            });
        };

        return (
            React.createElement('div', { className: "fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50" },
                React.createElement('div', { className: "glass-card p-6 rounded-lg w-full max-w-lg" },
                    React.createElement('h3', { className: "text-xl font-bold mb-4" }, "Create Monetizable Post"),
                    React.createElement('div', { className: "space-y-4" },
                        React.createElement('select', { value: postType, onChange: e => setPostType(e.target.value), className: "form-select w-full" },
                            React.createElement('option', { value: "hotel" }, "🏨 Top Hotels Listicle"),
                            React.createElement('option', { value: "road-trip" }, "🚗 Road Trip Itinerary"),
                            React.createElement('option', { value: "tours" }, "🎟️ Tours & Activities Guide")
                        ),
                        React.createElement('input', { type: "text", value: location, onChange: e => setLocation(e.target.value), className: "form-input w-full", placeholder: "Enter Location (e.g., Paris, France)" }),
                        React.createElement('input', { type: "text", value: audience, onChange: e => setAudience(e.target.value), className: "form-input w-full", placeholder: "Target Audience (e.g., families, solo travelers)" }),
                        React.createElement('textarea', { value: specifics, onChange: e => setSpecifics(e.target.value), className: "form-textarea w-full", rows: "3", placeholder: "Any other specific details? (e.g., focus on budget hotels)" })
                    ),
                    React.createElement('div', { className: "flex justify-end space-x-4 mt-6" },
                        React.createElement('button', { onClick: onCancel, className: "btn btn-secondary" }, "Cancel"),
                        React.createElement('button', { onClick: handleSubmit, disabled: !location || isGenerating, className: "btn btn-primary" }, "Generate Post")
                    )
                )
            )
        );
    };

    const DestinationGuideModal = ({ onGenerate, onCancel, blogPostsCollectionRef, displayNotification, isGenerating }) => {
        const [location, setLocation] = useState('');
        const [articles, setArticles] = useState([]);
        const [selectedArticles, setSelectedArticles] = useState(new Set());
        const [isFetching, setIsFetching] = useState(false);

        const fetchArticles = useCallback(async () => {
            if (!location) return;
            setIsFetching(true);
            try {
                const lowerCaseLocation = location.toLowerCase();
                const locationQuery = blogPostsCollectionRef.where('location_lowercase', '==', lowerCaseLocation);
                const tagsQuery = blogPostsCollectionRef.where('tags', 'array-contains', lowerCaseLocation);
                const [locationSnapshot, tagsSnapshot] = await Promise.all([locationQuery.get(), tagsQuery.get()]);
                const articlesMap = new Map();
                locationSnapshot.docs.forEach(doc => articlesMap.set(doc.id, { id: doc.id, ...doc.data() }));
                tagsSnapshot.docs.forEach(doc => articlesMap.set(doc.id, { id: doc.id, ...doc.data() }));
                setArticles(Array.from(articlesMap.values()));
            } catch (e) {
                console.error("Error fetching articles for guide:", e);
                displayNotification("Could not fetch existing articles.", 'error');
            } finally {
                setIsFetching(false);
            }
        }, [location, blogPostsCollectionRef, displayNotification]);

        const handleSelect = (id) => {
            const newSelection = new Set(selectedArticles);
            newSelection.has(id) ? newSelection.delete(id) : newSelection.add(id);
            setSelectedArticles(newSelection);
        };

        const handleSubmit = () => {
            if (selectedArticles.size === 0) {
                displayNotification('Please select at least one existing article to link to.', 'error');
                return;
            }
            const articlesToLink = articles.filter(a => selectedArticles.has(a.id));
            onGenerate({
                aiFunction: window.aiUtils.blog.generateDestinationGuide,
                options: { location, existingArticles: articlesToLink },
                title: `The Ultimate Guide to ${location}`,
                postType: 'Destination Guide',
                location: location,
            });
        };
        
        return (
            React.createElement('div', { className: "fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50" },
                React.createElement('div', { className: "glass-card p-6 rounded-lg w-full max-w-xl max-h-[90vh] flex flex-col" },
                    React.createElement('h3', { className: "text-xl font-bold mb-4" }, "Create Destination Guide"),
                    React.createElement('div', { className: "flex gap-2 mb-4" },
                        React.createElement('input', { type: "text", value: location, onChange: e => setLocation(e.target.value), className: "form-input flex-grow", placeholder: "Enter Location (e.g., Rome, Italy)" }),
                        React.createElement('button', { onClick: fetchArticles, disabled: !location || isFetching, className: "btn btn-secondary" }, isFetching ? 'Fetching...' : 'Find Existing Articles')
                    ),
                    React.createElement('div', { className: "flex-grow overflow-y-auto space-y-2 pr-2" },
                        isFetching && React.createElement(window.LoadingSpinner, { text: "Searching for articles..." }),
                        !isFetching && articles.length > 0 && articles.map(article => (
                            React.createElement('div', { key: article.id, className: "flex items-center space-x-3 bg-gray-800/50 p-2 rounded" },
                                React.createElement('input', { type: "checkbox", checked: selectedArticles.has(article.id), onChange: () => handleSelect(article.id), className: "form-checkbox" }),
                                React.createElement('label', { className: "text-sm text-gray-200" }, article.title)
                            )
                        )),
                        !isFetching && articles.length === 0 && location && (
                            React.createElement('p', { className: "text-gray-400 text-center py-4" }, "No existing blog posts found for this location.")
                        )
                    ),
                    React.createElement('div', { className: "flex justify-end space-x-4 mt-6 pt-4 border-t border-gray-700" },
                        React.createElement('button', { onClick: onCancel, className: "btn btn-secondary" }, "Cancel"),
                        React.createElement('button', { onClick: handleSubmit, disabled: selectedArticles.size === 0 || isGenerating, className: "btn btn-primary" }, "Generate Guide")
                    )
                )
            )
        );
    };

    // --- MAIN BLOG TOOL COMPONENT ---
    window.BlogTool = ({ settings, onBack, onPublishPosts, onViewPost, userId, db, displayNotification }) => {
        const [modalView, setModalView] = useState(null);
        const [isGenerating, setIsGenerating] = useState(false);
        const [importedPosts, setImportedPosts] = useState([]);
        const [isLoadingPosts, setIsLoadingPosts] = useState(true);
        
        const { APP_ID } = window.CREATOR_HUB_CONFIG;
        
        // ** THE FIX IS HERE **
        // Instead of destructuring at the top of the function, we access dependencies directly 
        // from the `window` object inside the return statement. This is more resilient to race conditions.
        // REMOVED: const { BlogIdeasDashboard, LoadingSpinner } = window;

        const ideasCollectionRef = useMemo(() => {
            if (!userId) return null;
            return db.collection(`artifacts/${APP_ID}/users/${userId}/blogIdeas`);
        }, [db, APP_ID, userId]);

        const blogPostsCollectionRef = useMemo(() => {
            if (!userId) return null;
            return db.collection(`artifacts/${APP_ID}/users/${userId}/blogPosts`);
        }, [db, APP_ID, userId]);

        useEffect(() => {
            if (!blogPostsCollectionRef) {
                setIsLoadingPosts(false);
                return;
            }
            setIsLoadingPosts(true);
            const q = blogPostsCollectionRef.where("postType", "==", "wordpress-import");
            const unsubscribe = q.onSnapshot(snapshot => {
                const postsToDisplay = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setImportedPosts(postsToDisplay);
                setIsLoadingPosts(false);
            }, error => {
                console.error("Error fetching imported posts:", error);
                displayNotification("Error loading imported posts.", 'error');
                setIsLoadingPosts(false);
            });
            return () => unsubscribe();
        }, [blogPostsCollectionRef, displayNotification]);

        const handleGeneratePost = useCallback(async (generationTask) => {
            setIsGenerating(true);
            setModalView(null);
            displayNotification('AI is now generating your post...', 'info');
            try {
                const generatedData = await generationTask.aiFunction(generationTask.options, settings, settings.knowledgeBases);

                if (!generatedData || typeof generatedData !== 'object' || !generatedData.htmlContent) {
                    throw new Error("AI returned an invalid or empty response.");
                }

                const docRef = ideasCollectionRef.doc();
                const postData = {
                    title: generatedData.title || generationTask.title,
                    blogPostContent: generatedData.htmlContent,
                    excerpt: generatedData.suggestedExcerpt || '',
                    tags: generatedData.suggestedTags || [],
                    category: generatedData.suggestedCategory || '',
                    postType: generationTask.postType,
                    location: generationTask.location || '',
                    location_lowercase: (generationTask.location || '').toLowerCase(),
                    status: 'generated',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                };
                
                await docRef.set(postData);
                displayNotification(`Successfully generated post: "${postData.title}"`, 'success');
            } catch (err) {
                console.error(`Failed to generate post: ${err.message}`);
                displayNotification(`Error generating post. ${err.message}`, 'error');
            } finally {
                setIsGenerating(false);
            }
        }, [settings, ideasCollectionRef, displayNotification]);

        return (
            React.createElement('div', { className: "p-4 sm:p-6 md:p-8" },
                React.createElement('header', { className: "flex flex-col sm:flex-row justify-between items-center mb-6 sm:mb-8 gap-4" },
                    React.createElement('h1', { className: "text-3xl sm:text-4xl font-bold text-white text-center sm:text-left" }, "✍️ Blog Post Factory"),
                    React.createElement('button', { onClick: onBack, className: "btn btn-outline w-full sm:w-auto" },
                        React.createElement('svg', { xmlns: "http://www.w3.org/2000/svg", className: "h-5 w-5 mr-2", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor" }, React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M10 19l-7-7m0 0l7-7m-7 7h18" })),
                        "Back to Tools"
                    )
                ),
                React.createElement('div', { className: "glass-card p-6 rounded-lg mb-8" },
                    React.createElement('h3', { className: "text-lg font-semibold mb-4 text-white" }, "Content Creation Menu"),
                    isGenerating && window.LoadingSpinner && React.createElement(window.LoadingSpinner, { text: "AI is working its magic... Please wait." }),
                    React.createElement('div', { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" },
                        React.createElement('button', { onClick: () => setModalView('video'), disabled: isGenerating, className: "menu-btn" }, "📝 From a Video"),
                        React.createElement('button', { onClick: () => setModalView('affiliate'), disabled: isGenerating, className: "menu-btn" }, "💰 Monetizable Post"),
                        React.createElement('button', { onClick: () => setModalView('guide'), disabled: isGenerating, className: "menu-btn" }, "🗺️ Destination Guide")
                    )
                ),
                modalView === 'video' && React.createElement(VideoCompanionModal, { onGenerate: handleGeneratePost, onCancel: () => setModalView(null), db: db, userId: userId, APP_ID: APP_ID, displayNotification: displayNotification, isGenerating: isGenerating }),
                modalView === 'affiliate' && React.createElement(AffiliatePostModal, { onGenerate: handleGeneratePost, onCancel: () => setModalView(null), displayNotification: displayNotification, isGenerating: isGenerating }),
                modalView === 'guide' && React.createElement(DestinationGuideModal, { onGenerate: handleGeneratePost, onCancel: () => setModalView(null), blogPostsCollectionRef: blogPostsCollectionRef, displayNotification: displayNotification, isGenerating: isGenerating }),
                
                // ** THE FIX IS HERE **
                // Check if the component exists on `window` before attempting to render it.
                window.BlogIdeasDashboard && React.createElement(window.BlogIdeasDashboard, { userId: userId, db: db, settings: settings, onOpenPublisher: onPublishPosts, onViewPost: onViewPost }),
                
                React.createElement('div', { className: "glass-card p-6 rounded-lg mt-8" },
                    React.createElement('h3', { className: "text-lg font-semibold mb-4 text-white" }, "Published Posts"),
                    isLoadingPosts && window.LoadingSpinner && React.createElement(window.LoadingSpinner, { text: "Loading posts..." }),
                    !isLoadingPosts && importedPosts.length === 0 && React.createElement('p', { className: "text-gray-400" }, "No posts have been published yet."),
                    !isLoadingPosts && importedPosts.length > 0 && (
                        React.createElement('div', { className: "space-y-4" },
                            importedPosts.map(post => (
                                React.createElement('div', { key: post.id, className: "bg-gray-800/50 p-3 rounded-lg" },
                                    React.createElement('p', { className: "text-white font-bold" }, post.title),
                                    React.createElement('p', { className: "text-gray-300 text-sm" }, `Location: ${post.location || 'N/A'}`),
                                    React.createElement('p', { className: "text-gray-300 text-sm" }, `Tags: ${post.tags && post.tags.length > 0 ? post.tags.join(', ') : 'N/A'}`)
                                )
                            ))
                        )
                    )
                )
            )
        );
    };
})(); // End of IIFE wrapper
