// js/components/BlogTool.js

// --- MODAL COMPONENTS (MOVED OUTSIDE) ---
// By defining these components outside the main BlogTool component, we ensure
// their state is not reset every time BlogTool re-renders. This is the fix for
// the text disappearing and dropdowns unselecting.

const VideoCompanionModal = ({ onGenerate, onCancel, db, userId, APP_ID, displayNotification, isGenerating }) => {
    const { useState, useEffect } = React;
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
            aiFunction: window.ai.blog.generateBlogPostFromVideo,
            options: { ...selectedVideo },
            title: `${selectedVideo.title} - Blog Companion`,
            postType: 'Video Companion',
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
            <div className="glass-card p-6 rounded-lg w-full max-w-lg">
                <h3 className="text-xl font-bold mb-4">Create Video Companion Post</h3>
                <div className="space-y-4">
                    <select value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)} className="form-select w-full">
                        <option value="">Select a Project</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.playlistTitle || 'Untitled Project'}</option>)}
                    </select>
                    <select value={selectedVideoId} onChange={e => setSelectedVideoId(e.target.value)} className="form-select w-full" disabled={!selectedProjectId}>
                        <option value="">Select a Video</option>
                        {videos.map(v => <option key={v.id} value={v.id}>{v.title || 'Untitled Video'}</option>)}
                    </select>
                </div>
                <div className="flex justify-end space-x-4 mt-6">
                    <button onClick={onCancel} className="btn btn-secondary">Cancel</button>
                    <button onClick={handleSubmit} disabled={!selectedVideoId || isGenerating} className="btn btn-primary">Generate Post</button>
                </div>
            </div>
        </div>
    );
};

const AffiliatePostModal = ({ onGenerate, onCancel, displayNotification, isGenerating }) => {
    const { useState } = React;
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
            aiFunction: window.ai.blog.generateAffiliatePost,
            options: { postType, location, audience, specifics },
            title: `${titleMap[postType]} in ${location}`,
            postType: titleMap[postType],
            location: location,
        });
    };

    return (
         <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
            <div className="glass-card p-6 rounded-lg w-full max-w-lg">
                <h3 className="text-xl font-bold mb-4">Create Monetizable Post</h3>
                <div className="space-y-4">
                    <select value={postType} onChange={e => setPostType(e.target.value)} className="form-select w-full">
                        <option value="hotel">🏨 Top Hotels Listicle</option>
                        <option value="road-trip">🚗 Road Trip Itinerary</option>
                        <option value="tours">🎟️ Tours & Activities Guide</option>
                    </select>
                    <input type="text" value={location} onChange={e => setLocation(e.target.value)} className="form-input w-full" placeholder="Enter Location (e.g., Paris, France)" />
                    <input type="text" value={audience} onChange={e => setAudience(e.target.value)} className="form-input w-full" placeholder="Target Audience (e.g., families, solo travelers)" />
                    <textarea value={specifics} onChange={e => setSpecifics(e.target.value)} className="form-textarea w-full" rows="3" placeholder="Any other specific details? (e.g., focus on budget hotels)"></textarea>
                </div>
                <div className="flex justify-end space-x-4 mt-6">
                    <button onClick={onCancel} className="btn btn-secondary">Cancel</button>
                    <button onClick={handleSubmit} disabled={!location || isGenerating} className="btn btn-primary">Generate Post</button>
                </div>
            </div>
        </div>
    );
};

