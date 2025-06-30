window.BlogIdeasDashboard = ({ userId, db, settings, onOpenPublisher, onViewPost }) => {
    const [generatedIdeas, setGeneratedIdeas] = React.useState([]);
    const [publishedIdeas, setPublishedIdeas] = React.useState([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [selectedIdeas, setSelectedIdeas] = React.useState([]);
    const [viewingPost, setViewingPost] = React.useState(null);

    const { CREATOR_HUB_CONFIG, LoadingSpinner, GeneratedPostViewer, WordpressPublisher } = window;
    const { APP_ID } = CREATOR_HUB_CONFIG;

    React.useEffect(() => {
        if (!userId) return;

        const ideasCollectionRef = db.collection(`artifacts/${APP_ID}/users/${userId}/blogIdeas`);
        
        setIsLoading(true);
        const unsubscribe = ideasCollectionRef
            .orderBy('createdAt', 'desc')
            .onSnapshot(snapshot => {
                const ideas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                const filteredIdeas = ideas.filter(idea => idea.postType !== 'wordpress-import');

                // ** THE FIX IS HERE **
                // Show all posts that are not yet published, including generated, pending, and failed.
                const generated = filteredIdeas.filter(idea => idea.status !== 'published');
                const published = filteredIdeas.filter(idea => idea.status === 'published');
                
                setGeneratedIdeas(generated);
                setPublishedIdeas(published);
                setIsLoading(false);
            }, (error) => {
                console.error("Error fetching blog ideas:", error);
                setIsLoading(false);
            });

        return () => unsubscribe();
    }, [userId, db, APP_ID]);

    const handleSelectIdea = (ideaId) => {
        setSelectedIdeas(prev =>
            prev.includes(ideaId) ? prev.filter(id => id !== ideaId) : [...prev, ideaId]
        );
    };

    const handleViewPost = (idea) => {
        setViewingPost(idea);
    };

    const handleCloseViewer = () => {
        setViewingPost(null);
    };

    const ideasToPublish = generatedIdeas.filter(idea => selectedIdeas.includes(idea.id));

    if (isLoading) {
        return React.createElement(LoadingSpinner, { text: 'Loading blog ideas...' });
    }

    if (viewingPost) {
        return React.createElement(GeneratedPostViewer, { 
            content: viewingPost.blogPostContent, 
            idea: viewingPost, 
            onClose: handleCloseViewer,
            settings: settings 
        });
    }

    return React.createElement('div', null,
        React.createElement('div', { className: 'glass-card p-6 rounded-lg' },
            // ** THE FIX IS HERE ** - Renamed for clarity
            React.createElement('h2', { className: 'text-2xl font-bold mb-4' }, 'Drafts & Queued Posts'),
            generatedIdeas.length > 0 ? (
                React.createElement('div', { className: 'space-y-4' },
                    generatedIdeas.map(idea => (
                        React.createElement('div', { key: idea.id, className: 'flex items-center justify-between bg-gray-800 p-3 rounded-lg' },
                            React.createElement('div', { className: 'flex items-center' },
                                React.createElement('input', { type: 'checkbox', className: 'form-checkbox h-5 w-5 text-blue-600', checked: selectedIdeas.includes(idea.id), onChange: () => handleSelectIdea(idea.id) }),
                                React.createElement('span', { className: 'ml-4 text-white' }, idea.title)
                            ),
                            React.createElement('button', { onClick: () => handleViewPost(idea), className: 'btn btn-secondary btn-sm' }, 'View')
                        )
                    ))
                )
            ) : React.createElement('p', { className: 'text-gray-400' }, 'No generated ideas yet. Use the content creation menu to make some!'),
            selectedIdeas.length > 0 && React.createElement('div', { className: 'mt-6 flex justify-end' },
                React.createElement('button', { onClick: () => onOpenPublisher(ideasToPublish), className: 'btn btn-primary' }, `Publish ${selectedIdeas.length} Selected Post(s)`)
            )
        ),
        React.createElement('div', { className: 'glass-card p-6 rounded-lg mt-8' },
            React.createElement('h2', { className: 'text-2xl font-bold mb-4' }, 'Published Posts'),
            publishedIdeas.length > 0 ? (
                React.createElement('ul', { className: 'space-y-3' },
                    publishedIdeas.map(idea => (
                        React.createElement('li', { key: idea.id, className: 'bg-gray-800 p-3 rounded-lg' },
                            React.createElement('span', { className: 'text-white' }, idea.title)
                        )
                    ))
                )
            ) : React.createElement('p', { className: 'text-gray-400' }, 'No posts have been published yet.')
        )
    );
};
