// js/components/BlogTool.js

window.BlogTool = ({ settings, onSaveSettings, onBack }) => {
    const { useState, useEffect } = React;
    const [blogUrl, setBlogUrl] = useState('');
    const [username, setUsername] = useState('');
    const [applicationPassword, setApplicationPassword] = useState('');
    const [connectionStatus, setConnectionStatus] = useState({ status: 'unknown', message: '' });

    // Load saved settings on component mount
    useEffect(() => {
        if (settings.wordpress) {
            setBlogUrl(settings.wordpress.url || '');
            setUsername(settings.wordpress.username || '');
            setApplicationPassword(settings.wordpress.applicationPassword || '');
        }
    }, [settings.wordpress]);

    const handleSaveConnection = () => {
        const newWordpressSettings = {
            ...settings.wordpress,
            url: blogUrl,
            username: username,
            applicationPassword: applicationPassword,
        };
        onSaveSettings({ ...settings, wordpress: newWordpressSettings });
        setConnectionStatus({ status: 'info', message: 'Settings saved. Test your connection.' });
    };

    const handleTestConnection = async () => {
        if (!blogUrl || !username || !applicationPassword) {
            setConnectionStatus({ status: 'error', message: 'Please fill in all fields before testing.' });
            return;
        }
        setConnectionStatus({ status: 'loading', message: 'Testing connection...' });
        
        // This is a placeholder for the actual API call to WordPress
        // In a real scenario, you'd make a request to the WP REST API
        setTimeout(() => {
            // Simulate a successful connection for now
            setConnectionStatus({ status: 'success', message: 'Successfully connected to your WordPress site!' });
            
            // To simulate an error, you could uncomment this:
            // setConnectionStatus({ status: 'error', message: 'Connection failed. Check your URL, username, and application password.' });

        }, 2000);
    };


    return (
        <div className="p-8">
            <header className="flex justify-between items-center mb-8">
                <h1 className="text-4xl font-bold text-white">📝 Blog Content Tool</h1>
                <button onClick={onBack} className="flex items-center gap-2 glass-card px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to Tools
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Left Column: Connection Settings */}
                <div className="md:col-span-1">
                    <div className="glass-card p-6 rounded-lg">
                        <h2 className="text-2xl font-semibold mb-4">WordPress Connection</h2>
                        <p className="text-sm text-gray-400 mb-6">Connect to your self-hosted WordPress blog to post content directly. You'll need to create an "Application Password" in your WordPress user profile.</p>
                        
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

                        <div className="mt-6 space-y-3">
                            <button onClick={handleSaveConnection} className="w-full px-6 py-3 bg-secondary-accent hover:bg-secondary-accent-darker rounded-lg font-semibold transition-colors">Save Connection Details</button>
                            <button onClick={handleTestConnection} disabled={connectionStatus.status === 'loading'} className="w-full px-6 py-3 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold transition-colors disabled:opacity-50">
                                {connectionStatus.status === 'loading' ? <window.LoadingSpinner isButton={true} /> : 'Test Connection'}
                            </button>
                        </div>
                        
                        {connectionStatus.status !== 'unknown' && connectionStatus.status !== 'loading' && (
                            <div className={`mt-4 p-3 rounded-lg text-sm text-center
                                ${connectionStatus.status === 'success' ? 'bg-green-900/50 text-green-400' : ''}
                                ${connectionStatus.status === 'error' ? 'bg-red-900/50 text-red-400' : ''}
                                ${connectionStatus.status === 'info' ? 'bg-sky-900/50 text-sky-400' : ''}`}>
                                {connectionStatus.message}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Content Generation Area (Placeholder for now) */}
                <div className="md:col-span-2">
                     <div className="glass-card p-6 rounded-lg h-full flex flex-col items-center justify-center">
                        <span className="text-5xl mb-4">⚙️</span>
                        <h2 className="text-2xl font-semibold text-center">Blog Post Generation</h2>
                        <p className="text-gray-400 text-center mt-2">Once connected, you'll be able to generate blog post ideas and content here.</p>
                     </div>
                </div>
            </div>
        </div>
    );
};
