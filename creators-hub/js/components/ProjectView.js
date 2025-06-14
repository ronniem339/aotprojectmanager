// js/components/ProjectView.js

const { useState, useEffect, useMemo, useCallback } = React;

// The pipeline is now simplified. "Record Script" is part of the first task.
const TASK_PIPELINE = [
    { id: 'scripting', title: 'Scripting & Recording' },
    { id: 'videoEdited', title: 'Edit Video' },
    { id: 'feedbackProvided', title: 'Log Changes' },
    { id: 'metadataGenerated', title: 'Generate Metadata' },
    { id: 'thumbnailsGenerated', title: 'Generate Thumbnails' },
    { id: 'videoUploaded', title: 'Upload to YouTube' }
];

const TaskItem = ({ title, status, isLocked, children, onRevisit }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const isCurrent = !isLocked && status !== 'complete' && status !== 'locked';

    useEffect(() => {
        setIsExpanded(isCurrent);
    }, [isCurrent]);

    // Added amber color for the 'locked' (Script ready to record) state.
    const statusClasses = useMemo(() => {
        if (status === 'complete') return 'bg-green-500 border-green-500';
        if (status === 'locked') return 'bg-amber-500 border-amber-500';
        if (isCurrent) return 'bg-indigo-500 border-indigo-500';
        return 'bg-gray-700 border-gray-600';
    }, [status, isCurrent]);

    return (
        <div className={`glass-card p-4 rounded-lg transition-all ${isLocked ? 'opacity-50' : ''} ${isCurrent ? 'border-2 border-indigo-500' : 'border border-gray-700'}`}>
            <div className="flex justify-between items-center cursor-pointer" onClick={() => !isCurrent && setIsExpanded(!isExpanded)}>
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${statusClasses}`}>
                        {status === 'complete' && <span className="text-white">✓</span>}
                    </div>
                    <h4 className="text-lg font-semibold">{title}</h4>
                </div>
                {status === 'complete' && onRevisit && (
                     <button onClick={(e) => { e.stopPropagation(); onRevisit(); }} className="text-xs text-blue-400 hover:text-blue-300 px-3 py-1 rounded-full hover:bg-gray-700">Revisit</button>
                )}
            </div>
            {isExpanded && <div className="mt-4 pt-4 border-t border-gray-700">{children}</div>}
        </div>
    );
};


const VideoWorkspace = React.memo(({ video, settings, project, userId }) => {
    const [feedbackText, setFeedbackText] = useState(video.tasks?.feedbackText || '');
    const [publishDate, setPublishDate] = useState(video.tasks?.publishDate || '');
    const [generating, setGenerating] = useState(null);
    const [scriptContent, setScriptContent] = useState(video.script || '');
    const [refinementText, setRefinementText] = useState('');
    
    const appId = window.CREATOR_HUB_CONFIG.APP_ID;

    useEffect(() => {
        setFeedbackText(video.tasks?.feedbackText || '');
        setPublishDate(video.tasks?.publishDate || '');
        setScriptContent(video.script || '');
    }, [video.id, video.script]);

    const updateTask = async (taskName, status, extraData = {}) => {
        const videoDocRef = db.collection(`artifacts/${appId}/users/${userId}/projects/${project.id}/videos`).doc(video.id);
        const updateData = { [`tasks.${taskName}`]: status, ...extraData };
        await videoDocRef.update(updateData);
    };

    const handleGenerate = async (type, currentContent, refinement) => {
        const apiKey = settings.geminiApiKey || "";
        if (!apiKey) { console.error("Please set your Gemini API Key in the settings first."); return; }
        setGenerating(type);

        const knowledgeBase = settings.youtubeSeoKnowledgeBase || window.CREATOR_HUB_CONFIG.YOUTUBE_SEO_KNOWLEDGE_BASE;
        const styleGuide = `This is my Style Guide, you must adhere to it:\n${settings.styleGuideText || 'Default informative tone'}`;

        try {
            if (type === 'script') {
                const isRefining = !!currentContent;
                const prompt = isRefining
                    ? `Your task is to refine an existing voiceover script based on user feedback.
Original Script:
---
${currentContent}
---
User's Refinement Instructions: "${refinement}"
Rewrite the entire script to incorporate the feedback, maintaining the core message and adhering to the style guide.
Style Guide: ${styleGuide}
IMPORTANT: Your response MUST contain ONLY the updated voiceover script text.`
                    : `Your task is to generate a complete, engaging voiceover script for a YouTube video based on the following details.
Video Title: "${video.chosenTitle || video.title}"
Overall Project Theme: "${project.playlistDescription}"
Style Guide: ${styleGuide}
Knowledge Base: ${knowledgeBase}
IMPORTANT: Your response MUST contain ONLY the voiceover script text, ready for a voice actor. Do NOT include titles, descriptions, metadata, or any other text outside of the script itself.`;

                const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
                const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
                const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                if (!response.ok) throw new Error(await response.text());
                const result = await response.json();
                setScriptContent(result.candidates[0].content.parts[0].text);
                if(isRefining) setRefinementText('');

            } else if (type === 'metadata') {
                const prompt = `${knowledgeBase}\n\nAct as a YouTube SEO expert. Based on the video titled "${video.chosenTitle || video.title}", generate an optimized metadata package. Your response MUST be a valid JSON object, with keys: "titleSuggestions" (array of 3 titles), "description" (string), "tags" (string of comma-separated tags), and "thumbnailConcepts" (array of 3 structured objects: {"imageSuggestion": "string", "textOverlay": "string"}).`;
                const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } };
                const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
                const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                if (!response.ok) throw new Error(await response.text());
                const result = await response.json();
                await updateTask('metadataGenerated', 'complete', { metadata: result.candidates[0].content.parts[0].text });
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
                await updateTask('thumbnailsGenerated', 'complete', { 'tasks.generatedThumbnails': generatedThumbnails });
            }
        } catch (error) {
            console.error(`Error generating ${type}:`, error);
        } finally {
            setGenerating(null);
        }
    };
    
    const tasks = video.tasks || {};
    const isTaskLocked = (index) => index > 0 && tasks[TASK_PIPELINE[index - 1].id] !== 'complete';
    
    return (
        <div className="space-y-3">
             <div className="glass-card p-6 rounded-lg mb-6">
                <h3 className="text-2xl font-bold text-blue-300 mb-3">{video.chosenTitle || video.title}</h3>
                <p className="text-gray-300 mb-4">{video.concept}</p>
                {(video.locations_featured?.length > 0 || video.targeted_keywords?.length > 0) && (
                    <div className="space-y-2 pt-4 border-t border-gray-700">
                        {video.locations_featured?.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-semibold text-gray-400">LOCATIONS:</span>
                                {video.locations_featured.map(loc => ( <span key={loc} className="px-2.5 py-1 text-xs bg-sky-800 text-sky-200 rounded-full">{loc}</span> ))}
                            </div>
                        )}
                        {video.targeted_keywords?.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-semibold text-gray-400">KEYWORDS:</span>
                                {video.targeted_keywords.map(kw => ( <span key={kw} className="px-2.5 py-1 text-xs bg-teal-800 text-teal-200 rounded-full">{kw}</span> ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
            
            <TaskItem title="1. Scripting & Recording" status={tasks.scripting} isLocked={isTaskLocked(0)} onRevisit={() => updateTask('scripting', 'pending')}>
                {tasks.scripting === 'complete' ? (
                    <div>
                        <h4 className="text-sm font-semibold text-gray-400 mb-2">Final Script (Recorded)</h4>
                        <textarea readOnly value={video.script || ""} rows="10" className="w-full form-textarea bg-gray-800/50" />
                    </div>
                ) : tasks.scripting === 'locked' ? (
                    <div>
                        <h4 className="text-sm font-semibold text-gray-400 mb-2">Script Locked - Ready to Record</h4>
                        <textarea readOnly value={scriptContent} rows="10" className="w-full form-textarea bg-gray-800/50 mb-4" />
                        <button onClick={() => updateTask('scripting', 'complete')} className="px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg font-semibold">Mark as Recorded</button>
                    </div>
                ) : (
                    <div>
                        {!scriptContent ? (
                             <button onClick={() => handleGenerate('script')} disabled={generating === 'script'} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold disabled:bg-gray-500 flex items-center gap-2">{generating === 'script' ? <LoadingSpinner text="Generating..." /> : '🪄 Generate Script'}</button>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Script Draft</label>
                                    <textarea value={scriptContent} onChange={(e) => setScriptContent(e.target.value)} rows="12" className="w-full form-textarea" />
                                </div>
                                <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Refinement Instructions</label>
                                    <textarea value={refinementText} onChange={(e) => setRefinementText(e.target.value)} rows="2" className="w-full form-textarea" placeholder="e.g., 'Make the tone more energetic' or 'Add a section about the local food'"/>
                                    <button onClick={() => handleGenerate('script', scriptContent, refinementText)} disabled={generating === 'script' || !refinementText} className="mt-2 px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold disabled:bg-gray-500 flex items-center gap-2">{generating === 'script' ? <LoadingSpinner/> : 'Refine with AI'}</button>
                                </div>
                                <button onClick={() => updateTask('scripting', 'locked', { script: scriptContent })} className="px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg font-semibold">Confirm & Lock Script</button>
                            </div>
                        )}
                    </div>
                )}
            </TaskItem>

            <TaskItem title="2. Edit Video" status={tasks.videoEdited} isLocked={isTaskLocked(1)} onRevisit={() => updateTask('videoEdited', 'pending')}>
                 {tasks.videoEdited !== 'complete' && <button onClick={() => updateTask('videoEdited', 'complete')} className="px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg font-semibold">Mark as Edited</button>}
            </TaskItem>

            <TaskItem title="3. Log Production Changes" status={tasks.feedbackProvided} isLocked={isTaskLocked(2)} onRevisit={() => updateTask('feedbackProvided', 'pending')}>
                <textarea value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} rows="5" className="w-full form-textarea" placeholder="e.g., 'We decided to combine the first two locations...'" readOnly={tasks.feedbackProvided === 'complete'} />
                {tasks.feedbackProvided !== 'complete' && <button onClick={() => updateTask('feedbackProvided', 'complete', { 'tasks.feedbackText': feedbackText })} disabled={!feedbackText} className="mt-4 px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg font-semibold disabled:bg-gray-500">Confirm & Save Notes</button>}
            </TaskItem>
            
            <TaskItem title="4. Generate Metadata" status={tasks.metadataGenerated} isLocked={isTaskLocked(3)} onRevisit={() => updateTask('metadataGenerated', 'pending')}>
                 {tasks.metadataGenerated !== 'complete' ? (
                    <button onClick={() => handleGenerate('metadata')} disabled={generating === 'metadata'} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold disabled:bg-gray-500 flex items-center gap-2">{generating === 'metadata' ? <LoadingSpinner text="Generating..." /> : '🪄 Generate Metadata'}</button>
                 ) : ( <textarea readOnly value={video.metadata ? JSON.stringify(JSON.parse(video.metadata), null, 2) : ""} rows="10" className="w-full form-textarea bg-gray-800/50" /> )}
            </TaskItem>
            
            <TaskItem title="5. Generate Thumbnails" status={tasks.thumbnailsGenerated} isLocked={isTaskLocked(4)} onRevisit={() => updateTask('thumbnailsGenerated', 'pending', { 'tasks.generatedThumbnails': [] })}>
                {tasks.thumbnailsGenerated !== 'complete' ? (
                    <button onClick={() => handleGenerate('thumbnails')} disabled={generating === 'thumbnails'} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold disabled:bg-gray-500 flex items-center gap-2">{generating === 'thumbnails' ? <LoadingSpinner text="Generating..." /> : '🪄 Generate Thumbnails'}</button>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">{tasks.generatedThumbnails?.map((base64, index) => ( <img key={index} src={`data:image/png;base64,${base64}`} className="rounded-lg object-cover" alt={`Generated Thumbnail ${index + 1}`}/> ))}</div>
                )}
            </TaskItem>

            <TaskItem title="6. Upload to YouTube" status={tasks.videoUploaded} isLocked={isTaskLocked(5)} onRevisit={() => updateTask('videoUploaded', 'pending')}>
                <label className="block text-sm font-medium text-gray-300 mb-2">Publish Date</label>
                <input type="date" value={publishDate} onChange={(e) => setPublishDate(e.target.value)} className="form-input w-auto" readOnly={tasks.videoUploaded === 'complete'}/>
                {tasks.videoUploaded !== 'complete' && <button onClick={() => updateTask('videoUploaded', 'complete', { 'tasks.publishDate': publishDate })} disabled={!publishDate} className="mt-4 px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg font-semibold disabled:bg-gray-500">Confirm Upload & Save Date</button>}
            </TaskItem>
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
    const [showConfirmComplete, setShowConfirmComplete] = useState(false); // New state for confirmation
    const appId = window.CREATOR_HUB_CONFIG.APP_ID;
    const videoDocRef = db.collection(`artifacts/${appId}/users/${userId}/projects/${project.id}/videos`).doc(video.id);

    const handleSave = async () => {
        await videoDocRef.update({ chosenTitle: title, concept: concept });
        onClose();
    };

    const handleMarkAllComplete = async () => {
        const completedTasks = {};
        TASK_PIPELINE.forEach(task => {
            completedTasks[task.id] = 'complete';
        });
        await videoDocRef.update({ tasks: completedTasks });
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
                    {/* Fast-forward section */}
                    <div className="p-4 bg-amber-900/30 rounded-lg border border-amber-700">
                        <label className="block text-sm font-medium text-amber-300 mb-2">Fast-Forward</label>
                         <p className="text-xs text-amber-300/80 mb-3">If this video is already published, you can mark all production tasks as complete.</p>
                        {showConfirmComplete ? (
                            <div className="flex items-center gap-4">
                                <p className="text-sm font-semibold text-white">Are you sure?</p>
                                <button onClick={handleMarkAllComplete} className="px-4 py-1 text-sm bg-red-600 hover:bg-red-700 rounded-lg">Yes, Confirm</button>
                                <button onClick={() => setShowConfirmComplete(false)} className="px-4 py-1 text-sm bg-gray-600 hover:bg-gray-500 rounded-lg">Cancel</button>
                            </div>
                        ) : (
                             <button onClick={() => setShowConfirmComplete(true)} className="px-4 py-2 text-sm bg-amber-600 hover:bg-amber-700 rounded-lg font-semibold">Mark All Tasks Complete</button>
                        )}
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
    const [isDescriptionVisible, setIsDescriptionVisible] = useState(false);
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
    }, [userId, project.id, loading]);

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
                    <div className="mt-2">
                        <button onClick={() => setIsDescriptionVisible(!isDescriptionVisible)} className="text-sm text-blue-400 hover:text-blue-300">
                             {isDescriptionVisible ? 'Hide' : 'Show'} Description
                        </button>
                    </div>
                    {isDescriptionVisible && <p className="text-gray-400 mt-2 max-w-2xl">{project.playlistDescription || ''}</p>}
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
