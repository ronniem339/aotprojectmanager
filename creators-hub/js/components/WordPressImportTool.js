// js/components/WordPressImportTool.js

window.WordPressImportTool = () => {
    const { useState, useCallback, useEffect } = React;
    const appState = window.useAppState();
    
    // NEW: Local state to reliably track connection status.
    const [isReady, setIsReady] = useState(false);
    
    const [isLoading, setIsLoading] = useState(false);
    const [progressMessage, setProgressMessage] = useState('');
    const [error, setError] = useState('');
    const [importCompleted, setImportCompleted] = useState(false);

    // CORRECTED: This effect hook now correctly listens for the db and user objects.
    // When they are loaded by the app, this effect will run, update the local 'isReady'
    // state, and force the component to re-render, enabling the button.
    useEffect(() => {
        if (appState.db && appState.user) {
            setIsReady(true);
        }
    }, [appState.db, appState.user]); // The dependency array is key to this fix.

    const handleImport = useCallback(async () => {
        const { db, user, settings } = appState;
        const wordpressSettings = settings?.wordpress;

        if (!isReady) {
            setError("Connection not ready. Please wait.");
            return;
        }

        if (!wordpressSettings?.url || !wordpressSettings?.username || !wordpressSettings?.applicationPassword) {
            setError('WordPress settings are not complete. Please configure them in the "Integrations" section and save.');
            return;
        }
        
        setIsLoading(true);
        setError('');
        setImportCompleted(false);
        setProgressMessage('Starting import...');

        try {
            const appId = typeof window.__app_id !== 'undefined' ? window.__app_id : 'default-app-id';
            const blogPostsCollectionRef = db.collection('artifacts').doc(appId).collection('users').doc(user.uid).collection('blogPosts');

            let page = 1;
            let totalPostsImported = 0;
            let hasMorePosts = true;

            while (hasMorePosts) {
                setProgressMessage(`Fetching page ${page} of posts...`);
                const response = await fetch(`/.netlify/functions/fetch-wp-posts?url=${encodeURIComponent(wordpressSettings.url)}&user=${encodeURIComponent(wordpressSettings.username)}&pass=${encodeURIComponent(wordpressSettings.applicationPassword)}&page=${page}`);

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`Failed to fetch posts. Status: ${response.status}. Message: ${errorData.message || 'Check Netlify function logs.'}`);
                }

                const posts = await response.json();

                if (posts.length === 0) {
                    hasMorePosts = false;
                    continue;
                }

                const batch = db.batch();
                posts.forEach(post => {
                    const postRef = blogPostsCollectionRef.doc(post.id.toString());
                    const postData = {
                        title: post.title.rendered,
                        content: post.content.rendered,
                        status: post.status,
                        location: '',
                        postType: 'wordpress-import',
                        wordPressId: post.id,
                        url: post.link,
                        createdAt: post.date_gmt + 'Z',
                        userId: user.uid
                    };
                    batch.set(postRef, postData);
                });

                await batch.commit();
                totalPostsImported += posts.length;
                setProgressMessage(`${totalPostsImported} posts imported successfully.`);
                page++;
            }
            
            setProgressMessage(`Import complete! A total of ${totalPostsImported} posts were imported.`);
            setImportCompleted(true);
        } catch (err) {
            console.error("WordPress import failed:", err);
            setError(`Import failed: ${err.message}. Check your WordPress settings, API permissions, and network connection.`);
        } finally {
            setIsLoading(false);
        }
    }, [appState, isReady]);

    return (
        <div className="bg-gray-800/60 border border-gray-700 p-6 rounded-lg">
            <h3 className="text-xl font-bold mb-4">WordPress Content Importer</h3>
            <p className="mb-4 text-gray-400">
                Import all existing posts from your WordPress blog into the Creator's Hub. This is a one-time operation.
            </p>
            
            {!isLoading && !importCompleted && (
                <button 
                  onClick={handleImport} 
                  className="btn btn-primary"
                  // The button is now reliably disabled based on the 'isReady' state.
                  disabled={isLoading || !isReady}
                >
                    {isReady ? 'Start WordPress Import' : 'Connecting...'}
                </button>
            )}

            {isLoading && (
                <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <p className="text-gray-300 font-medium">{progressMessage}</p>
                </div>
            )}

            {!isLoading && error && (
                <p className="text-red-400 mt-4 font-semibold">{error}</p>
            )}

            {!isLoading && importCompleted && (
                <p className="text-green-400 font-semibold mt-4">{progressMessage}</p>
            )}
        </div>
    );
};
