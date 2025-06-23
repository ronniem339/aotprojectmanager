// creators-hub/js/components/GeneratedPostViewer.js
window.GeneratedPostViewer = ({ content, onClose }) => {
    const { useEffect } = React;

    // Handle Escape key press to close the modal
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    // Use dangerouslySetInnerHTML because the content is trusted HTML from our AI
    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-gray-800 rounded-lg shadow-xl p-4 sm:p-6 w-full max-w-3xl h-5/6 flex flex-col border border-gray-700">
                <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-3">
                    <h3 className="text-xl font-bold">Generated Post Content</h3>
                    <button onClick={onClose} className="text-white text-2xl hover:text-gray-400">&times;</button>
                </div>
                <div className="prose prose-invert max-w-none overflow-y-auto flex-grow p-2" dangerouslySetInnerHTML={{ __html: content }}></div>
            </div>
        </div>
    );
};
