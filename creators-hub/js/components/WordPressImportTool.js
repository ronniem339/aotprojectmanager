// js/components/WordPressImportTool.js

window.WordPressImportTool = () => {
    const { useState, useCallback, useContext } = React;
    const { db, user, wordpressSettings } = window.useAppState(); // Assuming useAppState is available on window
    const [isLoading, setIsLoading] = useState(false);
    const [progressMessage, setProgressMessage] = useState('');
    const [error, setError] = useState('');
    const [importCompleted, setImportCompleted] = useState(false);

    /**
     * Handles the entire import process.
     * Fetches posts page-by-page from the WordPress REST API and saves them
     * in batches to Firestore.
     */
    const handleImport = useCallback(async () => {
        // Check for required WordPress settings first
        if (!wordpressSettings?.url || !wordpressSettings?.username || !wordpressSettings?.applicationPassword) {
            setError('WordPress settings are not complete. Please configure them below.');
            return;
        }
        
        // Reset state for a new import
        setIsLoading(true);
        setError('');
        setImportCompleted(false);
        setProgressMessage('Starting import...');

        try {
            // Get reference to the user's blogPosts collection in Firestore
            const appId = typeof window.__app_id !== 'undefined' ? window.__app_id : 'default-app-id';
            const blogPostsCollectionRef = firebase.firestore().collection('artifacts').doc(appId).collection('users').doc(user.uid).collection('blogPosts');

            let page = 1;
            let totalPostsImported = 0;
            let hasMorePosts = true;

            // Loop through paginated results from WordPress API
            while (hasMorePosts) {
                setProgressMessage(`Fetching page ${page} of posts...`);
                // Using the netlify function proxy to avoid CORS issues in development
                const response = await fetch(`/.netlify/functions/fetch-wp-posts?url=${encodeURIComponent(wordpressSettings.url)}&user=${encodeURIComponent(wordpressSettings.username)}&pass=${encodeURIComponent(wordpressSettings.applicationPassword)}&page=${page}`);

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`Failed to fetch posts. Status: ${response.status}. Message: ${errorData.message || 'Check Netlify function logs.'}`);
                }

                const posts = await response.json();

                // Stop when there are no more posts
                if (posts.length === 0) {
                    hasMorePosts = false;
                    continue;
                }

                // Use a Firestore batch for efficient writing
                const batch = db.batch();
                posts.forEach(post => {
                    const postRef = blogPostsCollectionRef.doc(post.id.toString());
                    const postData = {
                        title: post.title.rendered,
                        content: post.content.rendered,
                        status: post.status,
                        location: '', // WordPress API for posts doesn't have a standard location field.
                        postType: 'wordpress-import',
                        wordPressId: post.id,
                        url: post.link,
                        createdAt: post.date_gmt + 'Z', // Ensure it's a valid ISO string
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
            setError(`Import failed: ${err.message}. Check your WordPress settings and network connection.`);
        } finally {
            setIsLoading(false);
        }
    }, [wordpressSettings, db, user]);

    return (
        <div className="bg-gray-800/60 border border-gray-700 p-6 rounded-lg mt-8">
            <h3 className="text-xl font-bold mb-4">WordPress Content Importer</h3>
            <p className="mb-4 text-gray-400">
                Import all existing posts from your WordPress blog into the Creator's Hub. This is a one-time operation to get your content library up to date. This process may take several minutes.
            </p>
            
            {!isLoading && !importCompleted && (
                <button 
                  onClick={handleImport} 
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300 ease-in-out shadow-sm disabled:bg-gray-500 disabled:cursor-not-allowed"
                  disabled={isLoading}
                >
                    Start WordPress Import
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
