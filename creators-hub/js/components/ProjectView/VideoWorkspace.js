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
    const [descriptionRefinement, setDescriptionRefinement] = useState('');
    const [editableDescription, setEditableDescription] = useState('');
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

    const metadata = useMemo(() => {
        try { return video.metadata ? JSON.parse(video.metadata) : null; } catch { return null; }
    }, [video.metadata]);
    
    useEffect(() => {
        setOpenTask(null);
    }, [video.id]);

    useEffect(() => {
        setFeedbackText(video.tasks?.feedbackText || '');
        setPublishDate(video.tasks?.publishDate || video.publishDate || '');
        setScriptContent(video.script || '');
        setEditableDescription(metadata?.description || '');
        const metaChapters = metadata?.chapters || [];
        setChapters(video.chapters && video.chapters.length > 0 ? video.chapters : metaChapters);
        setThumbnailConcepts(video.tasks?.thumbnailConcepts || (metadata?.thumbnailConcepts || []));
        setAcceptedConcepts(video.tasks?.acceptedConcepts || []);
        setRejectedConcepts(video.tasks?.rejectedConcepts || []);
        setCurrentConceptIndex(video.tasks?.currentConceptIndex || 0);
        setRejectedTitles(video.tasks?.rejectedTitles || []);
    }, [video.tasks, video.script, video.publishDate, video.chapters, metadata]);


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

Your response MUST be a valid JSON object with these exact keys: "titleSuggestions" (array of 3 distinct, catchy titles), "description" (a detailed description with a {{CHAPTERS}} placeholder), "tags" (string of comma-separated tags), "chapters" (array of objects: {"timestamp": "0:00", "title": "..."}), and "thumbnailConcepts" (array of 3-5 structured objects).`;
                
                const parsedJson = await window.aiUtils.callGeminiAPI(prompt, apiKey);
                await updateTask('metadataGenerated', 'pending', { metadata: JSON.stringify(parsedJson), chapters: parsedJson.chapters, 'tasks.thumbnailConcepts': parsedJson.thumbnailConcepts, 'tasks.currentConceptIndex': 0, 'tasks.descriptionAccepted': false, 'tasks.chaptersFinalized': false });

            } else if (type === 'thumbnails') {
                const prompt = `Act as a YouTube thumbnail expert. Based on the video script, title, and rejected concepts, generate 5 new, distinct thumbnail concepts.
