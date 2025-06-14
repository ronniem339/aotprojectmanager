// js/components/ProjectView.js

const VideoWorkflow = ({ video, settings, project, userId }) => {
    // State is now initialized from the video prop to prevent focus loss on re-renders.
    const [feedbackText, setFeedbackText] = useState(video.tasks?.feedbackText || '');
    const [publishDate, setPublishDate] = useState(video.tasks?.publishDate || '');
    const [generating, setGenerating] = useState(null);
    const appId = window.CREATOR_HUB_CONFIG.APP_ID;

    // A helper function to update the task status in Firestore
    const updateTask = async (taskName, data) => {
        const videoDocRef = db.collection(`artifacts/${appId}/users/${userId}/projects/${project.id}/videos`).doc(video.id);
        const updateData = { [`tasks.${taskName}`]: 'complete', ...data };
        await videoDocRef.update(updateData);
    };
    
    // Function to handle all AI generation API calls
    const handleGenerate = async (type) => {
        const apiKey = settings.geminiApiKey || "";
        if (!apiKey) {
            console.error("Please set your Gemini API Key in the settings first.");
            return;
        }
        setGenerating(type);
        
        const knowledgeBase = settings.youtubeSeoKnowledgeBase || window.CREATOR_HUB_CONFIG.YOUTUBE_SEO_KNOWLEDGE_BASE;
        const styleGuide = `This is my Style Guide, you must adhere to it:\n${settings.styleGuideText || 'Default informative tone'}`;

        try {
            if (type === 'script') {
                const footageInfo = `This is the footage I have:\n${project.locations?.map(l => `- ${l.name}: ${Object.entries(l.footage || {}).filter(([, v]) => v).map(([k]) => k).join(', ')}`).join('\n')}`;
                const videoLength = `The video should be between 5 and 20 minutes long. Adjust script length accordingly.`;
                const prompt = `${knowledgeBase}\n${styleGuide}\n\n${footageInfo}\n\n${videoLength}\n\nGenerate a complete, engaging voiceover script only for a YouTube video titled "${video.chosenTitle || video.title}". The overall project theme is "${project.playlistDescription}". The script should be broken down into logical sections using markdown headings (e.g., # Hook, # Introduction, # Location: [Location Name], # Outro).`;
                const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
                const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
                const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                if (!response.ok) throw new Error(await response.text());
                const result = await response.json();
                const generatedText = result.candidates[0].content.parts[0].text;
                await updateTask('scriptGenerated', { script: generatedText });

            } else if (type === 'metadata') {
                const prompt = `${knowledgeBase}\n\nAct as a YouTube SEO expert. Based on the video titled "${video.chosenTitle || video.title}" with concept "${video.concept}", generate an optimized metadata package. Your response MUST be a valid JSON object with NO other text before or after it, with keys: "titleSuggestions" (array of 3 distinct, catchy titles), "description" (string), "tags" (string of comma-separated tags), and "thumbnailConcepts" (array of 3 distinct, high-CTR thumbnail concepts as structured objects: {"imageSuggestion": "string", "textOverlay": "string"}).`;
                const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } };
                const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
                const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                 if (!response.ok) throw new Error(await response.text());
                const result = await response.json();
                const generatedText = result.candidates[0].content.parts[0].text;
                await updateTask('metadataGenerated', { metadata: generatedText });

            } else if (type === 'thumbnails') {
                 if (!video.metadata) {
                    console.error("Metadata must be generated before thumbnails.");
                    return;
                }
                const metadata = JSON.parse(video.metadata);
                const thumbnailConcepts = metadata.thumbnailConcepts || [];
                if(thumbnailConcepts.length === 0) {
                     console.error("No thumbnail concepts found in metadata.");
                     return;
                }
                
                const generatedThumbnails = [];
                for (const concept of thumbnailConcepts) {
                    const prompt = `A high-CTR YouTube thumbnail. Cinematic, professional photography. ${concept.imageSuggestion}. Text overlay reads: "${concept.textOverlay}".`;
                    const payload = { instances: [{ prompt: prompt }], parameters: { "sampleCount": 1 } };
                    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;
                    const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                    if (!response.ok) throw new Error(await response.text());
                    const result = await response.json();
                    if (result.predictions && result.predictions[0]?.bytesBase64Encoded) {
                         generatedThumbnails.push(result.predictions[0].bytesBase64Encoded);
                    }
                }
                 await updateTask('thumbnailsGenerated', { 'tasks.generatedThumbnails': generatedThumbnails });
            }
        } catch (error) {
            console.error(`Error generating ${type}:`, error);
        } finally {
            setGenerating(null);
        }
    };
    
    // The TaskItem component now shows its children if it's not locked.
    // The content inside the children will decide whether to show an action button or the result.
    const TaskItem = ({ title, status, isLocked, children }) => (
        <div className={`glass-card p-4 rounded-lg transition-all ${isLocked ? 'opacity-50' : ''}`}>
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${status === 'complete' ? 'bg-green-500' : 'bg-gray-600'}`}>
                        {status === 'complete' ? <span className="text-white">✓</span> : <span className="text-gray-400">●</span>}
                    </div>
                    <h4 className="text-lg font-semibold">{title}</h4>
                </div>
            </div>
            {!isLocked && <div className="mt-4 pl-11">{children}</div>}
        </div>
    );
    
    const videoTasks = video.tasks || {};

    return (
        <div className="space-y-4">
            <TaskItem title="1. Generate Script" status={videoTasks.scriptGenerated} isLocked={false}>
                {videoTasks.scriptGenerated !== 'complete' && (
                    <button onClick={() => handleGenerate('script')} disabled={generating === 'script'} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold disabled:bg-gray-500 flex items-center gap-2">
                        {generating === 'script' ? <LoadingSpinner /> : '🪄 Generate'}
                    </button>
                )}
                {video.script && <textarea readOnly value={video.script} rows="10" className="w-full form-textarea mt-4 bg-gray-800/50" />}
            </TaskItem>

            <TaskItem title="2. Record Script" status={videoTasks.scriptRecorded} isLocked={!videoTasks.scriptGenerated}>
                 {videoTasks.scriptRecorded !== 'complete' && <button onClick={() => updateTask('scriptRecorded')} className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold">Mark as Complete</button>}
            </TaskItem>
            
            <TaskItem title="3. Edit Video" status={videoTasks.videoEdited} isLocked={!videoTasks.scriptRecorded}>
                 {videoTasks.videoEdited !== 'complete' && <button onClick={() => updateTask('videoEdited')} className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold">Mark as Complete</button>}
            </TaskItem>
            
            <TaskItem title="4. Log Production Changes" status={videoTasks.feedbackProvided} isLocked={!videoTasks.videoEdited}>
                <p className="text-sm text-gray-400 mb-2">Did anything change during production? Describe any refinements to the script or structure.</p>
                <textarea value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} rows="4" className="w-full form-textarea" placeholder="e.g., 'We decided to combine the first two locations and added more drone shots of the coastline...'" readOnly={videoTasks.feedbackProvided === 'complete'}></textarea>
                {videoTasks.feedbackProvided !== 'complete' && <button onClick={() => updateTask('feedbackProvided', { 'tasks.feedbackText': feedbackText })} disabled={!feedbackText} className="mt-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold disabled:bg-gray-500">Confirm & Save Notes</button>}
            </TaskItem>
            
            <TaskItem title="5. Generate Video Metadata" status={videoTasks.metadataGenerated} isLocked={!videoTasks.feedbackProvided}>
                 {videoTasks.metadataGenerated !== 'complete' && (
                    <button onClick={() => handleGenerate('metadata')} disabled={generating === 'metadata'} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold disabled:bg-gray-500 flex items-center gap-2">
                        {generating === 'metadata' ? <LoadingSpinner /> : '🪄 Generate'}
                    </button>
                 )}
                 {video.metadata && <textarea readOnly value={JSON.stringify(JSON.parse(video.metadata), null, 2)} rows="10" className="w-full form-textarea mt-4 bg-gray-800/50" />}
            </TaskItem>
            
            <TaskItem title="6. Generate Video Thumbnails" status={videoTasks.thumbnailsGenerated} isLocked={!videoTasks.metadataGenerated}>
                 {videoTasks.thumbnailsGenerated !== 'complete' && (
                    <button onClick={() => handleGenerate('thumbnails')} disabled={generating === 'thumbnails'} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold disabled:bg-gray-500 flex items-center gap-2">
                        {generating === 'thumbnails' ? <LoadingSpinner /> : '🪄 Generate (x3)'}
                    </button>
                 )}
                 {videoTasks.generatedThumbnails && (
                    <div className="flex gap-4 mt-4">
                        {videoTasks.generatedThumbnails.map((base64, index) => (
                            <img key={index} src={`data:image/png;base64,${base64}`} className="rounded-lg w-1/3" alt={`Generated Thumbnail ${index + 1}`}/>
                        ))}
                    </div>
                 )}
            </TaskItem>

            <TaskItem title="7. Upload to YouTube" status={videoTasks.videoUploaded} isLocked={!videoTasks.thumbnailsGenerated}>
                 <p className="text-sm text-gray-400 mb-2">After uploading to YouTube, confirm here and set the scheduled publish date.</p>
                 <input type="date" value={publishDate} onChange={(e) => setPublishDate(e.target.value)} className="form-input w-auto" readOnly={videoTasks.videoUploaded === 'complete'}/>
                 {videoTasks.videoUploaded !== 'complete' && <button onClick={() => updateTask('videoUploaded', { 'tasks.publishDate': publishDate })} disabled={!publishDate} className="ml-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold disabled:bg-gray-500">Confirm & Save Date</button>}
            </TaskItem>
        </div>
    );
};

const ProjectView = ({ project, userId, onBack, settings }) => {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeVideoId, setActiveVideoId] = useState(null);
    const [isDescriptionVisible, setIsDescriptionVisible] = useState(false); // State for description visibility
    const appId = window.CREATOR_HUB_CONFIG.APP_ID;

    useEffect(() => {
        if (!userId || !project?.id) return;
        
        const videosCollectionRef = db.collection(`artifacts/${appId}/users/${userId}/projects/${project.id}/videos`);
        
        const unsubscribe = videosCollectionRef.onSnapshot(querySnapshot => {
            const videosData = [];
            querySnapshot.forEach((doc) => { 
                const data = doc.data();
                videosData.push({ 
                    id: doc.id, 
                    ...data,
                    tasks: data.tasks || {} 
                }); 
            });
            videosData.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            setVideos(videosData);
            if (videosData.length > 0 && !activeVideoId) {
                setActiveVideoId(videosData[0].id);
            }
            setLoading(false);
        }, (error) => { console.error("Error fetching videos:", error); setLoading(false); });

        return () => unsubscribe();
    }, [userId, project.id]);

    const activeVideo = videos.find(v => v.id === activeVideoId);
    
    const calculateProgress = (tasks) => {
        const totalTasks = 7;
        const completedTasks = Object.values(tasks).filter(status => status === 'complete').length;
        return (completedTasks / totalTasks) * 100;
    };

    return (
        <div className="p-4 md:p-8">
            <button onClick={onBack} className="flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-6">
                ⬅️ Back to Dashboard
            </button>
            <div className="mb-8 p-6 glass-card rounded-lg">
                <div className="flex justify-between items-start">
                    <h2 className="text-3xl font-bold text-blue-300">{project.playlistTitle || project.title}</h2>
                    <button onClick={() => setIsDescriptionVisible(!isDescriptionVisible)} className="text-sm text-blue-400 hover:text-blue-300">
                        {isDescriptionVisible ? 'Hide Description' : 'Show Description'}
                    </button>
                </div>
                {isDescriptionVisible && <p className="mt-4 text-gray-300 whitespace-pre-wrap border-t border-gray-700 pt-4">{project.playlistDescription || ''}</p>}
            </div>
            {loading ? <LoadingSpinner /> : (
                <div className="flex flex-col md:flex-row gap-8">
                    <div className="md:w-1/3 lg:w-1/4">
                        <h3 className="text-xl font-semibold mb-4">Videos</h3>
                        <div className="space-y-2">
                            {videos.map(video => {
                                const progress = calculateProgress(video.tasks || {});
                                return (
                                    <button
                                        key={video.id}
                                        onClick={() => setActiveVideoId(video.id)}
                                        className={`w-full text-left p-3 rounded-lg transition-colors ${activeVideoId === video.id ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                                    >
                                        <p className="font-semibold">{video.chosenTitle || video.title}</p>
                                        <div className="w-full bg-gray-500 rounded-full h-1.5 mt-2">
                                          <div className="bg-green-500 h-1.5 rounded-full" style={{width: `${progress}%`}}></div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <div className="md:w-2/3 lg:w-3/4">
                        {activeVideo && <VideoWorkflow key={activeVideo.id} video={activeVideo} settings={settings} project={project} userId={userId} />}
                    </div>
                </div>
            )}
        </div>
    );
};
