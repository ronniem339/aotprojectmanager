// js/components/ProjectView/FullScreenScriptView.js

const { useEffect } = React;

/**
 * FullScreenScriptView Component
 * Displays the video script in a full-screen, high-contrast, large-font view
 * for easy reading during recording.
 *
 * @param {object} props - The component props.
 * @param {string} props.scriptContent - The script text to display.
 * @param {function} props.onClose - Callback function to close the full-screen view.
 */
const FullScreenScriptView = ({ scriptContent, onClose }) => {
    // Effect to prevent scrolling the background when the modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden'; // Disable scrolling on the body
        return () => {
            document.body.style.overflow = ''; // Re-enable scrolling on cleanup
        };
    }, []);

    // Handle escape key to close the full-screen view
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

    return (
        <div className="fixed inset-0 bg-white text-black z-[1000] flex flex-col p-4 sm:p-8">
            {/* Close button positioned at the top right */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 sm:top-6 sm:right-6 text-gray-700 hover:text-gray-900 text-3xl font-bold leading-none z-10"
                aria-label="Close full screen script"
            >
                &times;
            </button>

            {/* Script content area */}
            <div className="flex-grow overflow-y-auto w-full max-w-screen-lg mx-auto py-8">
                <pre className="font-sans text-xl sm:text-2xl md:text-3xl lg:text-4xl leading-relaxed whitespace-pre-wrap">
                    {scriptContent}
                </pre>
            </div>
        </div>
    );
};

// Expose the component globally
window.FullScreenScriptView = FullScreenScriptView;
