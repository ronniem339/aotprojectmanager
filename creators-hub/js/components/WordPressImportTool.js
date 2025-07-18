// js/components/WordPressImportTool.js

window.WordPressImportTool = () => {
    const { useState, useCallback, useEffect } = React;
    // Get the entire application state object.
    const appState = window.useAppState();
    
    // This local state will be reliably updated by the useEffect hook.
    const [isReady, setIsReady] = useState(false);
    
    const [isLoading, setIsLoading] = useState(false);
    const [progressMessage, setProgressMessage] = useState('');
    const [error, setError] = useState('');
    const [importCompleted, setImportCompleted] = useState(false);

    // This is the key to the fix. This hook listens for any change to the appState.
    // When the main app loads the database and user, the appState changes,
    // this effect runs, and sets isReady to true, forcing this component to update.
    useEffect(() => {
        // We only set to true if both db and user are available.
        if (appState && appState.db && appState.user) {
            setIsReady(true);
        } else {
            setIsReady(false);
        }
    }, [appState]); // Dependency on the entire appState object ensures this runs on any state update.

    const handleImport = useCallback(async () => {
        const { db, user, settings } = appState;
        const wordpressSettings = settings?.wordpress;

        if (!isReady) {
            setError("Connection is not ready. Please wait.");
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
            const appId = window.CREATOR_HUB_CONFIG.APP_ID;
            const blogPostsCollectionRef = db.collection('artifacts').doc(appId).collection('users').doc(user.uid).collection('blogPosts');

            // 1. Fetch all categories and tags first
            setProgressMessage('Fetching categories and tags...');
            const [categories, tags] = await Promise.all([
                fetch(`/.netlify/functions/fetch-wp-categories?url=${encodeURIComponent(wordpressSettings.url)}&user=${encodeURIComponent(wordpressSettings.username)}&pass=${encodeURIComponent(wordpressSettings.applicationPassword)}`),
                fetch(`/.netlify/functions/fetch-wp-tags?url=${encodeURIComponent(wordpressSettings.url)}&user=${encodeURIComponent(wordpressSettings.username)}&pass=${encodeURIComponent(wordpressSettings.applicationPassword)}`)
            ]);

            if (!categories.ok || !tags.ok) {
                throw new Error('Failed to fetch WordPress categories or tags.');
            }

            const categoriesData = await categories.json();
            const tagsData = await tags.json();

            console.log("Fetched Categories:", categoriesData);
            console.log("Fetched Tags:", tagsData);
            const categoryMap = new Map(categoriesData.map(cat => [cat.id, cat.name]));
            const tagMap = new Map(tagsData.map(tag => [tag.id, tag.name]));
            console.log("Category Map:", categoryMap);
            console.log("Tag Map:", tagMap);

            let page = 1;
            let totalPostsImported = 0;
            let hasMorePosts = true;

            while (hasMorePosts) {
                setProgressMessage(`Fetching page ${page} of posts...`);
                const response = await fetch(`/.netlify/functions/fetch-wp-posts?url=${encodeURIComponent(wordpressSettings.url)}&user=${encodeURIComponent(wordpressSettings.username)}&pass=${encodeURIComponent(wordpressSettings.applicationPassword)}&page=${page}`);

                if (!response.ok) {
                    const errorText = await response.text(); // Get raw text to check for specific message
                    let errorMessage = `Failed to fetch posts. Status: ${response.status}.`;
                    let isPaginationError = false;

                    try {
                        const errorData = JSON.parse(errorText);
                        errorMessage += ` Message: ${errorData.message || 'Check Netlify function logs.'}`;
                        if (errorData.message && errorData.message.includes('page number requested is larger than the number of pages available')) {
                            isPaginationError = true;
                        }
                    } catch (e) {
                        // If parsing as JSON fails, it's likely a plain text error or malformed JSON
                        errorMessage += ` Raw response: ${errorText}`;
                        if (errorText.includes('page number requested is larger than the number of pages available')) {
                            isPaginationError = true;
                        }
                    }

                    if (response.status === 400 && isPaginationError) {
                        console.warn(`WordPress import: Reached end of posts on page ${page}. Stopping import.`);
                        hasMorePosts = false;
                        continue; // Exit the current iteration and the while loop
                    } else {
                        throw new Error(errorMessage);
                    }
                }

                const posts = await response.json();
                console.log(`Fetched ${posts.length} posts from page ${page}:`, posts);

                if (posts.length === 0) {
                    hasMorePosts = false;
                    continue;
                }

                // Call the centralized import function with the maps
                const importedCount = await window.wordpressUtils.importAllWordPressPosts({
                    db,
                    user,
                    wordpressConfig: wordpressSettings,
                    onProgress: (msg) => setProgressMessage(msg),
                    categoryMap,
                    tagMap,
                });
                totalPostsImported += importedCount;
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
    }, [appState, isReady]); // Depend on appState and the local isReady flag.

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

