// js/components/ProjectView.js

const { useState, useEffect, useMemo, useCallback } = React;

// A simple map to define the tasks and their order
const TASK_PIPELINE = [
    { id: 'scriptGenerated', title: 'Generate Script' },
    { id: 'scriptRecorded', title: 'Record Script' },
    { id: 'videoEdited', title: 'Edit Video' },
    { id: 'feedbackProvided', title: 'Log Changes' },
    { id: 'metadataGenerated', title: 'Generate Metadata' },
    { id: 'thumbnailsGenerated', title: 'Generate Thumbnails' },
    { id: 'videoUploaded', title: 'Upload to YouTube' }
];

// This is the new, focused workspace for a single video.
// It is memoized to prevent unnecessary re-renders.
const VideoWorkspace = React.memo(({ video, settings, project, userId }) => {
    // State for the inputs lives directly and safely inside this component.
    const [feedbackText, setFeedbackText] = useState(video.tasks?.feedbackText || '');
    const [publishDate, setPublishDate] = useState(video.tasks?.publishDate || '');
    const [generating, setGenerating] = useState(null);
    const appId = window.CREATOR_HUB_CONFIG.APP_ID;

    // This effect runs only when the user switches to a different video,
    // safely resetting the state for the new video's data.
    useEffect(() => {
        setFeedbackText(video.tasks?.feedbackText || '');
        setPublishDate(video.tasks?.publishDate || '');
    }, [video.id]);

    const updateTask = async (taskName, data) => {
        const videoDocRef = db.collection(`artifacts/${appId}/users/${userId}/projects/${project.id}/videos`).doc(video.id);
        const updateData = { [`tasks.${taskName}`]: 'complete', ...data };
        await videoDocRef.update(updateData);
    };

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
                const prompt = `${knowledgeBase}\n${styleGuide}\n\nGenerate a complete, engaging voiceover script only for a YouTube video titled "${video.chosenTitle || video.title}". The overall project theme is "${project.playlistDescription}".`;
                const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
                const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
                const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                if (!response.ok) throw new Error(await response.text());
                const result = await response.json();
                await updateTask('scriptGenerated', { script: result.candidates[0].content.parts[0].text });
            } else if (type === 'metadata') {
                const prompt = `${knowledgeBase}\n\nAct as a YouTube SEO expert. Based on the video titled "${video.chosenTitle || video.title}", generate an optimized metadata package. Your response MUST be a valid JSON object, with keys: "titleSuggestions" (array of 3 titles), "description" (string), "tags" (string of comma-separated tags), and "thumbnailConcepts" (array of 3 structured objects: {"imageSuggestion": "string", "textOverlay": "string"}).`;
                const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } };
                const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
                const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                if (!response.ok) throw new Error(await response.text());
                const result = await response.json();
                await updateTask('metadataGenerated', { metadata: result.candidates[0].content.parts[0].text });
            } else if (type === 'thumbnails') {
                if (!video.metadata) return console.error("Metadata needed for thumbnails.");
                const concepts = JSON.parse(video.metadata).thumbnailConcepts || [];
                const generatedThumbnails = [];
                for (const concept of concepts) {
                    const prompt = `A high-CTR YouTube thumbnail. Cinematic, professional photography. ${concept.imageSuggestion}. Text overlay reads: "${concept.textOverlay}".`;
                    const payload = { instances: [{ prompt }], parameters: { "sampleCount": 1 } };
                    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;
                    const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                    if (!response.ok) throw new Error(await response.text());
                    const result = await response.json();
                    if (result.predictions?.[0]?.bytesBase64Encoded) {
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
    
    const currentTaskIndex = useMemo(() => {
        const firstUnfinishedTask = TASK_PIPELINE.findIndex(task => video.tasks?.[task.id] !== 'complete');
        return firstUnfinishedTask === -1 ? TASK_PIPELINE.length : firstUnfinishedTask;
    }, [video.tasks]);

    const renderCurrentTask = () => {
        const taskId = TASK_PIPELINE[currentTaskIndex]?.id;
        if (!taskId) {
            return <div className="text-center p-8 bg-gray-800/50 rounded-lg"><h3 className="text-2xl font-bold text-green-400">🎉 All tasks for this video are complete!</h3></div>;
        }

        switch (taskId) {
            case 'scriptGenerated': return (<>
                <h3 className="text-xl font-semibold mb-4">Generate Voiceover Script</h3>
                <p className="text-gray-400 mb-6">Let's create the foundation for your video. The AI will generate a script based on your project plan and style guide.</p>
                <button onClick={() => handleGenerate('script')} disabled={generating === 'script'} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold disabled:bg-gray-500 flex items-center gap-2">
                    {generating === 'script' ? <LoadingSpinner text="Generating..." /> : '🪄 Generate Script'}
                </button>
            </>);
            case 'scriptRecorded': return (<>
                <h3 className="text-xl font-semibold mb-4">Record Your Voiceover</h3>
                <p className="text-gray-400 mb-6">Time to bring the script to life. Once you've recorded the audio, mark this step as complete.</p>
                <textarea readOnly value={video.script || "Script not generated yet."} rows="10" className="w-full form-textarea bg-gray-800/50 mb-4" />
                <button onClick={() => updateTask('scriptRecorded')} className="px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg font-semibold">Mark as Recorded</button>
            </>);
            case 'videoEdited': return (<>
                <h3 className="text-xl font-semibold mb-4">Edit Your Video</h3>
                <p className="text-gray-400 mb-6">Assemble your footage, add B-roll, music, and graphics. When your edit is locked, you're ready for the next step.</p>
                <button onClick={() => updateTask('videoEdited')} className="px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg font-semibold">Mark as Edited</button>
            </>);
            case 'feedbackProvided': return (<>
                <h3 className="text-xl font-semibold mb-4">Log Production Changes</h3>
                <p className="text-gray-400 mb-6">Did the video change during production? Note any refinements to the script or structure. This helps the AI generate better metadata.</p>
                <textarea value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} rows="5" className="w-full form-textarea" placeholder="e.g., 'We decided to combine the first two locations and added more drone shots of the coastline...'" />
                <button onClick={() => updateTask('feedbackProvided', { 'tasks.feedbackText': feedbackText })} disabled={!feedbackText} className="mt-4 px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg font-semibold disabled:bg-gray-500">Confirm & Save Notes</button>
            </>);
            case 'metadataGenerated': return (<>
                <h3 className="text-xl font-semibold mb-4">Generate Video Metadata</h3>
                <p className="text-gray-400 mb-6">Create SEO-optimized titles, descriptions, and tags to help your video get discovered.</p>
                <button onClick={() => handleGenerate('metadata')} disabled={generating === 'metadata'} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold disabled:bg-gray-500 flex items-center gap-2">
                    {generating === 'metadata' ? <LoadingSpinner text="Generating..." /> : '🪄 Generate Metadata'}
                </button>
            </>);
            case 'thumbnailsGenerated': return (<>
                <h3 className="text-xl font-semibold mb-4">Generate Thumbnails</h3>
                <p className="text-gray-400 mb-6">Create 3 high-impact thumbnail options based on the concepts in your metadata.</p>
                <button onClick={() => handleGenerate('thumbnails')} disabled={generating === 'thumbnails'} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold disabled:bg-gray-500 flex items-center gap-2">
                    {generating === 'thumbnails' ? <LoadingSpinner text="Generating..." /> : '🪄 Generate Thumbnails'}
                </button>
                 {video.tasks?.generatedThumbnails && (
                    <div className="mt-6">
                        <h4 className="font-semibold mb-2">Generated Thumbnails:</h4>
                        <div className="grid grid-cols-3 gap-4">
                            {video.tasks.generatedThumbnails.map((base64, index) => (
                                <img key={index} src={`data:image/png;base64,${base64}`} className="rounded-lg object-cover" alt={`Generated Thumbnail ${index + 1}`}/>
                            ))}
                        </div>
                    </div>
                 )}
            </>);
            case 'videoUploaded': return (<>
                <h3 className="text-xl font-semibold mb-4">Upload to YouTube</h3>
                <p className="text-gray-400 mb-6">The final step! Once you've uploaded the video to YouTube, confirm here and set your scheduled publish date.</p>
                <label className="block text-sm font-medium text-gray-300 mb-2">Publish Date</label>
                <input type="date" value={publishDate} onChange={(e) => setPublishDate(e.target.value)} className="form-input w-auto"/>
                <button onClick={() => updateTask('videoUploaded', { 'tasks.publishDate': publishDate })} disabled={!publishDate} className="mt-4 px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg font-semibold disabled:bg-gray-500">Confirm Upload & Save Date</button>
            </>);
            default: return null;
        }
    };

    return (
        <div className="glass-card p-6 lg:p-8 rounded-lg">
            {/* Stepper UI */}
            <div className="flex items-center justify-between mb-8">
                {TASK_PIPELINE.map((task, index) => (
                    <React.Fragment key={task.id}>
                        <div className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${index < currentTaskIndex ? 'bg-green-500 border-green-500' : index === currentTaskIndex ? 'bg-indigo-500 border-indigo-500' : 'bg-gray-700 border-gray-600'}`}>
                                {index < currentTaskIndex && <span className="text-white">✓</span>}
                            </div>
                            <p className={`text-xs mt-2 text-center ${index === currentTaskIndex ? 'text-white font-bold' : 'text-gray-400'}`}>{task.title}</p>
                        </div>
                        {index < TASK_PIPELINE.length - 1 && <div className={`flex-1 h-0.5 mx-2 ${index < currentTaskIndex ? 'bg-green-500' : 'bg-gray-600'}`}></div>}
                    </React.Fragment>
                ))}
            </div>

            {/* Current Task Content */}
            <div className="bg-gray-900/40 p-6 rounded-lg border border-gray-700">
                {renderCurrentTask()}
            </div>
        </div>
    );
});

// Modal for editing the overall project title and description
const EditProjectModal = ({ project, userId, settings, onClose }) => {
    const [title, setTitle] = useState(project.playlistTitle);
    const [description, setDescription] = useState(project.playlistDescription);
    const [refinement, setRefinement] = useState('');
    const [generating, setGenerating] = useState(false);
    const appId = window.CREATOR_HUB_CONFIG.APP_ID;
    const projectDocRef = db.collection(`artifacts/${appId}/users/${userId}/projects`).doc(project.id);

    const handleSave = async () => {
        await projectDocRef.update({ playlistTitle: title, playlistDescription: description });
        onClose();
    };

    const handleRefine = async (type) => {
        setGenerating(type);
        const apiKey = settings.geminiApiKey || "";
        let prompt = '';
        if (type === 'title') {
            prompt = `The user is creating a YouTube series. The current title is "${title}". Their refinement instruction is: "${refinement}". Generate 3 NEW, creative, and SEO-friendly title suggestions. Return as a JSON object like: {"suggestions": ["title1", "title2", "title3"]}`;
        } else {
            prompt = `The user is creating a YouTube series. The current description is: "${description}". Their refinement instruction is: "${refinement}". Rewrite the playlist description to incorporate the feedback, keeping it SEO-optimized. Return as a JSON object like: {"suggestion": "new description..."}`;
        }

        try {
            const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } };
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
            const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!response.ok) throw new Error(await response.text());
            const result = await response.json();
            const parsedJson = JSON.parse(result.candidates[0].content.parts[0].text);
            if (type === 'title' && parsedJson.suggestions) {
                setTitle(parsedJson.suggestions[0]); // For simplicity, pick the first suggestion
            } else if (type === 'description' && parsedJson.suggestion) {
                setDescription(parsedJson.suggestion);
            }
        } catch (error) {
            console.error(`Error refining ${type}:`, error);
        } finally {
            setGenerating(false);
            setRefinement('');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4">
            <div className="glass-card rounded-lg p-8 w-full max-w-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-6 text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
                <h2 className="text-2xl font-bold mb-6">Edit Project Details</h2>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Project Title</label>
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full form-input" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Project Description</label>
                        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows="6" className="w-full form-textarea" />
                    </div>
                    <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                        <label className="block text-sm font-medium text-gray-300 mb-2">Refine with AI</label>
                        <textarea value={refinement} onChange={(e) => setRefinement(e.target.value)} rows="2" className="w-full form-textarea" placeholder="e.g., 'Make the title more mysterious' or 'Add more about the history in the description'"/>
                        <div className="flex gap-4 mt-2">
                             <button onClick={() => handleRefine('title')} disabled={generating || !refinement} className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold disabled:bg-gray-500 flex items-center gap-2">{generating === 'title' ? <LoadingSpinner/> : 'Refine Title'}</button>
                             <button onClick={() => handleRefine('description')} disabled={generating || !refinement} className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold disabled:bg-gray-500 flex items-center gap-2">{generating === 'description' ? <LoadingSpinner/> : 'Refine Description'}</button>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-4 mt-8">
                    <button onClick={onClose} className="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold">Cancel</button>
                    <button onClick={handleSave} className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold">Save Changes</button>
                </div>
            </div>
        </div>
    );
};

// Modal for editing individual video details
const EditVideoModal = ({ video, userId, settings, project, onClose }) => {
    const [title, setTitle] = useState(video.chosenTitle || video.title);
    const [concept, setConcept] = useState(video.concept);
    const [refinement, setRefinement] = useState('');
    const [generating, setGenerating] = useState(false);
    const appId = window.CREATOR_HUB_CONFIG.APP_ID;
    const videoDocRef = db.collection(`artifacts/${appId}/users/${userId}/projects/${project.id}/videos`).doc(video.id);

    const handleSave = async () => {
        await videoDocRef.update({ chosenTitle: title, concept: concept });
        onClose();
    };
    
    const handleRefine = async (type) => {
        setGenerating(type);
        const apiKey = settings.geminiApiKey || "";
        let prompt = '';
        if (type === 'title') {
            prompt = `The user is creating a YouTube video. The current title is "${title}" and the concept is "${concept}". Their refinement instruction is: "${refinement}". Generate 3 NEW, creative title suggestions. Return as a JSON object like: {"suggestions": ["title1", "title2", "title3"]}`;
        } else {
            prompt = `The user is creating a YouTube video. The current title is "${title}" and the concept is "${concept}". Their refinement instruction is: "${refinement}". Rewrite the video concept to incorporate the feedback. Return as a JSON object like: {"suggestion": "new concept..."}`;
        }

        try {
            const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } };
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
            const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!response.ok) throw new Error(await response.text());
            const result = await response.json();
            const parsedJson = JSON.parse(result.candidates[0].content.parts[0].text);
            if (type === 'title' && parsedJson.suggestions) {
                setTitle(parsedJson.suggestions[0]);
            } else if (type === 'concept' && parsedJson.suggestion) {
                setConcept(parsedJson.suggestion);
            }
        } catch (error) {
            console.error(`Error refining ${type}:`, error);
        } finally {
            setGenerating(false);
            setRefinement('');
        }
    };


    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4">
            <div className="glass-card rounded-lg p-8 w-full max-w-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-6 text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
                <h2 className="text-2xl font-bold mb-6">Edit Video Details</h2>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Video Title</label>
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full form-input" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Video Concept</label>
                        <textarea value={concept} onChange={(e) => setConcept(e.target.value)} rows="4" className="w-full form-textarea" />
                    </div>
                     <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                        <label className="block text-sm font-medium text-gray-300 mb-2">Refine with AI</label>
                        <textarea value={refinement} onChange={(e) => setRefinement(e.target.value)} rows="2" className="w-full form-textarea" placeholder="e.g., 'Make the title catchier' or 'Focus the concept on the hiking aspect'"/>
                        <div className="flex gap-4 mt-2">
                             <button onClick={() => handleRefine('title')} disabled={generating || !refinement} className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold disabled:bg-gray-500 flex items-center gap-2">{generating === 'title' ? <LoadingSpinner/> : 'Refine Title'}</button>
                             <button onClick={() => handleRefine('concept')} disabled={generating || !refinement} className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold disabled:bg-gray-500 flex items-center gap-2">{generating === 'concept' ? <LoadingSpinner/> : 'Refine Concept'}</button>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-4 mt-8">
                    <button onClick={onClose} className="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold">Cancel</button>
                    <button onClick={handleSave} className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold">Save Changes</button>
                </div>
            </div>
        </div>
    );
};


const ProjectView = ({ project, userId, onBack, settings }) => {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeVideoId, setActiveVideoId] = useState(null);
    const [editingProject, setEditingProject] = useState(false);
    const [editingVideo, setEditingVideo] = useState(null);
    const appId = window.CREATOR_HUB_CONFIG.APP_ID;

    useEffect(() => {
        if (!userId || !project?.id) return;
        
        const videosCollectionRef = db.collection(`artifacts/${appId}/users/${userId}/projects/${project.id}/videos`);
        const unsubscribe = videosCollectionRef.onSnapshot(querySnapshot => {
            const videosData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                tasks: doc.data().tasks || {}
            })).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            
            setVideos(videosData);

            if (loading && videosData.length > 0 && !activeVideoId) {
                setActiveVideoId(videosData[0].id);
            }
            setLoading(false);
        }, error => {
            console.error("Error fetching videos:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userId, project.id]);

    const activeVideo = useMemo(() => videos.find(v => v.id === activeVideoId), [videos, activeVideoId]);
    
    const calculateProgress = (tasks) => {
        const completedTasks = TASK_PIPELINE.filter(task => tasks[task.id] === 'complete').length;
        return (completedTasks / TASK_PIPELINE.length) * 100;
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            {editingProject && <EditProjectModal project={project} userId={userId} settings={settings} onClose={() => setEditingProject(false)}/>}
            {editingVideo && <EditVideoModal video={editingVideo} userId={userId} project={project} settings={settings} onClose={() => setEditingVideo(null)}/>}

            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                     <button onClick={onBack} className="flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-2">
                        ⬅️ Back to All Projects
                    </button>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl lg:text-4xl font-bold text-white">{project.playlistTitle || 'Untitled Project'}</h1>
                        <button onClick={() => setEditingProject(true)} className="p-2 rounded-full bg-gray-700/50 hover:bg-gray-600/50">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z" /></svg>
                        </button>
                    </div>
                    <p className="text-gray-400 mt-1">{project.playlistDescription || ''}</p>
                </div>
            </header>
            
            {loading ? <div className="flex justify-center mt-16"><LoadingSpinner text="Loading Project..." /></div> : (
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Sidebar */}
                    <aside className="lg:w-1/3 xl:w-1/4">
                        <div className="glass-card p-4 rounded-lg">
                            <h2 className="text-lg font-semibold mb-3 px-2">Videos</h2>
                            <div className="space-y-1">
                                {videos.map(video => {
                                    const progress = calculateProgress(video.tasks);
                                    return (
                                        <div key={video.id} className={`flex items-center gap-2 rounded-lg transition-colors ${activeVideoId === video.id ? 'bg-blue-600' : 'bg-gray-800/50 hover:bg-gray-700/60'}`}>
                                            <button
                                                onClick={() => setActiveVideoId(video.id)}
                                                className="flex-grow text-left p-3"
                                            >
                                                <p className="font-semibold text-white">{video.chosenTitle || video.title}</p>
                                                <div className="w-full bg-gray-600 rounded-full h-1.5 mt-2">
                                                    <div className="bg-green-500 h-1.5 rounded-full" style={{width: `${progress}%`}}></div>
                                                </div>
                                            </button>
                                            <button onClick={() => setEditingVideo(video)} className="p-2 mr-2 rounded-full hover:bg-gray-600/80">
                                                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z" /></svg>
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </aside>

                    {/* Main Workspace */}
                    <main className="lg:w-2/3 xl:w-3/4">
                        {activeVideo ? (
                            <VideoWorkspace 
                                video={activeVideo} 
                                settings={settings} 
                                project={project} 
                                userId={userId}
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full glass-card p-8 rounded-lg">
                                <p className="text-gray-400">Select a video to begin.</p>
                            </div>
                        )}
                    </main>
                </div>
            )}
        </div>
    );
};
