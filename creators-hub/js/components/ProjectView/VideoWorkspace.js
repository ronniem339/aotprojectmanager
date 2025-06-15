// js/components/ProjectView/VideoWorkspace.js

const { useState, useEffect, useMemo, useCallback } = React;

// A new common Accordion component for collapsible sections
const Accordion = ({ title, children, isOpen, onToggle, status = 'pending', isLocked = false, onRevisit }) => {
    const statusColors = {
        'complete': 'border-green-500 bg-green-900/20',
        'pending': 'border-blue-500 bg-blue-900/20',
        'locked': 'border-gray-700 bg-gray-800/50 opacity-60',
        'revisited': 'border-amber-500 bg-amber-900/20', // Using amber for revisited state
    };
    const statusTextColors = {
        'complete': 'text-green-400',
        'pending': 'text-blue-400',
        'locked': 'text-gray-400',
        'revisited': 'text-amber-400',
    };

    return (
        <div className={`glass-card rounded-lg border ${statusColors[status] || 'border-gray-700 bg-gray-800/50'} overflow-hidden`}>
            {/* Changed from <button> to <div> to avoid button nesting warning */}
            <div 
                onClick={onToggle} 
                className="w-full flex justify-between items-center p-4 text-left font-semibold text-white transition-colors duration-200 cursor-pointer"
                role="button" // Indicate it's clickable for accessibility
                tabIndex={0} // Make it focusable
                aria-expanded={isOpen} // ARIA attribute for accordion state
            >
                <div className="flex items-center gap-3">
                    <span className="text-xl">{isOpen ? '▼' : '►'}</span> {/* Updated icons for better display */}
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
                    {isLocked && !isOpen ? ( // Only show locked message if section is actually locked and not open
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
    const [videoStats, setVideoStats] = useState(video.stats || null);
    const [isFetchingStats, setIsFetchingStats] = useState(false);
    const [statsErrorMessage, setStatsErrorMessage] = useState('');
    const [showCanvaModal, setShowCanvaModal] = useState(false);

    // Thumbnail Tinder state
    const [thumbnailConcepts, setThumbnailConcepts] = useState(video.tasks?.thumbnailConcepts || []);
    const [acceptedConcepts, setAcceptedConcepts] = useState(video.tasks?.acceptedConcepts || []);
    const [rejectedConcepts, setRejectedConcepts] = useState(video.tasks?.rejectedConcepts || []);
    const [currentConceptIndex, setCurrentConceptIndex] = useState(video.tasks?.currentConceptIndex || 0);

    const [openTask, setOpenTask] = useState(null);

    const appId = window.CREATOR_HUB_CONFIG.APP_ID;

    useEffect(() => {
        setFeedbackText(video.tasks?.feedbackText || '');
        setPublishDate(video.tasks?.publishDate || video.publishDate || '');
        setScriptContent(video.script || '');
        setChapters(video.chapters || []);
        setVideoStats(video.stats || null);
        setStatsErrorMessage('');
        setOpenTask(null);
        // Reset thumbnail states when video changes
        setThumbnailConcepts(video.tasks?.thumbnailConcepts || []);
        setAcceptedConcepts(video.tasks?.acceptedConcepts || []);
        setRejectedConcepts(video.tasks?.rejectedConcepts || []);
        setCurrentConceptIndex(video.tasks?.currentConceptIndex || 0);
    }, [video.id, video.script, video.publishDate, video.chapters, video.tasks, video.stats]);
    
    useEffect(() => {
        if (video.metadata) {
            try {
                const parsed = JSON.parse(video.metadata);
                if(parsed.chapters) {
                    setChapters(parsed.chapters.map(ch => ({ ...ch, timestamp: ch.timestamp || '00:00' })));
                }
            } catch(e) { console.error("Could not parse chapters from metadata", e); }
        } else if (video.chapters) {
            setChapters(video.chapters.map(ch => ({ ...ch, timestamp: ch.timestamp || '00:00' })));
        }
    }, [video.metadata, video.chapters]);

    const updateTask = async (taskName, status, extraData = {}) => {
        const videoDocRef = db.collection(`artifacts/${appId}/users/${userId}/projects/${project.id}/videos`).doc(video.id);
        await videoDocRef.update({ 
            [`tasks.${taskName}`]: status, 
            ...extraData 
        });
    };
    
    const handleGenerate = async (type, currentContent, refinement) => {
        const apiKey = settings.geminiApiKey || "";
        if (!apiKey) { console.error("Please set your Gemini API Key in the settings first."); return; }
        setGenerating(type);

        const youtubeSeoKb = settings.knowledgeBases?.youtube?.youtubeSeoKnowledgeBase || '';
        const whoAmIKb = settings.knowledgeBases?.youtube?.whoAmI || '';
        const videoTitlesKb = settings.knowledgeBases?.youtube?.videoTitles || '';
        const videoDescriptionsKb = settings.knowledgeBases?.youtube?.videoDescriptions || '';
        const firstPinnedCommentExpertKb = settings.knowledgeBases?.youtube?.firstPinnedCommentExpert || '';
        const styleGuideText = settings.styleGuideText;

        try {
            if (type === 'script') {
                 const isRefining = !!currentContent;
                const commonVideoStructure = `# Hook\n# Introduction\n# Where is ${video.chosenTitle?.split(':')[0]?.trim() || project.playlistTitle?.split(':')[0]?.trim() || 'this place'}\n# History of ${video.chosenTitle?.split(':')[0]?.trim() || project.playlistTitle?.split(':')[0]?.trim() || 'this place'}\n# Key Landmark: [Insert a relevant landmark from video concept/locations if available, e.g., RRS Discovery]\n# Things to Do\n# Eating Out\n# Day Trips from ${video.chosenTitle?.split(':')[0]?.trim() || project.playlistTitle?.split(':')[0]?.trim() || 'this place'}\n# Conclusion`.trim();
                const prompt = isRefining
                    ? `Your task is to refine an existing voiceover script based on user feedback.\nOriginal Script:\n---\n${currentContent}\n---\nUser's Refinement Instructions: "${refinement}"\nRewrite the entire script to incorporate the feedback, maintaining the core message and adhering to the style guide and user persona.\nUser Persona (Who Am I): ${whoAmIKb || 'N/A'}\nStyle Guide: ${styleGuideText || 'N/A'}\nIMPORTANT: Your response MUST contain ONLY the updated voiceover script text. Do NOT include any production notes like [MUSIC CUE], [SOUND EFFECT], or [B-ROLL FOOTAGE]. The script should be broken down into logical sections using markdown headings (e.g., # Hook, # Introduction).`
                    : `Your task is to generate a complete, engaging voiceover script for a YouTube video based on the following details.\nVideo Title: "${video.chosenTitle || video.title}".\nOverall Project Theme: "${project.playlistDescription}".\nVideo Concept: "${video.concept}".\nLocations Featured: ${video.locations_featured?.join(', ') || 'N/A'}.\nTargeted Keywords: ${video.targeted_keywords?.join(', ')}\nUser Persona (Who Am I): ${whoAmIKb || 'N/A'}\nStyle Guide: ${styleGuideText || 'N/A'}\nYouTube SEO Knowledge Base: ${youtubeSeoKb || 'N/A'}\nThe script should follow a structure similar to this example, adapted to the video's specific content:\n${commonVideoStructure}\nIMPORTANT: Your response MUST contain ONLY the voiceover script text, ready for a voice actor. Do NOT include production notes (e.g., [MUSIC CUE], [SOUND EFFECT], or [B-ROLL FOOTAGE]), titles, descriptions, metadata, or any other text outside of the script itself. The script must be broken down into logical sections using markdown headings (e.g., # Hook, # Introduction, # Location: [Location Name], # Outro). Focus on the words the narrator needs to say.`;
                const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
                const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
                const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                if (!response.ok) throw new Error(await response.text());
                const result = await response.json();
                const newScript = result.candidates[0].content.parts[0].text;
                setScriptContent(newScript);
                await updateTask('scripting', 'pending', { script: newScript });
                if (isRefining) setRefinementText('');
            } else if (type === 'metadata' || type === 'thumbnails') {
                 const thumbnailIdeasKb = settings.knowledgeBases?.youtube?.thumbnailIdeas || '';
                 const rejectedConceptsSummary = rejectedConcepts.map(c => `- ${c.imageSuggestion} with text "${c.textOverlay}"`).join('\n');
                 const prompt = `Act as a YouTube SEO expert. Based on the video script provided below, generate an optimized metadata package.
Video Script:
---
${video.script}
---
YouTube SEO Knowledge Base: ${youtubeSeoKb || 'N/A'}
YouTube Video Title Guidelines: ${videoTitlesKb || 'N/A'}
YouTube Video Description Guidelines: ${videoDescriptionsKb || 'N/A'}
YouTube Thumbnail Guidelines: ${thumbnailIdeasKb || 'N/A'}
${rejectedConcepts.length > 0 ? `AVOID concepts similar to these rejected ones:\n${rejectedConceptsSummary}` : ''}

Your response MUST be a valid JSON object with these exact keys: "titleSuggestions" (array of 3 distinct, catchy titles), "description" (a detailed description), "tags" (string of comma-separated tags), "chapters" (array of objects: {"timestamp": "00:00", "title": "..."}), and "thumbnailConcepts" (array of 3-5 structured objects: {"imageSuggestion": "string", "textOverlay": "string"}).`;

                const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } };
                const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
                const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                if (!response.ok) throw new Error(await response.text());
                const result = await response.json();
                const parsedJson = JSON.parse(result.candidates[0].content.parts[0].text);

                if (type === 'metadata') {
                    await updateTask('metadataGenerated', 'complete', { metadata: JSON.stringify(parsedJson), chosenTitle: parsedJson.titleSuggestions[0] });
                } else if (type === 'thumbnails') {
                    const newConcepts = [...thumbnailConcepts, ...parsedJson.thumbnailConcepts];
                    setThumbnailConcepts(newConcepts);
                    await updateTask('thumbnailsGenerated', 'pending', { 'tasks.thumbnailConcepts': newConcepts });
                }
            } else if (type === 'firstComment') {
                 const prompt = `Act as a first pinned comment expert for YouTube. Generate a friendly and engaging "first pinned comment" for a YouTube video titled "${video.chosenTitle}". The comment should ask a question to spark conversation and encourage viewers to subscribe or watch other videos.\nUser Persona (Who Am I): ${whoAmIKb || 'N/A'}\nStyle Guide: ${styleGuideText || 'N/A'}\nFirst Pinned Comment Expert Guidelines: ${firstPinnedCommentExpertKb || 'N/A'}`;
                 const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
                 const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
                 const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                 if (!response.ok) throw new Error(await response.text());
                 const result = await response.json();
                 await updateTask('firstCommentGenerated', 'complete', { 'tasks.firstComment': result.candidates[0].content.parts[0].text });
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
            {showCanvaModal && (
                <window.CanvaModal canvaUrl="https://www.canva.com/create/youtube-thumbnails/" onClose={() => setShowCanvaModal(false)} />
            )}
            <h3 className="text-2xl lg:text-3xl font-bold text-primary-accent mb-4">{video.chosenTitle || video.title}</h3>
            <div className="space-y-4">
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
                                        className="px-5 py-2.5 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold disabled:bg-gray-500 flex items-center justify-center gap-2 mx-auto"
                                    >
                                        {generating === 'thumbnails' ? <window.LoadingSpinner text="Generating..." /> : '💡 Generate Thumbnail Concepts'}
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
                {/* Other accordions would follow */}
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
