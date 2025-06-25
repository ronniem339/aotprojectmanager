// creators-hub/js/components/GeneratedPostViewer.js

window.GeneratedPostViewer = ({ task, onBack, onMarkComplete, onPublish, settings }) => {
    const { useState, useEffect } = React;
    const [isPublishing, setIsPublishing] = useState(false);
    const [publishStatus, setPublishStatus] = useState(null);
    
    if (!task || !task.data) {
        return (
            <div className="p-8">
                <h2 className="text-2xl font-bold mb-4 text-white">Error</h2>
                <p className="text-gray-400">Could not load the post viewer. Task data is missing.</p>
                <button onClick={onBack} className="mt-4 px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold">Back</button>
            </div>
        );
    }
    
    const { generatedContent } = task.data;
    const idea = task.data;

    const handlePublish = async () => {
        setIsPublishing(true);
        setPublishStatus('Publishing...');
        try {
            await onPublish(idea);
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
        <div className="p-4 sm:p-6 md:p-8 bg-gray-900 text-white min-h-screen">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div className="flex-grow">
                    <h1 className="text-2xl sm:text-3xl font-bold text-white">{idea.title}</h1>
                    <p className="text-sm text-gray-400 mt-1">Status: <span className="font-semibold text-green-400">{idea.status}</span></p>
                </div>
                <div className="flex-shrink-0 flex items-center gap-2 w-full sm:w-auto">
                     <button onClick={onBack} className="w-full sm:w-auto px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold text-sm transition-colors">Back to Pipeline</button>
                </div>
            </header>
            
            <div className="max-w-4xl mx-auto">
                {/* FIX: Render the blogPostContent property and wrap in <pre> for readability */}
                <div className="bg-gray-800/50 p-4 sm:p-8 rounded-lg shadow-inner">
                    <div className="prose prose-invert prose-lg max-w-none">
                        {generatedContent && generatedContent.blogPostContent 
                            ? <pre className="font-sans" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'inherit' }}>{generatedContent.blogPostContent}</pre>
                            : <p>No content generated yet.</p>
                        }
                    </div>
                </div>

                <div className="mt-6 p-4 bg-gray-800/50 rounded-lg">
                    <h3 className="text-lg font-bold mb-3">Publishing Actions</h3>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <button 
                            onClick={handlePublish}
                            disabled={isPublishing || idea.status === 'published' || !settings.wordpress}
                            className="w-full sm:w-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isPublishing ? 'Publishing...' : 'Publish to WordPress'}
                        </button>
                        {publishStatus && <p className="text-sm text-gray-300">{publishStatus}</p>}
                    </div>
                     {!settings.wordpress && <p className="text-xs text-yellow-500 mt-2">Note: WordPress settings are not configured. Please configure them in the settings menu to enable publishing.</p>}
                </div>
            </div>
        </div>
    );
};