const DestinationGuideModal = ({ onGenerate, onCancel, blogPostsCollectionRef, displayNotification, isGenerating }) => {
    const { useState, useCallback } = React;
    const [location, setLocation] = useState('');
    const [articles, setArticles] = useState([]);
    const [selectedArticles, setSelectedArticles] = useState(new Set());
    const [isFetching, setIsFetching] = useState(false);

    const fetchArticles = useCallback(async () => {
        if (!location) return;
        setIsFetching(true);
        try {
            const snapshot = await blogPostsCollectionRef.where('location', '==', location).get();
            const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setArticles(fetched);
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
            aiFunction: window.ai.blog.generateDestinationGuide,
            options: { location, existingArticles: articlesToLink },
            title: `The Ultimate Guide to ${location}`,
            postType: 'Destination Guide',
            location: location,
        });
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
            <div className="glass-card p-6 rounded-lg w-full max-w-xl max-h-[90vh] flex flex-col">
                <h3 className="text-xl font-bold mb-4">Create Destination Guide</h3>
                <div className="flex gap-2 mb-4">
                    <input type="text" value={location} onChange={e => setLocation(e.target.value)} className="form-input flex-grow" placeholder="Enter Location (e.g., Rome, Italy)" />
                    <button onClick={fetchArticles} disabled={!location || isFetching} className="btn btn-secondary">
                        {isFetching ? 'Fetching...' : 'Find Existing Articles'}
                    </button>
                </div>
                <div className="flex-grow overflow-y-auto space-y-2 pr-2">
                    {isFetching && <window.LoadingSpinner text="Searching for articles..." />}
                    {!isFetching && articles.length > 0 && articles.map(article => (
                        <div key={article.id} className="flex items-center space-x-3 bg-gray-800/50 p-2 rounded">
                            <input type="checkbox" checked={selectedArticles.has(article.id)} onChange={() => handleSelect(article.id)} className="form-checkbox" />
                            <label className="text-sm text-gray-200">{article.title}</label>
                        </div>
                    ))}
                     {!isFetching && articles.length === 0 && location && (
                        <p className="text-gray-400 text-center py-4">No existing blog posts found for this location.</p>
                    )}
                </div>
                 <div className="flex justify-end space-x-4 mt-6 pt-4 border-t border-gray-700">
                    <button onClick={onCancel} className="btn btn-secondary">Cancel</button>
                    <button onClick={handleSubmit} disabled={selectedArticles.size === 0 || isGenerating} className="btn btn-primary">Generate Guide</button>
                </div>
            </div>
        </div>
    );
};


// --- MAIN BLOG TOOL COMPONENT ---

window.BlogTool = ({ settings, onBack, onPublishPosts, onViewPost, userId, db, displayNotification }) => {
    const { useState, useMemo, useCallback } = React;
    const { BlogIdeasDashboard, LoadingSpinner } = window;

    const [modalView, setModalView] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    
    const { APP_ID } = window.CREATOR_HUB_CONFIG;
    const ideasCollectionRef = useMemo(() => {
        if (!userId) return null;
        return db.collection(`artifacts/${APP_ID}/users/${userId}/blogIdeas`);
    }, [db, APP_ID, userId]);

    const blogPostsCollectionRef = useMemo(() => {
        if (!userId) return null;
        return db.collection(`artifacts/${APP_ID}/users/${userId}/blogPosts`);
    }, [db, APP_ID, userId]);


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
        <div className="p-4 sm:p-6 md:p-8">
            <header className="flex flex-col sm:flex-row justify-between items-center mb-6 sm:mb-8 gap-4">
                <h1 className="text-3xl sm:text-4xl font-bold text-white text-center sm:text-left">✍️ Blog Post Factory</h1>
                <button onClick={onBack} className="btn btn-outline w-full sm:w-auto">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Back to Tools
                </button>
            </header>

            <div className="glass-card p-6 rounded-lg mb-8">
                 <h3 className="text-lg font-semibold mb-4 text-white">Content Creation Menu</h3>
                 {isGenerating && <LoadingSpinner text="AI is working its magic... Please wait." />}
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <button onClick={() => setModalView('video')} disabled={isGenerating} className="menu-btn">📝 From a Video</button>
                    <button onClick={() => setModalView('affiliate')} disabled={isGenerating} className="menu-btn">💰 Monetizable Post</button>
                    <button onClick={() => setModalView('guide')} disabled={isGenerating} className="menu-btn">🗺️ Destination Guide</button>
                 </div>
            </div>
            
            {/* --- Modals --- */}
            {modalView === 'video' && <VideoCompanionModal 
                onGenerate={handleGeneratePost}
                onCancel={() => setModalView(null)}
                db={db}
                userId={userId}
                APP_ID={APP_ID}
                displayNotification={displayNotification}
                isGenerating={isGenerating}
            />}
            {modalView === 'affiliate' && <AffiliatePostModal 
                onGenerate={handleGeneratePost}
                onCancel={() => setModalView(null)}
                displayNotification={displayNotification}
                isGenerating={isGenerating}
            />}
            {modalView === 'guide' && <DestinationGuideModal 
                onGenerate={handleGeneratePost}
                onCancel={() => setModalView(null)}
                blogPostsCollectionRef={blogPostsCollectionRef}
                displayNotification={displayNotification}
                isGenerating={isGenerating}
            />}

            <BlogIdeasDashboard 
                userId={userId} 
                db={db} 
                settings={settings} 
                onOpenPublisher={onPublishPosts} 
                onViewPost={onViewPost}
            />
        </div>
    );
};
