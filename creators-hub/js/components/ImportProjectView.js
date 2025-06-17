window.ImportProjectView = ({ userId, onImported, onCancel, settings, db, auth, firebaseAppInstance }) => {
    const { useState, useEffect } = React;
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [videoDetails, setVideoDetails] = useState(null);

    const extractVideoId = (url) => {
        const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
        const match = url.match(regex);
        return match ? match[1] : null;
    };

    const handleFetchVideo = async () => {
        setError('');
        const videoId = extractVideoId(youtubeUrl);
        if (!videoId) {
            setError('Invalid YouTube URL. Please enter a valid video URL.');
            return;
        }

        if (!settings.youtubeApiKey) {
            setError('YouTube API Key is not set. Please set it in Technical Settings.');
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,contentDetails&key=${settings.youtubeApiKey}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error.message || 'Failed to fetch video data from YouTube.');
            }
            const data = await response.json();
            if (data.items.length > 0) {
                const snippet = data.items[0].snippet;
                setVideoDetails({
                    title: snippet.title,
                    description: snippet.description,
                    thumbnail: snippet.thumbnails.high.url
                });
            } else {
                setError('Video not found.');
            }
        } catch (e) {
            console.error("Error fetching video:", e);
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleImportVideo = async () => {
        if (!videoDetails) {
            setError("No video details to import.");
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            const result = await window.aiUtils.extractVideoMetadataAI({
                videoTitle: videoDetails.title,
                videoDescription: videoDetails.description,
                apiKey: settings.geminiApiKey,
                useProModelSetting: settings.useProModel, // Pass the setting
                flashModelName: settings.geminiFlashModelName, // Pass the setting
                proModelName: settings.geminiProModelName // Pass the setting
            });

            const newProject = {
                name: videoDetails.title,
                concept: result.concept || 'Imported from YouTube',
                locations: result.locations || [],
                videos: [], // No videos initially, user can add them
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'planning',
                importedFrom: {
                    platform: 'youtube',
                    url: youtubeUrl,
                    originalTitle: videoDetails.title,
                    originalDescription: videoDetails.description,
                    thumbnail: videoDetails.thumbnail
                }
            };

            const docRef = await db.collection(`artifacts/${window.CREATOR_HUB_CONFIG.APP_ID}/users/${userId}/projects`).add(newProject);
            console.log("Project imported with ID: ", docRef.id);
            onImported();

        } catch (e) {
            console.error("Error importing project:", e);
            setError(e.message || "Failed to import project using AI. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-2">Import Project from YouTube</h1>
            <p className="text-gray-400 mb-8">Enter a YouTube video URL to import it as a new project.</p>

            <div className="max-w-xl mx-auto bg-gray-800 p-6 rounded-lg">
                <div className="flex items-center space-x-2">
                    <input
                        type="text"
                        value={youtubeUrl}
                        onChange={(e) => setYoutubeUrl(e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="w-full form-input bg-gray-700 border-gray-600 rounded-md"
                        disabled={isLoading}
                    />
                    <button
                        onClick={handleFetchVideo}
                        disabled={isLoading || !youtubeUrl}
                        className="btn-secondary whitespace-nowrap"
                    >
                         {isLoading && !videoDetails ? 'Fetching...' : 'Fetch Video'}
                    </button>
                </div>

                {error && <p className="text-red-400 mt-4">{error}</p>}

                {videoDetails && (
                    <div className="mt-6 p-4 bg-gray-700 rounded-lg">
                        <h2 className="text-xl font-bold mb-4">Video to Import</h2>
                        <img src={videoDetails.thumbnail} alt="Video thumbnail" className="rounded-lg mb-4 w-full aspect-video object-cover" />
                        <h3 className="font-bold text-lg">{videoDetails.title}</h3>
                        <p className="text-gray-400 text-sm mt-2 line-clamp-3">{videoDetails.description}</p>
                        
                        <div className="flex justify-end items-center mt-6 space-x-4">
                             <button onClick={onCancel} className="btn-secondary">Cancel</button>
                             <button onClick={handleImportVideo} disabled={isLoading} className="btn-primary">
                                 {isLoading ? 'Importing...' : 'Import Project'}
                             </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
