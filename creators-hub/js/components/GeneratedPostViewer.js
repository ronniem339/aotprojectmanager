// creators-hub/js/components/GeneratedPostViewer.js

window.GeneratedPostViewer = ({ content, onClose, onPublish, settings, idea }) => {
    const { useState, useEffect } = React;
    const [isPublishing, setIsPublishing] = useState(false);
    const [publishStatus, setPublishStatus] = useState(null);
    
    if (!content) {
        return (
            <div className="p-8">
                <h2 className="text-2xl font-bold mb-4 text-white">Error</h2>
                <p className="text-gray-400">Could not load the post viewer. Content is missing.</p>
                <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold">Back</button>
            </div>
        );
    }
    
    const handlePublish = async () => {
        setIsPublishing(true);
        setPublishStatus('Publishing...');
        try {
            await onPublish([idea]); // Pass idea as an array
            setPublishStatus('Post published successfully!');
            // onMarkComplete(task.id);
        } catch (error) {
            console.error('Publishing failed:', error);
            setPublishStatus(`Error: ${error.message}`);
        } finally {
            setIsPublishing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-90 flex justify-center items-center z-50 p-4">
            <div className="glass-card rounded-lg w-full max-w-4xl h-full max-h-[90vh] flex flex-col">
                <header className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h1 className="text-xl font-bold text-white">Generated Post</h1>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
                </header>
                
                <div className="flex-grow overflow-y-auto p-4 sm:p-6 md:p-8">
                    <div className="prose prose-invert prose-lg max-w-none">
                        <pre className="font-sans" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'inherit' }}>{content}</pre>
                    </div>
                </div>

                <div className="flex-shrink-0 p-4 border-t border-gray-700 flex flex-col sm:flex-row justify-end items-center gap-4">
                    <button 
                        onClick={handlePublish}
                        disabled={isPublishing || !settings.wordpress}
                        className="w-full sm:w-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isPublishing ? 'Publishing...' : 'Publish to WordPress'}
                    </button>
                    {publishStatus && <p className="text-sm text-gray-300">{publishStatus}</p>}
                    {!settings.wordpress && <p className="text-xs text-yellow-500 mt-2">Note: WordPress settings are not configured. Please configure them in the settings menu to enable publishing.</p>}
                </div>
            </div>
        </div>
    );
};