Video Title: "${video.chosenTitle}"
Video Script Summary: "${video.concept}"
Rejected Concepts to Avoid: ${rejectedConcepts.map(c => `"${c.textOverlay}"`).join(', ')}
Your response MUST be a valid JSON object with one key "thumbnailConcepts" containing an array of 5 structured objects: {"imageSuggestion": "string", "textOverlay": "string"}.`;
                const parsedJson = await window.aiUtils.callGeminiAPI(prompt, apiKey);
                const newConcepts = [...thumbnailConcepts, ...parsedJson.thumbnailConcepts];
                setThumbnailConcepts(newConcepts);
                await updateTask('thumbnailsGenerated', 'pending', { 'tasks.thumbnailConcepts': newConcepts });
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
        
    const initialScriptingStatus = (video.script && tasks.scripting !== 'pending') ? 'complete' : (tasks.scripting || 'pending');

    const handleAcceptTitle = (title) => {
        const otherTitles = metadata.titleSuggestions.filter(t => t !== title);
        const newRejectedTitles = [...rejectedTitles, ...otherTitles];
        setRejectedTitles(newRejectedTitles);
        updateTask('metadataGenerated', 'pending', { // Keep as pending until description is done
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
    
     const handleRefineDescription = async () => {
        setGenerating('description');
        const prompt = `Rewrite the following YouTube video description based on the user's feedback.
        Original Description:\n---\n${editableDescription}\n---\n
        User Feedback: "${descriptionRefinement}"
        Return a JSON object with one key: {"newDescription": "..."}`;

        try {
            const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings.geminiApiKey, { responseMimeType: "application/json" });
            if (parsedJson && parsedJson.newDescription) {
                setEditableDescription(parsedJson.newDescription);
                setDescriptionRefinement('');
            } else {
                throw new Error("AI failed to return a new description.");
            }
        } catch (error) {
            console.error("Error refining description:", error);
        } finally {
            setGenerating(null);
        }
    };
    
    const handleAcceptDescription = () => {
        const newMetadata = { ...metadata, description: editableDescription };
        updateTask('metadataGenerated', 'pending', { 'tasks.descriptionAccepted': true, metadata: JSON.stringify(newMetadata) });
    };

    const handleChapterChange = (index, field, value) => {
        const newChapters = [...chapters];
        newChapters[index][field] = value;
        setChapters(newChapters);
    };
    
    const handleDeleteChapter = (index) => {
        const newChapters = chapters.filter((_, i) => i !== index);
        setChapters(newChapters);
    };
    
    const handleAddChapter = () => {
        setChapters([...chapters, { timestamp: '', title: '' }]);
    };

    const applyTimestamps = () => {
        const chapterText = chapters.map(c => `${c.timestamp} - ${c.title}`).join('\n');
        const newDescription = metadata.description.replace('{{CHAPTERS}}', chapterText);
        const newMetadata = { ...metadata, description: newDescription, chapters: chapters };
        updateTask('metadataGenerated', 'complete', { metadata: JSON.stringify(newMetadata), chapters: chapters, 'tasks.chaptersFinalized': true });
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
                    {/* Content for Scripting & Recording */}
                </Accordion>

                 <Accordion 
                    title="2. Edit Video" 
                    isOpen={openTask === 'videoEdited'} 
                    onToggle={() => setOpenTask(openTask === 'videoEdited' ? null : 'videoEdited')}
                    status={tasks.videoEdited} 
                    isLocked={isTaskLocked(1)} 
                    onRevisit={() => updateTask('videoEdited', 'pending')}
                >
                    {/* Content for Edit Video */}
                </Accordion>

                <Accordion 
                    title="3. Log Production Changes" 
                    isOpen={openTask === 'feedbackProvided'} 
                    onToggle={() => setOpenTask(openTask === 'feedbackProvided' ? null : 'feedbackProvided')}
                    status={tasks.feedbackProvided} 
                    isLocked={isTaskLocked(2)} 
                    onRevisit={() => updateTask('feedbackProvided', 'pending')}
                >
                    {/* Content for Log Production Changes */}
                </Accordion>

                <Accordion 
                    title="4. Generate Metadata" 
                    isOpen={openTask === 'metadataGenerated'} 
                    onToggle={() => setOpenTask(openTask === 'metadataGenerated' ? null : 'metadataGenerated')}
                    status={video.chosenTitle && tasks.chaptersFinalized ? 'complete' : 'pending'} 
                    isLocked={isTaskLocked(3)} 
                    onRevisit={() => updateTask('metadataGenerated', 'pending', { metadata: '', chosenTitle: '', 'tasks.rejectedTitles': [], 'tasks.descriptionAccepted': false, 'tasks.chaptersFinalized': false })}
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
                            {!video.chosenTitle ? (
                                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                                    <label className="block text-sm font-semibold text-gray-300 mb-3">Step 1: Choose a Title</label>
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
                            ) : !tasks.descriptionAccepted ? (
                                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                                    <label className="block text-sm font-semibold text-gray-300 mb-2">Step 2: Review & Refine Description</label>
                                    <textarea value={editableDescription} onChange={(e) => setEditableDescription(e.target.value)} rows="10" className="w-full form-textarea bg-gray-800/50 resize-y"/>
                                    <div className="mt-4">
                                        <label className="block text-sm font-medium text-gray-300 mb-1">Refinement Instructions</label>
                                        <textarea value={descriptionRefinement} onChange={(e) => setDescriptionRefinement(e.target.value)} rows="2" className="w-full form-textarea" placeholder="e.g., 'Make it more personal', 'Add more about hiking trails'"/>
                                        <div className="flex gap-4 mt-2">
                                            <button onClick={handleRefineDescription} disabled={generating === 'description' || !descriptionRefinement} className="px-4 py-2 text-sm bg-secondary-accent hover:bg-secondary-accent-darker rounded-lg font-semibold disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center">
                                                {generating === 'description' ? <window.LoadingSpinner isButton={true} /> : 'Refine Description'}
                                            </button>
                                            <button onClick={handleAcceptDescription} className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 rounded-lg font-semibold">Accept Description</button>
                                        </div>
                                    </div>
                                </div>
                            ) : !tasks.chaptersFinalized ? (
                                 <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                                    <label className="block text-sm font-semibold text-gray-300 mb-2">Step 3: Edit & Add Chapter Timestamps</label>
                                    <div className="space-y-2">
                                        {chapters.map((chap, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <input type="text" value={chap.timestamp} onChange={(e) => handleChapterChange(i, 'timestamp', e.target.value)} className="form-input w-24" placeholder={parseInt(video.estimatedLengthMinutes) >= 10 ? '00:00' : '0:00'}/> 
                                                <input type="text" value={chap.title} onChange={(e) => handleChapterChange(i, 'title', e.target.value)} className="form-input flex-grow" placeholder="Chapter title"/> 
                                                <button onClick={() => handleDeleteChapter(i)} className="p-2 text-red-400 hover:text-red-300">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-4 flex justify-between">
                                        <button onClick={handleAddChapter} className="px-4 py-2 text-sm bg-secondary-accent hover:bg-secondary-accent-darker rounded-lg font-semibold">+ Add Chapter</button>
                                        <button onClick={applyTimestamps} className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 rounded-lg">Apply Timestamps & Finalize</button>
                                    </div>
                                </div>
                            ) : (
                                 <div className="bg-gray-900/50 p-4 rounded-lg border border-green-500">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-sm font-semibold text-gray-300">Final Description</label>
                                        <window.CopyButton textToCopy={metadata.description} />
                                    </div>
                                    <textarea readOnly value={metadata.description} rows="10" className="w-full form-textarea bg-gray-800/50 resize-y"/>
                                </div>
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
                </Accordion>
                <Accordion 
                    title="6. Upload to YouTube" 
                    isOpen={openTask === 'videoUploaded'} 
                    onToggle={() => setOpenTask(openTask === 'videoUploaded' ? null : 'videoUploaded')}
                    status={tasks.videoUploaded} 
                    isLocked={isTaskLocked(5)} 
                    onRevisit={() => updateTask('videoUploaded', 'pending')}
                >
                </Accordion>
                
                <Accordion 
                    title="7. Generate First Comment" 
                    isOpen={openTask === 'firstCommentGenerated'} 
                    onToggle={() => setOpenTask(openTask === 'firstCommentGenerated' ? null : 'firstCommentGenerated')}
                    status={tasks.firstCommentGenerated} 
                    isLocked={isTaskLocked(6)} 
                    onRevisit={() => updateTask('firstCommentGenerated', 'pending')}
                >
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
