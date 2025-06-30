// creators-hub/js/components/OneOffWordPressUpdater.js

const { useState, useEffect } = React;

window.OneOffWordPressUpdater = ({ appState }) => {
    const [wpConfig, setWpConfig] = useState({ url: '', username: '', applicationPassword: '' });
    const [status, setStatus] = useState('Ready to update posts from WordPress.');
    const [error, setError] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [isComplete, setIsComplete] = useState(false);

    const { db, user } = appState;

    useEffect(() => {
        if (appState.currentSettings && appState.currentSettings.wordpress) {
            setWpConfig(appState.currentSettings.wordpress);
        }
    }, [appState.currentSettings]);

    const handleConfigChange = (e) => {
        const { name, value } = e.target;
        setWpConfig(prev => ({ ...prev, [name]: value }));
    };

    const handleRunUpdate = async () => {
        if (!confirm('This will update all existing WordPress posts in your database with the latest tags and locations from your live WordPress site. Are you sure?')) {
            return;
        }
        setIsRunning(true);
        setIsComplete(false);
        setError('');
        setStatus('Starting...');
        try {
            const { url, username, applicationPassword } = wpConfig;
            if (!url || !username || !applicationPassword) throw new Error("WordPress credentials are required.");
            if (!db || !user) throw new Error("Database connection not ready.");
            const blogPostsCollectionRef = db.collection('artifacts').doc(window.CREATOR_HUB_CONFIG.APP_ID).collection('users').doc(user.uid).collection('blogPosts');
            let page = 1, hasMorePosts = true, totalPostsProcessed = 0, batch = db.batch(), batchCount = 0;
            const BATCH_SIZE = 50;

            while (hasMorePosts) {
                setStatus(`Fetching posts from WordPress (Page ${page})...`);
                const response = await fetch(`/.netlify/functions/fetch-wp-posts?url=${encodeURIComponent(url)}&user=${encodeURIComponent(username)}&pass=${encodeURIComponent(applicationPassword)}&page=${page}`);
                if (!response.ok) {
                    const errorBody = await response.text();
                    if (errorBody.includes('rest_post_invalid_page_number')) { hasMorePosts = false; continue; }
                    throw new Error(`Failed to fetch posts on page ${page}. Check credentials.`);
                }
                const postsFromWP = await response.json();
                if (postsFromWP.length === 0) { hasMorePosts = false; continue; }
                setStatus(`Processing ${postsFromWP.length} posts from page ${page}...`);

                for (const post of postsFromWP) {
                    const fetchedTags = (post._embedded['wp:term']?.[1] || []).map(tag => tag.name);
                    const newLocation = fetchedTags.length > 0 ? fetchedTags[0] : '';
                    const postRef = blogPostsCollectionRef.doc(post.id.toString());
                    const updateData = {
                        tags: fetchedTags.map(t => t.toLowerCase()),
                        location: newLocation,
                        location_lowercase: newLocation.toLowerCase(),
                    };
                    batch.update(postRef, updateData);
                    batchCount++;
                    if (batchCount === BATCH_SIZE) {
                        await batch.commit();
                        totalPostsProcessed += batchCount;
                        setStatus(`Updated ${totalPostsProcessed} posts...`);
                        batch = db.batch();
                        batchCount = 0;
                    }
                }
                page++;
            }
            if (batchCount > 0) {
                await batch.commit();
                totalPostsProcessed += batchCount;
            }
            setStatus(`Update complete! Successfully processed and updated ${totalPostsProcessed} posts.`);
            setIsComplete(true);
        } catch (err) {
            console.error("Update process failed:", err);
            setError(`A critical error occurred: ${err.message}`);
        } finally {
            setIsRunning(false);
        }
    };

    // Simplified JSX rendering logic to avoid transpiler issues
    const renderStatusBox = () => {
        if (isComplete) {
            return (
                 <div className="text-center p-4 mt-4 bg-gray-900 rounded-lg">
                    <p className="text-xl text-green-400 font-bold">✅ All Done!</p>
                    <p className="text-gray-300 mt-2">The update process has finished. You can now remove this tool.</p>
                </div>
            );
        }
        if (status || error) {
            const statusPrefix = isRunning ? 'PROGRESS: ' : 'STATUS: ';
            return (
                <div className="mt-4 p-4 rounded-lg bg-gray-900">
                    <p className="font-mono text-sm text-white whitespace-pre-wrap">{statusPrefix}{status}</p>
                    {error && <p className="font-mono text-sm text-red-400 mt-2 whitespace-pre-wrap">ERROR: {error}</p>}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="border-t border-dashed border-blue-500 pt-10 mt-10 max-w-2xl">
            <h2 className="text-2xl font-bold mb-2 text-blue-400">One-Off WordPress Post Updater</h2>
            <p className="text-gray-400 mb-6">This tool fetches the latest tags for all posts from WordPress and updates them in Firebase. The location will be set to the first tag found.</p>
            <div className="space-y-4 bg-gray-800/60 p-6 rounded-lg">
                <h3 className="text-xl font-semibold">WordPress Credentials</h3>
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">WordPress URL</label>
                    <input type="text" name="url" value={wpConfig.url} onChange={handleConfigChange} className="w-full form-input" placeholder="https://your-blog.com" disabled={isRunning} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">WordPress Username</label>
                    <input type="text" name="username" value={wpConfig.username} onChange={handleConfigChange} className="w-full form-input" disabled={isRunning} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Application Password</label>
                    <input type="password" name="applicationPassword" value={wpConfig.applicationPassword} onChange={handleConfigChange} className="w-full form-input" disabled={isRunning} />
                </div>
                {!isComplete && (
                    <button onClick={handleRunUpdate} disabled={isRunning} className="btn btn-primary w-full">
                        {isRunning ? 'Updating...' : 'Fetch Tags & Update Posts'}
                    </button>
                )}
            </div>
            {renderStatusBox()}
        </div>
    );
};
