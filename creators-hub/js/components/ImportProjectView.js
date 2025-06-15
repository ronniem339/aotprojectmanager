// js/components/ImportProjectView.js

const { useState, useEffect } = React; // Add React import for useState and useEffect

window.ImportProjectView = ({ onAnalyze, onBack, isLoading, settings }) => {
    const [youtubeUrlOrId, setYoutubeUrlOrId] = useState('');
    const [fetchError, setFetchError] = useState('');
    const [isFetchingYoutube, setIsFetchingYoutube] = useState(false);
    const [fetchedYoutubeData, setFetchedYoutubeData] = useState(null); // { playlistTitle, playlistDescription, videos: [{id, title, description, thumbnailUrl, chapters}] }
    
    // States for user review and AI parsing steps
    const [manualPlaylistTitle, setManualPlaylistTitle] = useState('');
    const [manualPlaylistDescription, setManualPlaylistDescription] = useState('');
    const [projectCoverImageUrl, setProjectCoverImageUrl] = useState(''); // State for project cover image URL
    // Initialize videosToImport with one empty manual video by default if no YouTube data is fetched yet
    const [videosToImport, setVideosToImport] = useState([{
        id: `manual-${Date.now()}-0`, // Unique ID for manual entry
        title: '',
        concept: '', // This will hold the cleaned description
        script: '',
        locations_featured: [],
        targeted_keywords: [],
        estimatedLengthMinutes: '',
        thumbnailUrl: '', // No thumbnail for manual
        isManual: true, // Flag to identify manual entries
        status: 'pending',
        chapters: [] // Store extracted chapters here
    }]);

    // Helper to extract Playlist ID or Video ID from YouTube URLs
    const extractYoutubeId = (url) => {
        const playlistIdMatch = url.match(/[?&]list=([^&]+)/);
        if (playlistIdMatch && playlistIdMatch[1]) {
            return { type: 'playlist', id: playlistIdMatch[1] };
        }
        const videoIdMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([\w-]{11})/);
        if (videoIdMatch && videoIdMatch[1]) {
            return { type: 'video', id: videoIdMatch[1] };
        }
        // If not a URL, assume it's directly an ID
        if (url.length === 24 && url.startsWith('PL')) { // Common playlist ID format
            return { type: 'playlist', id: url };
        }
        if (url.length === 11) { // Common video ID format
            return { type: 'video', id: url };
        }
        return null;
    };

    /**
     * Extracts chapter timestamps and titles from a YouTube video description.
     * @param {string} description The raw YouTube video description.
     * @returns {Array<{timestamp: string, title: string}>} An array of chapter objects.
     */
    const extractChaptersFromDescription = (description) => {
        const chapterLines = [];
        const lines = description.split('\n');
        // Regex to match common chapter formats like HH:MM:SS, MM:SS, H:MM:SS followed by text
        const chapterRegex = /(\d{1,2}:\d{2}(?::\d{2})?)\s*[-–—]?\s*(.*)/;

        lines.forEach(line => {
            const match = line.match(chapterRegex);
            if (match) {
                const timestamp = match[1];
                const title = match[2].trim();
                // Basic validation: ensure title is not empty or just punctuation
                if (title && !/^[.,\/#!$%\^&\*;:{}=\-_`~()]*$/.test(title)) {
                    chapterLines.push({ timestamp, title });
                }
            }
        });
        return chapterLines;
    };

    /**
     * Cleans a YouTube video description by removing URLs, hashtags, and optionally chapter lines.
     * @param {string} description The raw YouTube video description.
     * @param {Array<{timestamp: string, title: string}>} chapters An array of extracted chapter objects.
     * @returns {string} The cleaned description.
     */
    const cleanVideoDescription = (description, chapters) => {
        let cleaned = description;

        // 1. Remove chapter lines
        if (chapters && chapters.length > 0) {
            chapters.forEach(chapter => {
                // Escape special characters in the chapter title for regex
                const escapedTitle = chapter.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                // Create a regex to match the full chapter line (timestamp and title)
                const chapterLineRegex = new RegExp(`(\\d{1,2}:\\d{2}(?::\\d{2})?)\\s*[-–—]?\\s*${escapedTitle}`, 'g');
                cleaned = cleaned.replace(chapterLineRegex, '');
            });
        }
        
        // 2. Remove URLs (http, https, www, or just .com/.org etc. followed by path)
        cleaned = cleaned.replace(/(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9-]+\.(com|org|net|io|co|app)\/[^\s]*)/g, '');

        // 3. Remove hashtags (e.g., #TravelVlog #Adventure)
        cleaned = cleaned.replace(/#\w+/g, '');

        // 4. Remove excessive newlines, trim whitespace
        cleaned = cleaned.replace(/\n\s*\n/g, '\n\n').trim();

        return cleaned;
    };


    const fetchYoutubeData = async () => {
        const apiKey = settings.youtubeApiKey;
        if (!apiKey) {
            setFetchError("Please set your YouTube Data API Key in Technical Settings to use this feature.");
            return;
        }

        const idInfo = extractYoutubeId(youtubeUrlOrId);
        if (!idInfo) {
            setFetchError("Invalid YouTube URL or ID. Please enter a valid Playlist URL/ID or Video URL/ID.");
            return;
        }

        setIsFetchingYoutube(true);
        setFetchError('');
        setFetchedYoutubeData(null); // Clear previous data
        setProjectCoverImageUrl(''); // Clear previous cover image URL

        try {
            if (idInfo.type === 'playlist') {
                await fetchPlaylistVideos(idInfo.id, apiKey);
            } else if (idInfo.type === 'video') {
                await fetchSingleVideo(idInfo.id, apiKey);
            }
        } catch (error) {
            console.error("Error fetching YouTube data:", error);
            setFetchError(`Failed to fetch data from YouTube: ${error.message}. Please check the ID/URL and your API key.`);
        } finally {
            setIsFetchingYoutube(false);
        }
    };

    const fetchPlaylistVideos = async (playlistId, apiKey) => {
        let playlistTitle = '';
        let playlistDescription = '';
        let playlistThumbnailUrl = ''; 
        let videos = [];
        let nextPageToken = '';

        // Fetch playlist details
        const playlistDetailsUrl = `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlistId}&key=${apiKey}`;
        const playlistDetailsResponse = await fetch(playlistDetailsUrl);
        const playlistDetailsData = await playlistDetailsResponse.json();

        if (!playlistDetailsResponse.ok || playlistDetailsData.items.length === 0) {
            throw new Error(playlistDetailsData.error?.message || "Playlist not found or API error.");
        }

        const playlistSnippet = playlistDetailsData.items[0].snippet;
        playlistTitle = playlistSnippet.title;
        playlistDescription = playlistSnippet.description;
        
        // --- UPDATED LOGIC FOR PLAYLIST THUMBNAIL ---
        // Prioritize maxres, then high, medium, default. This uses the thumbnails
        // directly provided by the YouTube API, which are guaranteed to work.
        playlistThumbnailUrl = playlistSnippet.thumbnails.maxres?.url ||
                               playlistSnippet.thumbnails.high?.url ||
                               playlistSnippet.thumbnails.medium?.url ||
                               playlistSnippet.thumbnails.default?.url || '';
        // --- END UPDATED LOGIC ---


        // Fetch videos in the playlist
        do {
            const playlistItemsUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50&key=${apiKey}${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;
            const response = await fetch(playlistItemsUrl);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error?.message || "Failed to fetch playlist items.");
            }

            data.items.forEach(item => {
                if (item.snippet.resourceId.kind === 'youtube#video') {
                    const rawDescription = item.snippet.description || '';
                    const extractedChapters = extractChaptersFromDescription(rawDescription);
                    const cleanedConcept = cleanVideoDescription(rawDescription, extractedChapters);

                    videos.push({
                        id: item.snippet.resourceId.videoId,
                        title: item.snippet.title,
                        description: rawDescription, // Keep raw for reference if needed, but use concept for AI
                        concept: cleanedConcept, // Use cleaned description as concept
                        thumbnailUrl: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
                        chapters: extractedChapters // Store extracted chapters
                    });
                }
            });
            nextPageToken = data.nextPageToken;
        } while (nextPageToken);

        setFetchedYoutubeData({ playlistTitle, playlistDescription, videos });
        setManualPlaylistTitle(playlistTitle);
        setManualPlaylistDescription(playlistDescription);
        setProjectCoverImageUrl(playlistThumbnailUrl); // Set the project cover image from playlist thumbnail
        // Combine fetched videos with existing manual videos (if any)
        setVideosToImport(prevVideos => {
            // Filter out initial empty manual video if YouTube data is fetched
            const existingManualVideos = prevVideos.filter(v => v.isManual && v.title);
            const newFetchedVideos = videos.map(video => ({
                ...video,
                script: '', // Transcripts need separate fetching/AI parsing
                locations_featured: [],
                targeted_keywords: [],
                estimatedLengthMinutes: '', // Placeholder, would need YouTube API for video duration if not already fetched
                isManual: false, // Flag to identify fetched entries
                status: 'pending' // For internal review process
            }));
            return [...newFetchedVideos, ...existingManualVideos];
        });
    };

    const fetchSingleVideo = async (videoId, apiKey) => {
        const videoDetailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${apiKey}`;
        const response = await fetch(videoDetailsUrl);
        const data = await response.json();

        if (!response.ok || data.items.length === 0) {
            throw new Error(data.error?.message || "Video not found or API error.");
        }

        const videoSnippet = data.items[0].snippet;
        const contentDetails = data.items[0].contentDetails;

        // Helper to convert ISO 8601 duration to minutes
        const parseDuration = (iso) => {
            const matches = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
            if (!matches) return '';
            const hours = parseInt(matches[1] || 0, 10);
            const minutes = parseInt(matches[2] || 0, 10);
            const seconds = parseInt(matches[3] || 0, 10);
            return (hours * 60 + minutes + Math.round(seconds / 60)).toString();
        };

        const rawDescription = videoSnippet.description || '';
        const extractedChapters = extractChaptersFromDescription(rawDescription);
        const cleanedConcept = cleanVideoDescription(rawDescription, extractedChapters);

        const fetchedVideo = {
            id: videoId,
            title: videoSnippet.title,
            description: rawDescription, // Keep raw for reference if needed
            concept: cleanedConcept, // Use cleaned description as concept
            thumbnailUrl: videoSnippet.thumbnails.maxres?.url || videoSnippet.thumbnails.high?.url || videoSnippet.thumbnails.medium?.url || videoSnippet.thumbnails.default?.url,
            estimatedLengthMinutes: parseDuration(contentDetails.duration),
            chapters: extractedChapters // Store extracted chapters
        };

        setFetchedYoutubeData({
            playlistTitle: fetchedVideo.title, // Use video title as playlist title for single video import
            playlistDescription: fetchedVideo.description, // Use video description as playlist description
            videos: [fetchedVideo]
        });
        setManualPlaylistTitle(fetchedVideo.title);
        setManualPlaylistDescription(fetchedVideo.description);
        setProjectCoverImageUrl(fetchedVideo.thumbnailUrl); // Set project cover image from single video thumbnail
        setVideosToImport(prevVideos => {
            const existingManualVideos = prevVideos.filter(v => v.isManual && v.title);
            const newFetchedVideo = {
                ...fetchedVideo,
                script: '',
                locations_featured: [],
                targeted_keywords: [],
                isManual: false,
                status: 'pending'
            };
            return [newFetchedVideo, ...existingManualVideos];
        });
    };

    const handleVideoImportChange = (index, field, value) => {
        const newVideos = [...videosToImport];
        newVideos[index][field] = value;
        setVideosToImport(newVideos);
    };

    const addManualVideo = () => {
        setVideosToImport(prevVideos => [
            ...prevVideos,
            {
                id: `manual-${Date.now()}-${prevVideos.length}`,
                title: '',
                concept: '',
                script: '',
                locations_featured: [],
                targeted_keywords: [],
                estimatedLengthMinutes: '',
                thumbnailUrl: '',
                isManual: true,
                status: 'pending',
                chapters: [] // New manual videos start with no chapters
            }
        ]);
    };

    const removeVideo = (idToRemove) => {
        setVideosToImport(prevVideos => prevVideos.filter(video => video.id !== idToRemove));
    };

    // AI Analysis Function (placeholder for now, to be expanded)
    const handleAIAnalyzeVideo = async (video, index) => {
        // This is where you'd call Gemini to parse concept, keywords, locations from description/transcript
        // For now, we just indicate it's processed.
        const newVideos = [...videosToImport];
        newVideos[index] = { ...video, status: 'processed' }; // Mark as AI processed
        setVideosToImport(newVideos);
    };

    const handleAnalyzeClick = () => {
        // This will now pass the parsed YouTube data and manual entries
        if (!manualPlaylistTitle || videosToImport.length === 0 || videosToImport.some(v => !v.title)) {
            console.error('Please ensure playlist title and video titles are present.');
            setFetchError('Please ensure playlist title and video titles are present.');
            return;
        }
        
        const projectData = {
            playlistTitle: manualPlaylistTitle,
            projectOutline: manualPlaylistDescription, // Using description as outline for import
            playlistDescription: manualPlaylistDescription,
            coverImageUrl: projectCoverImageUrl, // Pass the fetched project cover image URL
            videos: videosToImport.map(v => ({
                title: v.title,
                concept: v.concept,
                script: v.script,
                estimatedLengthMinutes: v.estimatedLengthMinutes,
                locations_featured: v.locations_featured,
                targeted_keywords: v.targeted_keywords,
                chapters: v.chapters || [] // Ensure chapters are passed along
            })),
        };
        onAnalyze(projectData);
    };

    return (
        <div className="p-8">
             {(isLoading || isFetchingYoutube) && (
                <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4">
                   <window.LoadingSpinner text={isFetchingYoutube ? "Fetching from YouTube..." : "Analyzing your project..."} />
                </div>
            )}
            <button onClick={onBack} className="flex items-center gap-2 text-secondary-accent hover:text-secondary-accent-light mb-6">
                ⬅️ Back to Dashboard
            </button>
            <h1 className="text-4xl font-bold mb-2">Import Existing Project</h1>
            <p className="text-gray-400 mb-8">Import your existing YouTube playlists or videos for management and future AI features. You can also add unreleased videos manually.</p>
            
            <div className="glass-card p-6 rounded-lg mb-6">
                <h2 className="text-2xl font-semibold mb-4">YouTube Import</h2>
                <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-grow">
                        <label className="block text-sm font-medium text-gray-300 mb-1">YouTube Playlist or Video URL/ID</label>
                        <input
                            type="text"
                            value={youtubeUrlOrId}
                            onChange={(e) => setYoutubeUrlOrId(e.target.value)}
                            className="w-full form-input"
                            placeholder="e.g., https://www.youtube.com/playlist?list=PL_... or a video ID"
                        />
                    </div>
                    <button onClick={fetchYoutubeData} disabled={isFetchingYoutube || !youtubeUrlOrId.trim()} className="px-6 py-2 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold disabled:bg-gray-500 flex-shrink-0">
                        Fetch from YouTube
                    </button>
                </div>
                {fetchError && (
                    <div className="bg-red-900/50 text-red-400 p-3 rounded-lg text-sm mt-4">
                        {fetchError}
                    </div>
                )}
            </div>

            {/* Display fetched/manual project details and videos */}
            {(fetchedYoutubeData || videosToImport.some(v => v.isManual)) && ( // Show this section if any data is present
                <div className="space-y-6">
                    <div className="p-6 glass-card rounded-lg">
                        <h2 className="text-2xl font-semibold mb-4">Project Details</h2>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Playlist Title</label>
                            <input 
                                type="text"
                                value={manualPlaylistTitle}
                                onChange={(e) => setManualPlaylistTitle(e.target.value)}
                                className="w-full form-input"
                                placeholder="Enter the title for the entire series"
                            />
                        </div>
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-300 mb-1">Playlist Description</label>
                            <textarea
                                value={manualPlaylistDescription}
                                onChange={(e) => setManualPlaylistDescription(e.target.value)}
                                rows="5"
                                className="w-full form-textarea"
                                placeholder="If you have a full playlist description already written, paste it here."
                            ></textarea>
                        </div>
                        {/* New section for Project Cover Image */}
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-300 mb-1">Project Cover Image URL (from YouTube)</label>
                            <input 
                                type="text"
                                value={projectCoverImageUrl}
                                onChange={(e) => setProjectCoverImageUrl(e.target.value)}
                                className="w-full form-input"
                                placeholder="Auto-populated from YouTube, or paste your own URL"
                            />
                            {projectCoverImageUrl && (
                                <div className="mt-2 text-center">
                                    <window.ImageComponent src={projectCoverImageUrl} alt="Project Cover Preview" className="max-w-full h-auto rounded-lg mx-auto" style={{ maxHeight: '150px', objectFit: 'cover' }} />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-6 glass-card rounded-lg">
                        <h2 className="text-2xl font-semibold mb-4">Videos to Import</h2>
                        <div className="space-y-6">
                            {videosToImport.map((video, index) => (
                                <div key={video.id} className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 relative flex gap-4">
                                    {video.thumbnailUrl && (
                                        <div className="flex-shrink-0">
                                            <window.ImageComponent src={video.thumbnailUrl} alt={video.title} className="w-28 h-20 object-cover rounded-md" />
                                        </div>
                                    )}
                                    <div className="flex-grow">
                                        <div className="flex justify-between items-start">
                                            <h3 className="text-lg font-bold text-primary-accent">{video.title || (video.isManual ? 'New Video' : 'Untitled Video')}</h3>
                                            {videosToImport.length > 1 && (
                                                <button onClick={() => removeVideo(video.id)} className="text-red-400 hover:text-red-300 text-sm">&times; Remove</button>
                                            )}
                                        </div>
                                        {video.description && !video.isManual && (
                                            <p className="text-sm text-gray-400 mt-1 mb-2 line-clamp-2">
                                                {/* Display the original raw description, or show a warning if chapters were extracted */}
                                                {video.chapters && video.chapters.length > 0 && (
                                                    <span className="text-amber-400">Chapters extracted. Raw description contains links/hashtags and chapters.</span>
                                                )}
                                                {!video.chapters || video.chapters.length === 0 ? video.description : ''}
                                            </p>
                                        )}
                                        <label className="block text-sm font-medium text-gray-300 mb-1">Video Title</label>
                                        <input
                                            type="text"
                                            value={video.title}
                                            onChange={(e) => handleVideoImportChange(index, 'title', e.target.value)}
                                            className="w-full form-input mb-2"
                                            placeholder="Enter video title"
                                        />
                                        <label className="block text-sm font-medium text-gray-300 mb-1">Video Concept / Summary</label>
                                        <textarea 
                                            value={video.concept} // This now holds the cleaned description
                                            onChange={(e) => handleVideoImportChange(index, 'concept', e.target.value)} 
                                            rows="3" 
                                            className="w-full form-textarea" 
                                            placeholder="AI will help summarize this later, or you can edit."
                                        ></textarea>
                                        {video.chapters && video.chapters.length > 0 && (
                                            <div className="mt-2 p-2 bg-gray-900/50 rounded-lg border border-gray-700">
                                                <h4 className="text-xs font-semibold text-gray-400 mb-1">Extracted Chapters:</h4>
                                                <ul className="text-sm text-gray-300">
                                                    {video.chapters.map((chap, i) => (
                                                        <li key={i}>{chap.timestamp} - {chap.title}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        <div className="flex gap-2 mt-2">
                                            {/* This button will trigger AI parsing for this specific video */}
                                            <button onClick={() => handleAIAnalyzeVideo(video, index)} disabled={video.status === 'processed'} className="px-3 py-1 text-sm bg-secondary-accent hover:bg-secondary-accent-darker rounded-lg font-semibold disabled:bg-gray-500">
                                                {video.status === 'processed' ? 'AI Processed' : 'AI Analyze'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button onClick={addManualVideo} className="mt-6 px-4 py-2 bg-secondary-accent hover:bg-secondary-accent-darker rounded-lg text-sm font-semibold">
                            + Add Another Video (Manual)
                        </button>
                    </div>

                    <div className="text-right">
                        <button onClick={handleAnalyzeClick} className="px-8 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors">
                            Prepare Project for AI Plan 🪄
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
