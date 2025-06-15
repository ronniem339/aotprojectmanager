// js/components/ProjectView/VideoWorkspace.js

const { useState, useEffect, useMemo, useCallback } = React; // Added useCallback

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
    // Removed showDescriptionModal as it's now in VideoDetailsSidebar

    // State to manage open/closed state of each accordion task
    const [openTask, setOpenTask] = useState(null); // Stores the ID of the currently open task

    const appId = window.CREATOR_HUB_CONFIG.APP_ID;

    useEffect(() => {
        setFeedbackText(video.tasks?.feedbackText || '');
        setPublishDate(video.tasks?.publishDate || video.publishDate || '');
        setScriptContent(video.script || '');
        setChapters(video.chapters || []);
        setVideoStats(video.stats || null);
        setStatsErrorMessage(''); // Clear stats error on video change
        setOpenTask(null); // Collapse all tasks on video change
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

    const fetchVideoStats = useCallback(async () => {
        setStatsErrorMessage('');

        // Use video.youtubeVideoId for API call
        if (!settings.youtubeApiKey) {
            setStatsErrorMessage("YouTube Data API Key is not set in settings. Cannot fetch video statistics.");
            setIsFetchingStats(false);
            return;
        }
        // Only attempt to fetch if youtubeVideoId exists and video is marked as uploaded
        if (!video.youtubeVideoId || video.tasks?.videoUploaded !== 'complete') {
            setStatsErrorMessage("Video is not marked as uploaded or YouTube ID is missing. Cannot fetch statistics.");
            setIsFetchingStats(false);
            return;
        }

        const lastFetchTimestamp = video.stats?.lastFetch ? new Date(video.stats.lastFetch).getTime() : 0;
        const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);

        if (lastFetchTimestamp > twentyFourHoursAgo && videoStats && !isFetchingStats) {
            return;
        }

        setIsFetchingStats(true);
        try {
            // Use video.youtubeVideoId for the API call
            const statsApiUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${video.youtubeVideoId}&key=${settings.youtubeApiKey}`;
            const response = await fetch(statsApiUrl);
            const data = await response.json();

            if (!response.ok || !data.items || data.items.length === 0) {
                const errorMessage = data.error?.message || "Video not found or API error details are missing. Please check video ID and API key restrictions.";
                setStatsErrorMessage(`Failed to fetch video statistics: ${errorMessage}`);
                if (!videoStats) { 
                    setVideoStats(null); 
                }
                return;
            }

            const stats = data.items[0].statistics;
            const newStats = {
                viewCount: stats.viewCount || '0',
                likeCount: stats.likeCount || '0',
                commentCount: stats.commentCount || '0',
                lastFetch: new Date().toISOString()
            };

            setVideoStats(newStats);
            const videoDocRef = db.collection(`artifacts/${appId}/users/${userId}/projects/${project.id}/videos`).doc(video.id);
            await videoDocRef.update({ stats: newStats });

        } catch (error) {
            console.error("Error during fetch operation:", error);
            setStatsErrorMessage(`Error fetching stats: ${error.message}.`);
        } finally {
            setIsFetchingStats(false);
        }
    }, [video.id, video.youtubeVideoId, video.tasks?.videoUploaded, video.stats, settings.youtubeApiKey, appId, userId, project.id, videoStats, isFetchingStats]);


    useEffect(() => {
        // Trigger fetch only if video.youtubeVideoId exists and video is marked uploaded
        if (video.youtubeVideoId && video.tasks?.videoUploaded === 'complete') {
            fetchVideoStats();
        }
    }, [video.youtubeVideoId, video.tasks?.videoUploaded, settings.youtubeApiKey, fetchVideoStats]);


    const handleGenerate = async (type, currentContent, refinement) => {
        const apiKey = settings.geminiApiKey || "";
        if (!apiKey) { console.error("Please set your Gemini API Key in the settings first."); return; }
        setGenerating(type);

        // Reference specific knowledge bases
        const youtubeSeoKb = settings.knowledgeBases?.youtube?.youtubeSeoKnowledgeBase || '';
        const whoAmIKb = settings.knowledgeBases?.youtube?.whoAmI || '';
        const videoTitlesKb = settings.knowledgeBases?.youtube?.videoTitles || '';
        const videoDescriptionsKb = settings.knowledgeBases?.youtube?.videoDescriptions || '';
        const thumbnailIdeasKb = settings.knowledgeBases?.youtube?.thumbnailIdeas || '';
        const firstPinnedCommentExpertKb = settings.knowledgeBases?.youtube?.firstPinnedCommentExpert || '';
        const styleGuideText = settings.styleGuideText; // General style guide text

        try {
            if (type === 'script') {
                 const isRefining = !!currentContent;

                // Define a common video structure for prompting (remains same)
                const commonVideoStructure = `
                    # Hook
                    # Introduction
                    # Where is ${video.chosenTitle?.split(':')[0]?.trim() || project.playlistTitle?.split(':')[0]?.trim() || 'this place'}
                    # History of ${video.chosenTitle?.split(':')[0]?.trim() || project.playlistTitle?.split(':')[0]?.trim() || 'this place'}
                    # Key Landmark: [Insert a relevant landmark from video concept/locations if available, e.g., RRS Discovery]
                    # Things to Do
                    # Eating Out
                    # Day Trips from ${video.chosenTitle?.split(':')[0]?.trim() || project.playlistTitle?.split(':')[0]?.trim() || 'this place'}
                    # Conclusion
                `.trim();


                const prompt = isRefining
                    ? `Your task is to refine an existing voiceover script based on user feedback.
                    Original Script:\n---\n${currentContent}\n---\nUser's Refinement Instructions: "${refinement}"
                    Rewrite the entire script to incorporate the feedback, maintaining the core message and adhering to the style guide and user persona.
                    User Persona (Who Am I): ${whoAmIKb || 'N/A'}
                    Style Guide: ${styleGuideText || 'N/A'}
                    IMPORTANT: Your response MUST contain ONLY the updated voiceover script text. Do NOT include any production notes like [MUSIC CUE], [SOUND EFFECT], or [B-ROLL FOOTAGE]. The script should be broken down into logical sections using markdown headings (e.e.g., # Hook, # Introduction).` // Fixed typo "e.e.g." to "e.g."
                    : `Your task is to generate a complete, engaging voiceover script for a YouTube video based on the following details.
                    Video Title: "${video.chosenTitle || video.title}".
                    Overall Project Theme: "${project.playlistDescription}".
                    Video Concept: "${video.concept}".
                    Locations Featured: ${video.locations_featured?.join(', ') || 'N/A'}.
                    Targeted Keywords: ${video.targeted_keywords?.join(', ')}

                    User Persona (Who Am I): ${whoAmIKb || 'N/A'}
                    Style Guide: ${styleGuideText || 'N/A'}
                    YouTube SEO Knowledge Base: ${youtubeSeoKb || 'N/A'}
                    
                    The script should follow a structure similar to this example, adapted to the video's specific content:
                    ${commonVideoStructure}

                    IMPORTANT: Your response MUST contain ONLY the voiceover script text, ready for a voice actor. Do NOT include production notes (e.g., [MUSIC CUE], [SOUND EFFECT], or [B-ROLL FOOTAGE]), titles, descriptions, metadata, or any other text outside of the script itself. The script must be broken down into logical sections using markdown headings (e.g., # Hook, # Introduction, # Location: [Location Name], # Outro). Focus on the words the narrator needs to say.`;
                const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
                const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
                const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                if (!response.ok) throw new Error(await response.text());
                const result = await response.json();
                const newScript = result.candidates[0].content.parts[0].text;
                setScriptContent(newScript);
                await updateTask('scripting', 'pending', { script: newScript }); // Always mark pending for review after AI generation
                if (isRefining) setRefinementText('');
            } else if (type === 'metadata') {
                const prompt = `Act as a YouTube SEO expert. Based on the video script provided below, generate an optimized metadata package.
Video Script:
---
${video.script}
---
YouTube SEO Knowledge Base: ${youtubeSeoKb || 'N/A'}
YouTube Video Title Guidelines: ${videoTitlesKb || 'N/A'}
YouTube Video Description Guidelines: ${videoDescriptionsKb || 'N/A'}

Your response MUST be a valid JSON object with these exact keys: "titleSuggestions" (array of 3 distinct, catchy titles, following title guidelines), "description" (a detailed description incorporating keywords, a hook, and the placeholder '{{CHAPTERS}}', following description guidelines), "tags" (string of comma-separated tags), "chapters" (array of structured objects: {"timestamp": "00:00", "title": "Chapter Title based on script headings"}), and "thumbnailConcepts" (array of 3 structured objects: {"imageSuggestion": "string", "textOverlay": "string"}).`;
                const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } };
                const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
                const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                if (!response.ok) throw new Error(await response.text());
                const result = await response.json();
                await updateTask('metadataGenerated', 'complete', { metadata: result.candidates[0].content.parts[0].text, chosenTitle: JSON.parse(result.candidates[0].content.parts[0].text).titleSuggestions[0] });
            } else if (type === 'thumbnails') {
                 // For thumbnails, we now only need to mark the task as complete.
                 // The actual creation happens on Canva via the new button.
                await updateTask('thumbnailsGenerated', 'complete');
            } else if (type === 'firstComment') {
                 const prompt = `Act as a first pinned comment expert for YouTube. Generate a friendly and engaging "first pinned comment" for a YouTube video titled "${video.chosenTitle}". The comment should ask a question to spark conversation and encourage viewers to subscribe or watch other videos.
                 User Persona (Who Am I): ${whoAmIKb || 'N/A'}
                 Style Guide: ${styleGuideText || 'N/A'}
                 First Pinned Comment Expert Guidelines: ${firstPinnedCommentExpertKb || 'N/A'}`;
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
    // isTaskLocked now only checks if the PREVIOUS task is NOT complete.
    const isTaskLocked = (index) => index > 0 && tasks[window.CREATOR_HUB_CONFIG.TASK_PIPELINE[index - 1].id] !== 'complete'; 
    
    // Stricter check for metadata generation
    const isMetadataReady = tasks.scripting === 'complete' && tasks.videoEdited === 'complete' && tasks.feedbackProvided === 'complete';
    
    const handleChapterChange = (index, value) => {
        const newChapters = [...chapters];
        newChapters[index].timestamp = value;
        setChapters(newChapters);
    };

    const applyTimestamps = () => {
        const chapterText = chapters.map(c => `${c.timestamp} - ${c.title}`).join('\n');
        let parsedMeta = {};
        try {
            parsedMeta = video.metadata ? JSON.parse(video.metadata) : {};
        } catch (e) {
            console.error("Error parsing video metadata for chapters:", e);
            parsedMeta = {};
        }
        const newDescription = parsedMeta.description ? parsedMeta.description.replace('{{CHAPTERS}}', chapterText) : (parsedMeta.description || '') + '\n\n' + chapterText; // Ensure placeholder replacement, or append
        
        updateTask('metadataGenerated', 'complete', { metadata: JSON.stringify({ ...parsedMeta, description: newDescription, chapters: chapters }), chapters: chapters });
    };

    const metadata = useMemo(() => {
        try {
            return video.metadata ? JSON.parse(video.metadata) : null;
        } catch { return null; }
    }, [video.metadata]);
    
    const initialScriptingStatus = (video.script && tasks.scripting !== 'pending') ? 'complete' : (tasks.scripting || 'pending');

    return (
        <main className="flex-grow">
            <h3 className="text-2xl lg:text-3xl font-bold text-primary-accent mb-4">{video.chosenTitle || video.title}</h3>
            <div className="space-y-4">
                {statsErrorMessage && (
                    <div className="bg-red-900/50 text-red-400 p-3 rounded-lg text-sm mb-4">
                        <p className="font-semibold mb-1">YouTube API Error:</p>
                        <p>{statsErrorMessage}</p>
                        <p className="mt-2 text-xs text-gray-400">Please check your YouTube Data API Key in settings, ensure it's correct, has appropriate permissions, and your daily quota has not been exceeded. Also verify the video ID is valid.</p>
                    </div>
                )}

                <Accordion 
                    title="1. Scripting & Recording" 
                    isOpen={openTask === 'scripting'} 
                    onToggle={() => setOpenTask(openTask === 'scripting' ? null : 'scripting')}
                    status={initialScriptingStatus} 
                    isLocked={isTaskLocked(0) && initialScriptingStatus !== 'revisited'} 
                    onRevisit={initialScriptingStatus === 'complete' || initialScriptingStatus === 'locked' ? () => updateTask('scripting', 'revisited', { script: scriptContent }) : undefined}
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
                            {!scriptContent && (
                                <button 
                                    onClick={() => handleGenerate('script')} 
                                    disabled={generating === 'script'} 
                                    className="flex-grow px-5 py-2.5 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold disabled:bg-gray-500 flex items-center justify-center gap-2"
                                >
                                    {generating === 'script' ? <window.LoadingSpinner text="Generating..." /> : '✨ Generate Script with AI'}
                                </button>
                            )}
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
                        {scriptContent && (initialScriptingStatus !== 'complete' || tasks.scripting === 'revisited') && (
                            <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700 mt-4">
                                <label className="block text-sm font-medium text-gray-300 mb-2">Refinement Instructions</label>
                                <textarea value={refinementText} onChange={(e) => setRefinementText(e.target.value)} rows="2" className="w-full form-textarea" placeholder="e.g., 'Make the tone more energetic' or 'Add a section about the local food'"/>
                                <button 
                                    onClick={() => handleGenerate('script', scriptContent, refinementText)} 
                                    disabled={generating === 'script' || !refinementText} 
                                    className="mt-2 px-4 py-2 text-sm bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold disabled:bg-gray-500 flex items-center gap-2"
                                >
                                    {generating === 'script' ? <window.LoadingSpinner/> : 'Refine with AI'}
                                </button>
                            </div>
                        )}
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
                            <button onClick={() => updateTask('feedbackProvided', 'complete', { 'tasks.feedbackText': feedbackText })} disabled={!feedbackText} className="w-full px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg font-semibold disabled:bg-gray-500">Confirm & Save Notes</button>
                        </div>
                    ) : (
                        <p className="text-gray-400 text-center py-2 text-sm">This task is marked as complete.</p>
                    )}
                </Accordion>
                
                <Accordion 
                    title="4. Generate Metadata" 
                    isOpen={openTask === 'metadataGenerated'} 
                    onToggle={() => setOpenTask(openTask === 'metadataGenerated' ? null : 'metadataGenerated')}
                    status={tasks.metadataGenerated} 
                    isLocked={isTaskLocked(3)} 
                    onRevisit={() => updateTask('metadataGenerated', 'pending', { metadata: '' })}
                >
                     {tasks.metadataGenerated !== 'complete' ? ( 
                        <div>
                            <button 
                                onClick={() => handleGenerate('metadata')} 
                                disabled={generating === 'metadata' || !isMetadataReady} 
                                className="w-full px-5 py-2.5 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold disabled:bg-gray-500 flex items-center justify-center gap-2"
                            >
                                {generating === 'metadata' ? <window.LoadingSpinner text="Generating..." /> : '✨ Generate Metadata'}
                            </button>
                            {!isMetadataReady && (
                                <p className="text-xs text-amber-400 mt-2 text-center">
                                    Please complete Scripting, Video Editing, and Production Change Logging before generating metadata.
                                </p>
                            )}
                        </div>
                     ) : ( 
                        metadata ? (
                            <div className="space-y-6">
                                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                                    <label className="block text-sm font-semibold text-gray-300 mb-2">Title Suggestions</label>
                                    <div className="space-y-2">
                                        {metadata.titleSuggestions.map(title => ( 
                                            <label key={title} className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 cursor-pointer border border-transparent has-checked:border-primary-accent transition-all">
                                                <input type="radio" name={`title-${video.id}`} value={title} checked={video.chosenTitle === title} onChange={() => updateTask('metadataGenerated', 'complete', { chosenTitle: title })} className="h-4 w-4 bg-gray-900 border-gray-600 text-primary-accent focus:ring-primary-accent"/>
                                                <span>{title}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-sm font-semibold text-gray-300">Description</label>
                                        <window.CopyButton textToCopy={metadata.description} />
                                    </div>
                                    <textarea readOnly value={metadata.description} rows="10" className="w-full form-textarea bg-gray-800/50 resize-y"/>
                                </div>
                                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                                    <label className="block text-sm font-semibold text-gray-300 mb-2">Chapter Timestamps</label>
                                    <div className="space-y-2">
                                        {chapters.map((chap, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <input type="text" value={chap.timestamp} onChange={(e) => handleChapterChange(i, e.target.value)} className="form-input w-24" placeholder="00:00"/> 
                                                <span className="text-gray-300 text-sm">{chap.title}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <button onClick={applyTimestamps} className="mt-3 px-4 py-2 text-sm bg-green-600 hover:bg-green-700 rounded-lg">Apply Timestamps</button>
                                </div>
                                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-sm font-semibold text-gray-300">Tags</label>
                                        <window.CopyButton textToCopy={metadata.tags} />
                                    </div>
                                    <div className="p-3 rounded-lg bg-gray-800/50 text-sm text-gray-300 whitespace-pre-wrap">{metadata.tags}</div>
                                </div>
                            </div> 
                        ) : (
                            <p className="text-gray-500 text-center py-2 text-sm">Could not parse metadata.</p>
                        )
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
                        <button 
                            onClick={() => handleGenerate('thumbnails')} 
                            disabled={generating === 'thumbnails' || !metadata}
                            className="w-full px-5 py-2.5 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold disabled:bg-gray-500 flex items-center justify-center gap-2"
                        >
                            {generating === 'thumbnails' ? <window.LoadingSpinner text="Generating..." /> : 'Mark as Complete & View Concepts'}
                        </button>
                    ) : (
                        <div className="space-y-4">
                            {metadata?.thumbnailConcepts?.map((concept, index) => (
                                <div key={index} className="glass-card p-4 rounded-lg">
                                    <p className="font-semibold">Concept {index + 1}:</p>
                                    <p className="text-sm text-gray-300 mt-1"><strong>Image Suggestion:</strong> {concept.imageSuggestion}</p>
                                    <p className="text-sm text-gray-300"><strong>Text Overlay:</strong> {concept.textOverlay}</p>
                                    <a 
                                        href="https://www.canva.com/create/youtube-thumbnails/"
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="inline-block mt-3 px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold"
                                    >
                                        Create on Canva
                                    </a>
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
                        <button onClick={() => updateTask('videoUploaded', 'complete', { publishDate: publishDate })} disabled={!publishDate} className="w-full px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg font-semibold disabled:bg-gray-500">Confirm Upload & Save Date</button>
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
                        <button onClick={() => handleGenerate('firstComment')} disabled={generating === 'firstComment'} className="w-full px-5 py-2.5 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold disabled:bg-gray-500 flex items-center justify-center gap-2">
                            {generating === 'firstComment' ? <window.LoadingSpinner text="Generating..." /> : '✨ Generate Comment'}
                        </button>
                    ) : ( 
                        <div>
                            <h4 className="text-sm font-semibold text-gray-400 mb-2">Generated Comment</h4>
                            <textarea readOnly value={tasks.firstComment || ""} rows="5" className="w-full form-textarea bg-gray-800/50" />
                        </div> 
                    )}
                </Accordion>
            </div>
            {/* Full-screen script view component */}
            {showFullScreenScript && (
                <window.FullScreenScriptView 
                    scriptContent={scriptContent} 
                    onClose={() => setShowFullScreenScript(false)} 
                />
            )}
        </main>
    );
});
