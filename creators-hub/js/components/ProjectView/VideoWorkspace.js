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

    useEffect(() => {
        setFeedbackText(video.tasks?.feedbackText || '');
        setPublishDate(video.tasks?.publishDate || video.publishDate || '');
        setScriptContent(video.script || '');
        setChapters(video.chapters || []);
        setOpenTask(null);
        setThumbnailConcepts(video.tasks?.thumbnailConcepts || []);
        setAcceptedConcepts(video.tasks?.acceptedConcepts || []);
        setRejectedConcepts(video.tasks?.rejectedConcepts || []);
        setCurrentConceptIndex(video.tasks?.currentConceptIndex || 0);
        setRejectedTitles(video.tasks?.rejectedTitles || []);
    }, [video.id, video.tasks]);

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
                    Video Script:\n---\n${video.script}\n---\n
                    YouTube SEO Knowledge Base: ${youtubeSeoKb}\n
                    YouTube Video Title Guidelines: ${videoTitlesKb}\n
                    YouTube Video Description Guidelines: ${videoDescriptionsKb}\n
                    Your response MUST be a valid JSON object with these exact keys: "titleSuggestions" (array of 3 distinct, catchy titles), "description" (a detailed description), "tags" (string of comma-separated tags), "chapters" (array of objects: {"timestamp": "00:00", "title": "..."}), and "thumbnailConcepts" (array of 3-5 structured objects).`;
                
                const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } };
                const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
                const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                if (!response.ok) throw new Error(await response.text());
                const result = await response.json();
                const parsedJson = JSON.parse(result.candidates[0].content.parts[0].text);
                await updateTask('metadataGenerated', 'complete', { metadata: JSON.stringify(parsedJson) }); // chosenTitle is removed
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
        const prompt = `Based on the video script, generate 3 new YouTube titles. Avoid titles similar to these: ${allPreviousTitles.join(', ')}. Return as a JSON object: {"titleSuggestions": ["...", "...", "..."]}`;
        
        try {
            const result = await window.aiUtils.callGeminiAPI(prompt, settings.geminiApiKey);
            if (result && result.titleSuggestions) {
                const newMetadata = { ...metadata, titleSuggestions: result.titleSuggestions };
                await updateTask('metadataGenerated', 'complete', { metadata: JSON.stringify(newMetadata) });
            }
        } catch (error) {
            console.error("Error generating more titles:", error);
        } finally {
            setGenerating(null);
        }
    };

    return (
        <main className="flex-grow">
            {showCanvaModal && <window.CanvaModal canvaUrl="https://www.canva.com/create/youtube-thumbnails/" onClose={() => setShowCanvaModal(false)} />}
            <h3 className="text-2xl lg:text-3xl font-bold text-primary-accent mb-4">{video.chosenTitle || video.title}</h3>
            <div className="space-y-4">
                 <Accordion 
                    title="4. Generate Metadata" 
                    isOpen={openTask === 'metadataGenerated'} 
                    onToggle={() => setOpenTask(openTask === 'metadataGenerated' ? null : 'metadataGenerated')}
                    status={tasks.metadataGenerated} 
                    isLocked={isTaskLocked(3)} 
                    onRevisit={() => updateTask('metadataGenerated', 'pending', { metadata: '', chosenTitle: '', 'tasks.rejectedTitles': [] })}
                >
                     {tasks.metadataGenerated !== 'complete' ? ( 
                        <div>
                            <button onClick={() => handleGenerate('metadata')} disabled={generating === 'metadata' || !isMetadataReady} className="w-full px-5 py-2.5 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold disabled:bg-gray-500 flex items-center justify-center gap-2">
                                {generating === 'metadata' ? <window.LoadingSpinner text="Generating..." /> : '✨ Generate Metadata'}
                            </button>
                            {!isMetadataReady && <p className="text-xs text-amber-400 mt-2 text-center">Please complete Scripting, Video Editing, and Production Change Logging first.</p>}
                        </div>
                     ) : ( 
                        metadata ? (
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
                                        <button onClick={handleGenerateMoreTitles} disabled={generating === 'titles'} className="mt-4 px-4 py-2 text-sm bg-secondary-accent hover:bg-secondary-accent-darker rounded-lg font-semibold disabled:bg-gray-500">
                                            {generating === 'titles' ? <window.LoadingSpinner/> : 'Generate More'}
                                        </button>
                                    </div>
                                )}
                                {/* Rest of metadata shown only after title is accepted */}
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
                        ) : <p className="text-gray-500 text-center py-2 text-sm">Could not parse metadata.</p>
                     )}
                </Accordion>
            </div>
        </main>
    );
});
