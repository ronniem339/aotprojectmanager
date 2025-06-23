// js/components/WordpressSettings.js

window.WordpressSettings = ({ settings, onSave }) => {
    const { useState, useEffect } = React;
    const [blogUrl, setBlogUrl] = useState('');
    const [username, setUsername] = useState('');
    const [applicationPassword, setApplicationPassword] = useState('');
    const [connectionStatus, setConnectionStatus] = useState({ status: 'unknown', message: '' });

    useEffect(() => {
        if (settings.wordpress) {
            setBlogUrl(settings.wordpress.url || '');
            setUsername(settings.wordpress.username || '');
            setApplicationPassword(settings.wordpress.applicationPassword || '');
        }
    }, [settings.wordpress]);

    const handleSaveConnection = () => {
        const newWordpressSettings = {
            url: blogUrl,
            username: username,
            applicationPassword: applicationPassword,
        };
        // Call the main save function from the parent
        onSave({ ...settings, wordpress: newWordpressSettings });
        setConnectionStatus({ status: 'info', message: 'Settings saved. You can now test the connection.' });
    };

   // A corrected version of the function for WordpressSettings.js

const handleTestConnection = async () => {
    if (!blogUrl || !username || !applicationPassword) {
        setConnectionStatus({ status: 'error', message: 'Please fill in all fields before testing.' });
        return;
    }
    setConnectionStatus({ status: 'loading', message: 'Testing connection...' });

    try {
        // Use the actual utility function to test the connection
        const categories = await window.wordpressUtils.getWordPressCategories({
            url: blogUrl,
            username: username,
            applicationPassword: applicationPassword
        });
        
        // The getWordPressCategories function returns an array. A successful connection might return an empty array if no categories exist.
        setConnectionStatus({ status: 'success', message: 'Successfully connected to your WordPress site! Found ' + categories.length + ' categories.' });

    } catch (error) {
        console.error("WordPress connection test failed:", error);
        setConnectionStatus({ status: 'error', message: `Connection failed: ${error.message}. Please check your URL, username, and Application Password.` });
    }
};

    return (
        <div className="glass-card p-6 rounded-lg">
            <h2 className="text-2xl font-semibold mb-2">WordPress Integration</h2>
            <p className="text-sm text-gray-400 mb-6">Connect to your self-hosted WordPress blog to post content directly.</p>
            
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">WordPress Site URL</label>
                    <input type="url" value={blogUrl} onChange={(e) => setBlogUrl(e.target.value)} className="w-full form-input" placeholder="https://yourblog.com"/>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">WordPress Username</label>
                    <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full form-input" placeholder="Your WP admin username"/>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Application Password</label>
                    <input type="password" value={applicationPassword} onChange={(e) => setApplicationPassword(e.target.value)} className="w-full form-input" placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"/>
                    <p className="text-xs text-gray-500 mt-1">Generate this in your WordPress profile under "Users".</p>
                </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-4">
                <button onClick={handleSaveConnection} className="w-full px-6 py-2 bg-secondary-accent hover:bg-secondary-accent-darker rounded-lg font-semibold transition-colors">Save Connection</button>
                <button onClick={handleTestConnection} disabled={connectionStatus.status === 'loading'} className="w-full px-6 py-2 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold transition-colors disabled:opacity-50">
                    {connectionStatus.status === 'loading' ? <window.LoadingSpinner isButton={true} /> : 'Test Connection'}
                </button>
            </div>
            
            {connectionStatus.message && (
                <div className={`mt-4 p-3 rounded-lg text-sm text-center
                    ${connectionStatus.status === 'success' ? 'bg-green-900/50 text-green-400' : ''}
                    ${connectionStatus.status === 'error' ? 'bg-red-900/50 text-red-400' : ''}
                    ${connectionStatus.status === 'info' ? 'bg-sky-900/50 text-sky-400' : ''}`}>
                    {connectionStatus.message}
                </div>
            )}
        </div>
    );
};
