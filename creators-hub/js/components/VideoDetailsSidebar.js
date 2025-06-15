// js/components/ProjectView/VideoDetailsSidebar.js

const { useState } = React;

// Generic Modal Component (reusable for any modal content)
window.Modal = ({ onClose, title, children }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4">
            <div className="glass-card rounded-lg p-8 w-full max-w-lg relative max-h-[90vh] overflow-y-auto">
                <button onClick={onClose} className="absolute top-4 right-6 text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
                {title && <h2 className="text-2xl font-bold mb-4">{title}</h2>}
                {children}
            </div>
        </div>
    );
};


window.VideoDetailsSidebar = ({ video }) => {
    const [showDescriptionModal, setShowDescriptionModal] = useState(false);

    // Placeholder image for when no thumbnail is available
    const placeholderThumbnail = `https://placehold.co/600x400/1f2937/00bfff?text=${encodeURIComponent('No Thumbnail')}`;

    return (
        <div className="glass-card p-6 rounded-lg space-y-6 lg:h-full lg:overflow-y-auto"> {/* Added overflow for long content */}
            {/* Video Title - now displayed at the top of the sidebar */}
            <h3 className="text-xl font-bold text-primary-accent mb-2">{video.chosenTitle || video.title}</h3>

            {/* Video Thumbnail */}
            <div>
                <window.ImageComponent 
                    src={video.thumbnailUrl || video.generatedThumbnails?.[0] || placeholderThumbnail} 
                    alt={video.title || 'Video Thumbnail'} 
                    className="w-full h-40 object-cover rounded-md mb-4" 
                />
            </div>

            {/* Show Description Button */}
            <div>
                <button 
                    onClick={() => setShowDescriptionModal(true)} 
                    className="w-full px-4 py-2 bg-secondary-accent hover:bg-secondary-accent-darker rounded-lg font-semibold text-sm"
                >
                    Show Full Description
                </button>
            </div>

            {/* Locations Featured */}
            <div>
                <span className="text-sm font-semibold text-gray-400 block mb-1">Locations:</span>
                {video.locations_featured?.length > 0 ? (
                    <p className="text-sm text-gray-300">{video.locations_featured.join(', ')}</p>
                ) : (
                    <p className="text-sm text-gray-500 italic">None specified.</p>
                )}
            </div>

            {/* Targeted Keywords */}
            <div>
                <span className="text-sm font-semibold text-gray-400 block mb-1">Keywords:</span>
                {video.targeted_keywords?.length > 0 ? (
                    <p className="text-sm text-gray-300">{video.targeted_keywords.join(', ')}</p>
                ) : (
                    <p className="text-sm text-gray-500 italic">None targeted.</p>
                )}
            </div>

            {/* Video Description Modal */}
            {showDescriptionModal && (
                <window.Modal onClose={() => setShowDescriptionModal(false)} title="Video Description">
                    <p className="whitespace-pre-wrap text-gray-300">{video.description || video.concept || 'No description available.'}</p>
                </window.Modal>
            )}
        </div>
    );
};
