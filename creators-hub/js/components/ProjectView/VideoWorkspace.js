// js/components/ProjectView/VideoWorkspace.js

const { useState, useEffect, useMemo, useCallback } = React;

// A new common Accordion component for collapsible sections
const Accordion = ({ title, children, isOpen, onToggle, status = 'pending', isLocked = false, onRevisit }) => {
    const statusColors = {
        'complete': 'border-green-500 bg-green-900/20',
        'pending': 'border-blue-500 bg-blue-900/20',
        'locked': 'border-gray-700 bg-gray-800/50 opacity-60',
        'revisited': 'border-amber-500 bg-amber-900/20',
    };
    const statusTextColors = {
        'complete': 'text-green-400',
        'pending': 'text-blue-400',
        'locked': 'text-gray-400',
        'revisited': 'text-amber-400',
    };

    return (
        <div className={`glass-card rounded-lg border ${statusColors[status] || 'border-gray-700 bg-gray-800/50'} overflow-hidden`}>
            <div 
                onClick={onToggle} 
                className="w-full flex justify-between items-center p-4 text-left font-semibold text-white transition-colors duration-200 cursor-pointer"
                role="button"
                tabIndex={0}
                aria-expanded={isOpen}
            >
                <div className="flex items-center gap-3">
                    <span className="text-xl">{isOpen ? '▼' : '►'}</span>
                    <h3 className="text-xl">{title}</h3>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${statusTextColors[status] || 'text-gray-400'}`}>
                        {status === 'complete' && 'Complete'}
                        {status === 'pending' && 'Pending'}
                        {status === 'locked' && 'Locked'}
                        {status === 'revisited' && 'Revisited'}
                        {!status && 'Not Started'}
                    </span>
                    {onRevisit && (status === 'complete' || status === 'locked') && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onRevisit(); }} 
                            className="text-xs text-secondary-accent hover:text-secondary-accent-light px-2 py-1 rounded border border-gray-600 hover:border-gray-500"
                        >
                            Revisit
                        </button>
                    )}
                </div>
            </div>
            <div className={`transition-max-height duration-500 ease-in-out overflow-hidden ${isOpen ? 'max-h-screen' : 'max-h-0'}`}>
                <div className="p-4 pt-0">
                    {isLocked && !isOpen ? (
                        <div className="p-4 bg-gray-900/50 rounded-lg text-gray-400 text-center text-sm">
                            This task is locked until previous steps are completed.
                        </div>
                    ) : (
                        children
                    )}
                </div>
            </div>
        </div>
    );
};


window.VideoWorkspace = React.memo(({ video, settings, project, userId }) => {
    const [feedbackText, setFeedbackText] = useState(video.tasks?.feedbackText || '');
    const [publishDate, setPublishDate] = useState(video.tasks?.publishDate || video.publishDate || '');
    const [generating, setGenerating] = useState(null);
    const [scriptContent, setScriptContent] = useState(video.script || '');
    const [refinementText, setRefinementText] = useState('');
    const [chapters, setChapters] = useState(video.chapters || []);
    const [showFullScreenScript, setShowFullScreenScript] = useState(false);
    const [showCanvaModal, setShowCanvaModal] = useState(false);
    
    // Thumbnail Tinder state
    const [thumbnailConcepts, setThumbnailConcepts] = useState(video.tasks?.thumbnailConcepts || []);
    const [acceptedConcepts, setAcceptedConcepts] = useState(video.tasks?.acceptedConcepts || []);
    const [rejectedConcepts, setRejectedConcepts] = useState(video.tasks?.rejectedConcepts || []);
    const [currentConceptIndex, setCurrentConceptIndex] = useState(video.tasks?.currentConceptIndex || 0);

    const [openTask, setOpenTask] = useState(null);
    const [rejectedTitles, setRejectedTitles] = useState(video.tasks?.rejectedTitles || []);

    const appId = window.CREATOR_HUB_CONFIG.APP_ID;

    // This effect resets the accordion state ONLY when the video ID changes
    useEffect(() => {
        setOpenTask(null);
    }, [video.id]);

    // This effect updates local state when the current video's data changes, without closing the accordion
    useEffect(() => {
        setFeedbackText(video.tasks?.feedbackText || '');
        setPublishDate(video.tasks?.publishDate || video.publishDate || '');
        setScriptContent(video.script || '');
        setChapters(video.chapters || []);
        setThumbnailConcepts(video.tasks?.thumbnailConcepts || []);
        setAcceptedConcepts(video.tasks?.acceptedConcepts || []);
        setRejectedConcepts(video.tasks?.rejectedConcepts || []);
        setCurrentConceptIndex(video.tasks?.currentConceptIndex || 0);
        setRejectedTitles(video.tasks?.rejectedTitles || []);
    }, [video.tasks, video.script, video.publishDate, video.chapters]);


    const updateTask = async (taskName, status, extraData = {}) => {
        const videoDocRef = db.collection(`artifacts/${appId}/users/${userId}/projects/${project.id}/videos`).doc(video.id);
        await videoDocRef.update({ 
            [`tasks.${taskName}`]: status, 
            ...extraData 
        });
    };

    const handleGenerate = async (type) => {
        const apiKey = settings.geminiApiKey || "";
        if (!apiKey) { console.error("Please set your Gemini API Key in the settings first."); return; }
        setGenerating(type);

        const youtubeSeoKb = settings.knowledgeBases?.youtube?.youtubeSeoKnowledgeBase || '';
        const whoAmIKb = settings.knowledgeBases?.youtube?.whoAmI || '';
        const videoTitlesKb = settings.knowledgeBases?.youtube?.videoTitles || '';
        const videoDescriptionsKb = settings.knowledgeBases?.youtube?.videoDescriptions || '';

        try {
            if (type === 'metadata') {
                const prompt = `Act as a YouTube SEO expert. Based on the video script provided below, generate an optimized metadata package.
Video Script:
---
${video.script}
---
YouTube SEO Knowledge Base: ${youtubeSeoKb}
YouTube Video Title Guidelines: ${videoTitlesKb}
YouTube Video Description Guidelines: ${videoDescriptionsKb}
AVOID these previously rejected titles: ${rejectedTitles.join(', ')}

Your response MUST be a valid JSON object with these exact keys: "titleSuggestions" (array of 3 distinct, catchy titles), "description" (a detailed description), "tags" (string of comma-separated tags), "chapters" (array of objects: {"timestamp": "00:00", "title": "..."}), and "thumbnailConcepts" (array of 3-5 structured objects).`;
                
                const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } };
                const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
                const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                if (!response.ok) throw new Error(await response.text());
                const result = await response.json();
                const parsedJson = JSON.parse(result.candidates[0].content.parts[0].text);
                await updateTask('metadataGenerated', 'pending', { metadata: JSON.stringify(parsedJson) });
            }
        } catch (error) {
            console.error(`Error generating ${type}:`, error);
        } finally {
            setGenerating(null);
        }
    };
    
    const tasks = video.tasks || {};
    const isTaskLocked = (index) => index > 0 && tasks[window.CREATOR_HUB_CONFIG.TASK_PIPELINE[index - 1].id] !== 'complete'; 
    const isMetadataReady = tasks.scripting === 'complete' && tasks.videoEdited === 'complete' && tasks.feedbackProvided === 'complete';
    
    const metadata = useMemo(() => {
        try { return video.metadata ? JSON.parse(video.metadata) : null; } catch { return null; }
    }, [video.metadata]);
    
    const initialScriptingStatus = (video.script && tasks.scripting !== 'pending') ? 'complete' : (tasks.scripting || 'pending');

    const handleAcceptTitle = (title) => {
        const otherTitles = metadata.titleSuggestions.filter(t => t !== title);
        const newRejectedTitles = [...rejectedTitles, ...otherTitles];
        setRejectedTitles(newRejectedTitles);
        updateTask('metadataGenerated', 'complete', { 
            chosenTitle: title,
            'tasks.rejectedTitles': newRejectedTitles 
        });
    };
    
    const handleGenerateMoreTitles = async () => {
        setGenerating('titles');
        const allPreviousTitles = [...(metadata?.titleSuggestions || []), ...rejectedTitles];
        
        const prompt = `Act as a YouTube SEO expert. Based on the video script provided below, generate 3 new, creative YouTube titles.
Video Script:
---
${video.script}
---
IMPORTANT: Avoid generating titles similar to these ones that have already been seen: ${allPreviousTitles.join(', ')}.
Your response MUST be a valid JSON object with a single key "titleSuggestions" containing an array of 3 strings. Example: {"titleSuggestions": ["New Title 1", "New Title 2", "New Title 3"]}`;

        try {
            const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings.geminiApiKey, { responseMimeType: "application/json" });
            if (parsedJson && parsedJson.titleSuggestions) {
                const newMetadata = { ...metadata, titleSuggestions: parsedJson.titleSuggestions };
                await updateTask('metadataGenerated', 'pending', { metadata: JSON.stringify(newMetadata), 'tasks.rejectedTitles': allPreviousTitles });
            } else {
                throw new Error("AI returned an invalid format for title suggestions.");
            }
        } catch (error) {
            console.error("Error generating more titles:", error);
        } finally {
            setGenerating(null);
        }
    };

    const handleThumbnailDecision = async (decision) => {
        const concept = thumbnailConcepts[currentConceptIndex];
        let newAccepted = [...acceptedConcepts];
        let newRejected = [...rejectedConcepts];

        if (decision === 'accept') {
            newAccepted.push(concept);
            setAcceptedConcepts(newAccepted);
        } else {
            newRejected.push(concept);
            setRejectedConcepts(newRejected);
        }

        const nextIndex = currentConceptIndex + 1;
        setCurrentConceptIndex(nextIndex);

        const updatedTasks = {
            'tasks.thumbnailConcepts': thumbnailConcepts,
            'tasks.acceptedConcepts': newAccepted,
            'tasks.rejectedConcepts': newRejected,
            'tasks.currentConceptIndex': nextIndex
        };

        if (newAccepted.length >= 3) {
            await updateTask('thumbnailsGenerated', 'complete', updatedTasks);
        } else {
            await updateTask('thumbnailsGenerated', 'pending', updatedTasks);
            const remainingConcepts = thumbnailConcepts.length - nextIndex;
            if (newAccepted.length + remainingConcepts < 3) {
                handleGenerate('thumbnails'); // Fetch more if we can't possibly reach 3
            }
        }
    };
    
    return (
        <main className="flex-grow">
            {showCanvaModal && <window.CanvaModal canvaUrl="https://www.canva.com/create/youtube-thumbnails/" onClose={() => setShowCanvaModal(false)} />}
            <h3 className="text-2xl lg:text-3xl font-bold text-primary-accent mb-4">{video.chosenTitle || video.title}</h3>
            <div className="space-y-4">
                 <Accordion 
                    title="1. Scripting & Recording" 
                    isOpen={openTask === 'scripting'} 
                    onToggle={() => setOpenTask(openTask === 'scripting' ? null : 'scripting')}
                    status={initialScriptingStatus} 
                    isLocked={isTaskLocked(0)} 
                    onRevisit={() => updateTask('scripting', 'pending', { script: '' })}
                >
                    <div>
                        <h4 className="text-sm font-semibold text-gray-400 mb-2">Script Content</h4>
                        <textarea 
                            value={scriptContent || ""} 
                            onChange={(e) => setScriptContent(e.target.value)} 
                            rows="10" 
                            className="w-full form-textarea bg-gray-800/50"
                            placeholder="Paste your script here, or click the button below to generate one with AI."
                            readOnly={initialScriptingStatus === 'complete' && tasks.scripting !== 'revisited'} 
                        />
                        <div className="flex flex-col sm:flex-row gap-3 mt-4">
                            {!scriptContent && <button onClick={() => handleGenerate('script')} disabled={generating === 'script'} className="flex-grow px-5 py-2.5 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-2">{generating === 'script' ? <window.LoadingSpinner isButton={true} /> : '✨ Generate Script with AI'}</button>}
                            {scriptContent && (
                                <>
                                    <button onClick={() => setShowFullScreenScript(true)} className="flex-grow px-5 py-2.5 bg-secondary-accent hover:bg-secondary-accent-darker rounded-lg font-semibold">View Fullscreen Script</button>
                                    {initialScriptingStatus !== 'complete' || tasks.scripting === 'revisited' ? ( 
                                        <button onClick={() => updateTask('scripting', 'complete', { script: scriptContent })} className="flex-grow px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg font-semibold">Confirm & Lock Script</button>
                                    ) : (
                                        <p className="flex-grow text-gray-400 text-sm flex items-center justify-center p-2 border border-gray-700 rounded-lg">Script is locked. Use "Revisit" to edit.</p>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </Accordion>

                 <Accordion 
                    title="2. Edit Video" 
                    isOpen={openTask === 'videoEdited'} 
                    onToggle={() => setOpenTask(openTask === 'videoEdited' ? null : 'videoEdited')}
                    status={tasks.videoEdited} 
                    isLocked={isTaskLocked(1)} 
                    onRevisit={() => updateTask('videoEdited', 'pending')}
                >
                    {tasks.videoEdited !== 'complete' ? (
                        <button onClick={() => updateTask('videoEdited', 'complete')} className="w-full px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg font-semibold">Mark as Edited</button>
                    ) : (
                        <p className="text-gray-400 text-center py-2 text-sm">This task is marked as complete.</p>
                    )}
                </Accordion>

                <Accordion 
                    title="3. Log Production Changes" 
                    isOpen={openTask === 'feedbackProvided'} 
                    onToggle={() => setOpenTask(openTask === 'feedbackProvided' ? null : 'feedbackProvided')}
                    status={tasks.feedbackProvided} 
                    isLocked={isTaskLocked(2)} 
                    onRevisit={() => updateTask('feedbackProvided', 'pending')}
                >
                    <textarea value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} rows="5" className="w-full form-textarea" placeholder="e.g., 'We decided to combine the first two locations...'" readOnly={tasks.feedbackProvided === 'complete'} />
                    {tasks.feedbackProvided !== 'complete' ? (
                        <div className="flex flex-col sm:flex-row gap-4 mt-4">
                            <button onClick={() => updateTask('feedbackProvided', 'complete', { 'tasks.feedbackText': 'No changes were made.' })} className="w-full px-5 py-2.5 bg-secondary-accent hover:bg-secondary-accent-darker rounded-lg font-semibold">No Changes Made</button>
                            <button onClick={() => updateTask('feedbackProvided', 'complete', { 'tasks.feedbackText': feedbackText })} disabled={!feedbackText} className="w-full px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg font-semibold disabled:opacity-75 disabled:cursor-not-allowed">Confirm & Save Notes</button>
                        </div>
                    ) : (
                        <p className="text-gray-400 text-center py-2 text-sm">This task is marked as complete.</p>
                    )}
                </Accordion>

                <Accordion 
                    title="4. Generate Metadata" 
                    isOpen={openTask === 'metadataGenerated'} 
                    onToggle={() => setOpenTask(openTask === 'metadataGenerated' ? null : 'metadataGenerated')}
                    status={video.chosenTitle ? 'complete' : tasks.metadataGenerated || 'pending'} 
                    isLocked={isTaskLocked(3)} 
                    onRevisit={() => updateTask('metadataGenerated', 'pending', { metadata: '', chosenTitle: '', 'tasks.rejectedTitles': [] })}
                >
                     {!metadata ? ( 
                        <div className="text-center py-4">
                            {generating === 'metadata' ? (
                                <window.LoadingSpinner text="Generating..." />
                            ) : (
                                <>
                                <button onClick={() => handleGenerate('metadata')} disabled={!isMetadataReady} className="w-full max-w-xs mx-auto px-5 py-2.5 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                     ✨ Generate Metadata
                                </button>
                                {!isMetadataReady && <p className="text-xs text-amber-400 mt-2">Please complete Scripting, Video Editing, and Production Change Logging first.</p>}
                                </>
                            )}
                        </div>
                     ) : ( 
                        <div className="space-y-6">
                            {video.chosenTitle ? (
                                <div className="bg-gray-900/50 p-4 rounded-lg border border-green-500">
                                    <label className="block text-sm font-semibold text-gray-300 mb-2">Accepted Title</label>
                                    <p className="font-bold text-lg text-white">{video.chosenTitle}</p>
                                </div>
                            ) : (
                                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                                    <label className="block text-sm font-semibold text-gray-300 mb-3">Choose a Title</label>
                                    <div className="space-y-3">
                                        {metadata.titleSuggestions.map(title => ( 
                                            <div key={title} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-gray-800/50">
                                                <span>{title}</span>
                                                <button onClick={() => handleAcceptTitle(title)} className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 rounded-lg font-semibold flex-shrink-0">Accept</button>
                                            </div>
                                        ))}
                                    </div>
                                    <button onClick={handleGenerateMoreTitles} disabled={generating === 'titles'} className="mt-4 px-4 py-2 text-sm bg-secondary-accent hover:bg-secondary-accent-darker rounded-lg font-semibold disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center">
                                        {generating === 'titles' ? <window.LoadingSpinner isButton={true}/> : 'Generate More'}
                                    </button>
                                </div>
                            )}
                            {video.chosenTitle && (
                                <>
                                    <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="block text-sm font-semibold text-gray-300">Description</label>
                                            <window.CopyButton textToCopy={metadata.description} />
                                        </div>
                                        <textarea readOnly value={metadata.description} rows="10" className="w-full form-textarea bg-gray-800/50 resize-y"/>
                                    </div>
                                    {/* Chapters, tags, etc. would be here */}
                                </>
                            )}
                        </div> 
                     )}
                </Accordion>

                 <Accordion 
                    title="5. Generate Thumbnails" 
                    isOpen={openTask === 'thumbnailsGenerated'} 
                    onToggle={() => setOpenTask(openTask === 'thumbnailsGenerated' ? null : 'thumbnailsGenerated')}
                    status={tasks.thumbnailsGenerated} 
                    isLocked={isTaskLocked(4)} 
                    onRevisit={() => updateTask('thumbnailsGenerated', 'pending')}
                >
                    {tasks.thumbnailsGenerated !== 'complete' ? (
                        <div className="text-center p-4">
                            <p className="mb-4 text-lg">Accepted Concepts: <span className="font-bold text-green-400">{acceptedConcepts.length}</span> / 3</p>
                            {currentConceptIndex < thumbnailConcepts.length ? (
                                <div className="max-w-sm mx-auto">
                                    <div className="glass-card p-6 rounded-lg shadow-lg mb-4">
                                        <p className="font-semibold">Concept {currentConceptIndex + 1}</p>
                                        <p className="text-sm text-gray-300 mt-2"><strong>Image Suggestion:</strong> {thumbnailConcepts[currentConceptIndex].imageSuggestion}</p>
                                        <p className="text-sm text-gray-300"><strong>Text Overlay:</strong> {thumbnailConcepts[currentConceptIndex].textOverlay}</p>
                                    </div>
                                    <div className="flex justify-center gap-4">
                                        <button onClick={() => handleThumbnailDecision('reject')} className="p-4 bg-red-600 hover:bg-red-700 rounded-full text-white font-bold text-2xl w-16 h-16 flex items-center justify-center">✗</button>
                                        <button onClick={() => handleThumbnailDecision('accept')} className="p-4 bg-green-600 hover:bg-green-700 rounded-full text-white font-bold text-2xl w-16 h-16 flex items-center justify-center">✓</button>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <button 
                                        onClick={() => handleGenerate('thumbnails')} 
                                        disabled={generating === 'thumbnails' || !metadata}
                                        className="px-5 py-2.5 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-2 mx-auto"
                                    >
                                        {generating === 'thumbnails' ? <window.LoadingSpinner isButton={true}/> : '💡 Generate Thumbnail Concepts'}
                                    </button>
                                    {!metadata && <p className="text-xs text-amber-400 mt-2">Metadata must be generated first.</p>}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                             <h4 className="text-lg font-semibold text-green-400">3 Concepts Accepted!</h4>
                            {acceptedConcepts.map((concept, index) => (
                                <div key={index} className="glass-card p-4 rounded-lg">
                                    <p className="font-semibold">Accepted Concept {index + 1}:</p>
                                    <p className="text-sm text-gray-300 mt-1"><strong>Image Suggestion:</strong> {concept.imageSuggestion}</p>
                                    <p className="text-sm text-gray-300"><strong>Text Overlay:</strong> {concept.textOverlay}</p>
                                    <button
                                        onClick={() => setShowCanvaModal(true)}
                                        className="inline-block mt-3 px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold"
                                    >
                                        Create on Canva
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </Accordion>
                <Accordion 
                    title="6. Upload to YouTube" 
                    isOpen={openTask === 'videoUploaded'} 
                    onToggle={() => setOpenTask(openTask === 'videoUploaded' ? null : 'videoUploaded')}
                    status={tasks.videoUploaded} 
                    isLocked={isTaskLocked(5)} 
                    onRevisit={() => updateTask('videoUploaded', 'pending')}
                >
                    <label className="block text-sm font-medium text-gray-300 mb-2">Publish Date</label>
                    <input type="date" value={publishDate} onChange={(e) => setPublishDate(e.target.value)} className="form-input w-full sm:w-auto mb-4" readOnly={tasks.videoUploaded === 'complete'}/>
                    {tasks.videoUploaded !== 'complete' ? (
                        <button onClick={() => updateTask('videoUploaded', 'complete', { publishDate: publishDate })} disabled={!publishDate} className="w-full px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg font-semibold disabled:opacity-75 disabled:cursor-not-allowed">Confirm Upload & Save Date</button>
                    ) : (
                        <p className="text-gray-400 text-center py-2 text-sm">Video was uploaded on: {publishDate}</p>
                    )}
                </Accordion>
                
                <Accordion 
                    title="7. Generate First Comment" 
                    isOpen={openTask === 'firstCommentGenerated'} 
                    onToggle={() => setOpenTask(openTask === 'firstCommentGenerated' ? null : 'firstCommentGenerated')}
                    status={tasks.firstCommentGenerated} 
                    isLocked={isTaskLocked(6)} 
                    onRevisit={() => updateTask('firstCommentGenerated', 'pending')}
                >
                    {tasks.firstCommentGenerated !== 'complete' ? ( 
                        <button onClick={() => handleGenerate('firstComment')} disabled={generating === 'firstComment'} className="w-full px-5 py-2.5 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                            {generating === 'firstComment' ? <window.LoadingSpinner isButton={true}/> : '✨ Generate Comment'}
                        </button>
                    ) : ( 
                        <div>
                            <h4 className="text-sm font-semibold text-gray-400 mb-2">Generated Comment</h4>
                            <textarea readOnly value={tasks.firstComment || ""} rows="5" className="w-full form-textarea bg-gray-800/50" />
                        </div> 
                    )}
                </Accordion>
            </div>
            {showFullScreenScript && (
                <window.FullScreenScriptView 
                    scriptContent={scriptContent} 
                    onClose={() => setShowFullScreenScript(false)} 
                />
            )}
        </main>
    );
});
