// js/components/ProjectView/VideoDetailsSidebar.js

const { useState } = React;

window.VideoDetailsSidebar = ({ video }) => {
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

    // Placeholder image for when no thumbnail is available
    const placeholderThumbnail = `https://placehold.co/600x400/1f2937/00bfff?text=${encodeURIComponent('No Thumbnail')}`;
    
    const description = video.description || video.concept || 'No description available.';
    const words = description.split(/\s+/); // Split by whitespace to count words
    const isLongDescription = words.length > 40;
    const truncatedDescription = isLongDescription ? words.slice(0, 40).join(' ') + '...' : description;

    return (
        <div className="glass-card p-4 sm:p-6 rounded-lg space-y-6 lg:h-full lg:overflow-y-auto"> {/* Added overflow for long content */}
            
            {/* Video Thumbnail */}
            <div>
               <window.ImageComponent 
    src={video.thumbnailUrl || video.tasks?.acceptedConcepts?.[0]?.imageUrl || video.tasks?.thumbnailConcepts?.[0]?.imageUrl || placeholderThumbnail} 
    alt={video.title || 'Video Thumbnail'} 
    className="w-full h-auto object-cover rounded-md mb-4" 
/>
            </div>

            {/* Video Description */}
            <div>
                <span className="text-sm font-semibold text-gray-400 block mb-1">Description:</span>
                <p className="text-sm text-gray-300 whitespace-pre-wrap">
                    {isDescriptionExpanded ? description : truncatedDescription}
                    {isLongDescription && !isDescriptionExpanded && (
                        <button onClick={() => setIsDescriptionExpanded(true)} className="text-primary-accent hover:underline ml-1 font-semibold text-sm">
                            Show more
                        </button>
                    )}
                     {isDescriptionExpanded && (
                        <button onClick={() => setIsDescriptionExpanded(false)} className="text-primary-accent hover:underline ml-1 font-semibold text-sm">
                            Show less
                        </button>
                    )}
                </p>
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

            {/* NEW: Display Saved Shorts Ideas */}
            {video.shortsIdeas && video.shortsIdeas.length > 0 && (
                <div>
                    <span className="text-sm font-semibold text-gray-400 block mb-2">Saved Shorts Ideas:</span>
                    <div className="space-y-2">
                        {video.shortsIdeas.map((short, index) => (
                            <div key={short.id || index} className="p-3 bg-gray-800/50 rounded-lg border border-green-700">
                                <h4 className="text-md font-semibold text-white">{short.title}</h4>
                                <p className="text-xs text-gray-400 mt-1 italic line-clamp-2">{short.description}</p>
                                {short.metadata && (
                                    <p className="text-xs text-green-400 mt-1">Metadata Generated ✅</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
