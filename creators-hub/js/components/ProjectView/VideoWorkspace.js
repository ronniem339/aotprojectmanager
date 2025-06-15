// js/components/ProjectView/VideoWorkspace.js

const { useState, useEffect, useMemo, useCallback } = React; // Added useCallback

// No longer need to define TASK_PIPELINE or expose TaskItem/CopyButton globally here,
// as they are now handled via window.CREATOR_HUB_CONFIG.TASK_PIPELINE and other window. exposures in common.js.

window.VideoWorkspace = React.memo(({ video, settings, project, userId }) => {
    const [feedbackText, setFeedbackText] = useState(video.tasks?.feedbackText || '');
    const [publishDate, setPublishDate] = useState(video.tasks?.publishDate || video.publishDate || ''); // Use video.publishDate directly
    const [generating, setGenerating] = useState(null);
    const [scriptContent, setScriptContent] = useState(video.script || ''); // Initialize with imported script
    const [refinementText, setRefinementText] = useState('');
    const [isConceptVisible, setIsConceptVisible] = useState(false);
    const [chapters, setChapters] = useState(video.chapters || []); // Initialize with imported chapters
    const [showFullScreenScript, setShowFullScreenScript] = useState(false); // New state for full-screen script
    const [videoStats, setVideoStats] = useState(video.stats || null); // New state for video statistics
    const [isFetchingStats, setIsFetchingStats] = useState(false); // New state for stats loading indicator
    const [statsErrorMessage, setStatsErrorMessage] = useState(''); // New state for stats error message


    const appId = window.CREATOR_HUB_CONFIG.APP_ID;

    useEffect(() => {
        setFeedbackText(video.tasks?.feedbackText || '');
        setPublishDate(video.tasks?.publishDate || video.publishDate || '');
        setScriptContent(video.script || ''); // Update scriptContent if video.script changes
        setIsConceptVisible(false);
        setChapters(video.chapters || []); // Update chapters if video changes
        setVideoStats(video.stats || null); // Update stats if video object changes
    }, [video.id, video.script, video.publishDate, video.chapters, video.tasks, video.stats]); // Added video.stats to dependencies
    
    useEffect(() => {
        // This effect runs when video.metadata changes.
        // It's crucial for re-parsing chapters if metadata is generated AFTER import
        // or if it changes for a non-imported video.
        if (video.metadata) {
            try {
                const parsed = JSON.parse(video.metadata);
                if(parsed.chapters) {
                    // Only update chapters from metadata if the video isn't imported with its own chapters
                    // Or if metadata generation explicitly provides new/updated chapters.
                    // For imported videos, video.chapters will already be populated.
                    // This logic makes sure metadata-generated chapters override if they are more recent/valid.
                    setChapters(parsed.chapters.map(ch => ({ ...ch, timestamp: ch.timestamp || '00:00' })));
                }
            } catch(e) { console.error("Could not parse chapters from metadata", e); }
        } else if (video.chapters) {
            // If no metadata, but video has pre-existing chapters (from import), use them.
            setChapters(video.chapters.map(ch => ({ ...ch, timestamp: ch.timestamp || '00:00' })));
        }
    }, [video.metadata, video.chapters]); // Added video.chapters as dependency

    const updateTask = async (taskName, status, extraData = {}) => {
        const videoDocRef = db.collection(`artifacts/${appId}/users/${userId}/projects/${project.id}/videos`).doc(video.id);
        // Merge the extraData into the video document directly, and update the task status
        await videoDocRef.update({ 
            [`tasks.${taskName}`]: status, 
            ...extraData // This will apply chosenTitle, metadata, script, etc.
        });
    };

    // New: Function to fetch video statistics from YouTube
    const fetchVideoStats = useCallback(async () => {
        setStatsErrorMessage(''); // Clear previous error messages

        if (!settings.youtubeApiKey) {
            setStatsErrorMessage("YouTube Data API Key is not set in settings. Cannot fetch video statistics.");
            setIsFetchingStats(false);
            return;
        }
        if (!video.id || video.tasks?.videoUploaded !== 'complete') {
            // Only fetch stats for published videos with a YouTube ID
            setStatsErrorMessage("Video is not marked as uploaded or YouTube ID is missing. Cannot fetch statistics.");
            setIsFetchingStats(false);
            return;
        }

        // Check if stats were fetched recently (e.g., within the last 24 hours)
        const lastFetchTimestamp = video.stats?.lastFetch ? new Date(video.stats.lastFetch).getTime() : 0;
        const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000); // 24 hours in milliseconds

        if (lastFetchTimestamp > twentyFourHoursAgo && videoStats && !isFetchingStats) { // Added isFetchingStats check
            // Stats are recent, no need to refetch unless forced by a button click
            return;
        }

        setIsFetchingStats(true);
        try {
            const statsApiUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${video.id}&key=${settings.youtubeApiKey}`;
            const response = await fetch(statsApiUrl);
            const data = await response.json();

            if (!response.ok || !data.items || data.items.length === 0) {
                const errorMessage = data.error?.message || "Video not found or API error details are missing. Please check video ID and API key restrictions.";
                setStatsErrorMessage(`Failed to fetch video statistics: ${errorMessage}`);
                if (!videoStats) { 
                    setVideoStats(null); // Clear stats if none were ever loaded and fetch failed
                }
                return;
            }

            const stats = data.items[0].statistics;
            const newStats = {
                viewCount: stats.viewCount || '0',
                likeCount: stats.likeCount || '0',
                commentCount: stats.commentCount || '0',
                lastFetch: new Date().toISOString() // Store ISO string for consistency
            };

            setVideoStats(newStats);
            // Update Firestore with the new stats
            const videoDocRef = db.collection(`artifacts/${appId}/users/${userId}/projects/${project.id}/videos`).doc(video.id);
            await videoDocRef.update({ stats: newStats });

        } catch (error) { // This `catch` block is correctly placed and matches the `try`.
            console.error("Error during fetch operation:", error);
            setStatsErrorMessage(`Error fetching stats: ${error.message}.`);
        } finally {
            setIsFetchingStats(false);
        }
    }, [video.id, video.tasks?.videoUploaded, video.stats, settings.youtubeApiKey, appId, userId, project.id, videoStats, isFetchingStats]);


    // Effect to trigger stats fetch when video data or API key changes
    useEffect(() => {
        // Only attempt to fetch if the video is uploaded and has a YouTube ID
        if (video.tasks?.videoUploaded === 'complete' && video.id) {
            fetchVideoStats();
        }
    }, [video.id, video.tasks?.videoUploaded, settings.youtubeApiKey, fetchVideoStats]); // Re-run if these dependencies change


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
                    IMPORTANT: Your response MUST contain ONLY the updated voiceover script text. Do NOT include any production notes like [MUSIC CUE], [SOUND EFFECT], or [B-ROLL FOOTAGE]. The script should be broken down into logical sections using markdown headings (e.g., # Hook, # Introduction).`
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

                    IMPORTANT: Your response MUST contain ONLY the voiceover script text, ready for a voice actor. Do NOT include production notes (e.g., [MUSIC CUE], [SOUND EFFECT], [B-ROLL FOOTAGE]), titles, descriptions, metadata, or any other text outside of the script itself. The script must be broken down into logical sections using markdown headings (e.g., # Hook, # Introduction, # Location: [Location Name], # Outro). Focus on the words the narrator needs to say.`;
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
                let concepts;
                try {
                    if (!video.metadata) { throw new Error("Metadata must be generated before thumbnails."); }
                    concepts = JSON.parse(video.metadata).thumbnailConcepts;
                    if (!concepts || !Array.isArray(concepts) || concepts.length === 0) { throw new Error("No valid thumbnail concepts found in metadata."); }
                } catch (e) {
                    console.error("Thumbnail generation error:", e.message);
                    setGenerating(null);
                    return;
                }
                
                const prompt = `Generate a high-CTR YouTube thumbnail. Cinematic, professional photography. ${concepts[0].imageSuggestion}. Text overlay reads: "${concepts[0].textOverlay}".
                YouTube Thumbnail Idea Guidelines: ${thumbnailIdeasKb || 'N/A'}`; // Add thumbnail KB to prompt

                const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;
                const thumbnailPromises = concepts.map(concept => {
                    // For multiple concepts, generate distinct prompts
                    const individualPrompt = `A high-CTR YouTube thumbnail. Cinematic, professional photography. ${concept.imageSuggestion}. Text overlay reads: "${concept.textOverlay}".
                    YouTube Thumbnail Idea Guidelines: ${thumbnailIdeasKb || 'N/A'}`;
                    const payload = { instances: [{ prompt: individualPrompt }], parameters: { "sampleCount": 1 } };
                    return fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
                    .then(response => {
                        if (!response.ok) { console.error(`API Error for thumbnail concept "${concept.imageSuggestion}":`, response.statusText); return null; }
                        return response.json();
                    })
                    .catch(err => { console.error(`Fetch error for thumbnail concept "${concept.imageSuggestion}":`, err); return null; });
                });

                const results = await Promise.all(thumbnailPromises);
                const generatedThumbnails = results.filter(result => result && result.predictions?.[0]?.bytesBase64Encoded).map(result => `data:image/png;base64,${result.predictions[0].bytesBase64Encoded}`); // Store as data URLs

                if (generatedThumbnails.length > 0) {
                    await updateTask('thumbnailsGenerated', 'complete', { generatedThumbnails: generatedThumbnails });
                } else {
                    console.error("All thumbnail generations failed. Please check the API key and concepts.");
                }

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
            // Add Shorts Idea Generation here later if needed
            // else if (type === 'shortsIdea') { ... }

        } catch (error) {
            console.error(`Error generating ${type}:`, error);
        } finally {
            setGenerating(null);
        }
    };
    
    const tasks = video.tasks || {};
    // isTaskLocked now only checks if the PREVIOUS task is NOT complete.
    // It does not directly affect whether 'revisit' or 'fullscreen' are available.
    const isTaskLocked = (index) => index > 0 && tasks[window.CREATOR_HUB_CONFIG.TASK_PIPELINE[index - 1].id] !== 'complete'; 
    
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
        
        // Update both metadata and chapters array
        updateTask('metadataGenerated', 'complete', { metadata: JSON.stringify({ ...parsedMeta, description: newDescription, chapters: chapters }), chapters: chapters });
    };

    const metadata = useMemo(() => {
        try {
            return video.metadata ? JSON.parse(video.metadata) : null;
        } catch { return null; }
    }, [video.metadata]);
    
    // Determine initial status of Scripting & Recording task
    // If video.script has content AND the task is not explicitly 'pending' (e.g., after AI generation),
    // then it's considered 'complete'. Otherwise, respect existing task status or default to 'pending'.
    const initialScriptingStatus = (video.script && tasks.scripting !== 'pending') ? 'complete' : (tasks.scripting || 'pending');

    return (
        <main className="lg:w-2/3 xl:w-3/4">
            <div className="space-y-3">
                 <div className="glass-card p-6 rounded-lg mb-6">
                    <div className="flex justify-between items-start">
                        <h3 className="text-2xl font-bold text-primary-accent mb-3">{video.chosenTitle || video.title}</h3>
                        <button onClick={() => setIsConceptVisible(!isConceptVisible)} className="text-xs text-secondary-accent hover:text-secondary-accent-light flex-shrink-0 ml-4">
                            {isConceptVisible ? 'Hide Concept' : 'Show Concept'}
                        </button>
                    </div>
                    
                    {isConceptVisible && <p className="text-gray-300 mb-4">{video.concept || <span className="italic text-gray-500">No concept provided.</span>}</p>}
                    
                    <div className="space-y-3 pt-4 border-t border-gray-700">
                        <div>
                            <span className="text-xs font-semibold text-gray-400 block mb-2">LOCATIONS FEATURED:</span>
                            {video.locations_featured?.length > 0 ? ( <div className="flex flex-wrap items-center gap-2">{video.locations_featured.map(loc => ( <span key={loc} className="px-2.5 py-1 text-xs bg-secondary-accent-darker-opacity text-secondary-accent-lighter-text rounded-full">{loc}</span> ))}</div>) : (<p className="text-sm text-gray-500 italic">No locations listed.</p>)}
                        </div>
                        <div>
                            <span className="text-xs font-semibold text-gray-400 block mb-2">TARGETED KEYWORDS:</span>
                            {video.targeted_keywords?.length > 0 ? (<div className="flex flex-wrap items-center gap-2">{video.targeted_keywords.map(kw => ( <span key={kw} className="px-2.5 py-1 text-xs bg-secondary-accent-darker-opacity text-secondary-accent-lighter-text rounded-full">{kw}</span> ))}</div>) : (<p className="text-sm text-gray-500 italic">No keywords targeted.</p>)}
                        </div>
                    </div>
                </div>

                {/* New Section for Video Statistics */}
                {(video.tasks?.videoUploaded === 'complete' && video.id) && (
                    <div className="glass-card p-6 rounded-lg">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-semibold text-white">📈 Video Statistics</h3>
                            <button 
                                onClick={fetchVideoStats} 
                                disabled={isFetchingStats}
                                className="px-4 py-2 text-sm bg-secondary-accent hover:bg-secondary-accent-darker rounded-lg font-semibold disabled:opacity-50"
                            >
                                {isFetchingStats ? <window.LoadingSpinner /> : 'Refresh Stats'}
                            </button>
                        </div>
                        {videoStats ? (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                                <div className="p-3 bg-gray-800/50 rounded-lg">
                                    <p className="text-2xl font-bold text-primary-accent">{parseInt(videoStats.viewCount).toLocaleString()}</p>
                                    <p className="text-sm text-gray-400">Views</p>
                                </div>
                                <div className="p-3 bg-gray-800/50 rounded-lg">
                                    <p className="text-2xl font-bold text-primary-accent">{parseInt(videoStats.likeCount).toLocaleString()}</p>
                                    <p className="text-sm text-gray-400">Likes</p>
                                </div>
                                <div className="p-3 bg-gray-800/50 rounded-lg">
                                    <p className="text-2xl font-bold text-primary-accent">{parseInt(videoStats.commentCount).toLocaleString()}</p>
                                    <p className="text-sm text-gray-400">Comments</p>
                                </div>
                                {videoStats.lastFetch && (
                                    <p className="col-span-full text-xs text-gray-500 mt-2">Last fetched: {new Date(videoStats.lastFetch).toLocaleString()}</p>
                                )}
                            </div>
                        ) : (
                            <div className="p-3 bg-gray-800/50 rounded-lg text-center">
                                {statsErrorMessage ? (
                                    <p className="text-red-400 text-sm">{statsErrorMessage}</p>
                                ) : (
                                    <p className="text-gray-500">No statistics available yet or failed to fetch. Ensure the video is uploaded and publicly accessible.</p>
                                )}
                            </div>
                        )}
                    </div>
                )}
                
                <window.TaskItem 
                    title="1. Scripting & Recording" 
                    status={initialScriptingStatus} // Use calculated status
                    isLocked={isTaskLocked(0) && initialScriptingStatus !== 'revisited'} // Lock only if previous task incomplete AND not being revisited
                    onRevisit={initialScriptingStatus === 'complete' || initialScriptingStatus === 'locked' ? () => updateTask('scripting', 'revisited', { script: scriptContent }) : undefined}
                >
                    {/* Content when script is available (either imported or generated/locked/revisited) */}
                    {(initialScriptingStatus === 'complete' || initialScriptingStatus === 'locked' || initialScriptingStatus === 'revisited' || video.script) ? ( 
                        <div>
                            <h4 className="text-sm font-semibold text-gray-400 mb-2">Script Content</h4>
                            <textarea value={scriptContent || ""} onChange={(e) => setScriptContent(e.target.value)} rows="10" className="w-full form-textarea bg-gray-800/50" readOnly={initialScriptingStatus === 'complete' && tasks.scripting !== 'revisited'} /> {/* Allow editing if revisited */}
                            {/* Show Fullscreen Script button if scriptContent exists */}
                            {scriptContent && (
                                <div className="flex gap-4 mt-4">
                                    <button onClick={() => setShowFullScreenScript(true)} className="px-5 py-2.5 bg-secondary-accent hover:bg-secondary-accent-darker rounded-lg font-semibold">View Fullscreen Script</button>
                                    {/* Only show lock button if not already complete AND not being revisited (if it was already complete) */}
                                    {initialScriptingStatus !== 'complete' || tasks.scripting === 'revisited' ? ( 
                                        <button onClick={() => updateTask('scripting', 'complete', { script: scriptContent })} className="px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg font-semibold">Confirm & Lock Script</button>
                                    ) : (
                                        <p className="text-gray-400 text-sm flex items-center">Script is locked. Use "Revisit" to edit.</p>
                                    )}
                                </div>
                            )}
                            {/* Refinement section for existing script */}
                            { (initialScriptingStatus !== 'complete' || initialScriptingStatus === 'revisited') && scriptContent && (
                                <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700 mt-4">
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Refinement Instructions</label>
                                    <textarea value={refinementText} onChange={(e) => setRefinementText(e.target.value)} rows="2" className="w-full form-textarea" placeholder="e.g., 'Make the tone more energetic' or 'Add a section about the local food'"/>
                                    <button onClick={() => handleGenerate('script', scriptContent, refinementText)} disabled={generating === 'script' || !refinementText} className="mt-2 px-4 py-2 text-sm bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold disabled:bg-gray-500 flex items-center gap-2">{generating === 'script' ? <window.LoadingSpinner/> : 'Refine with AI'}</button>
                                </div>
                            )}
                        </div> 
                    ) : ( 
                        // Content when script is not available and task is pending (needs generation)
                        <button onClick={() => handleGenerate('script')} disabled={generating === 'script'} className="px-5 py-2.5 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold disabled:bg-gray-500 flex items-center gap-2">{generating === 'script' ? <window.LoadingSpinner text="Generating..." /> : '🪄 Generate Script'}</button> 
                    )}
                </window.TaskItem>

                <window.TaskItem title="2. Edit Video" status={tasks.videoEdited} isLocked={isTaskLocked(1)} onRevisit={() => updateTask('videoEdited', 'pending')}>
                     {tasks.videoEdited !== 'complete' ? <button onClick={() => updateTask('videoEdited', 'complete')} className="px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg font-semibold">Mark as Edited</button> : <p className="text-gray-400">This task is marked as complete.</p>}
                </window.TaskItem>

                <window.TaskItem title="3. Log Production Changes" status={tasks.feedbackProvided} isLocked={isTaskLocked(2)} onRevisit={() => updateTask('feedbackProvided', 'pending')}>
                    <textarea value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} rows="5" className="w-full form-textarea" placeholder="e.g., 'We decided to combine the first two locations...'" readOnly={tasks.feedbackProvided === 'complete'} />
                    {tasks.feedbackProvided !== 'complete' ? <button onClick={() => updateTask('feedbackProvided', 'complete', { 'tasks.feedbackText': feedbackText })} disabled={!feedbackText} className="mt-4 px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg font-semibold disabled:bg-gray-500">Confirm & Save Notes</button> : <p className="text-gray-400">This task is marked as complete.</p>}
                </window.TaskItem>
                
                <window.TaskItem title="4. Generate Metadata" status={tasks.metadataGenerated} isLocked={isTaskLocked(3)} onRevisit={() => updateTask('metadataGenerated', 'pending', { metadata: '' })}> {/* Reset metadata on revisit */}
                     {tasks.metadataGenerated !== 'complete' ? ( <button onClick={() => handleGenerate('metadata')} disabled={generating === 'metadata'} className="px-5 py-2.5 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold disabled:bg-gray-500 flex items-center gap-2">{generating === 'metadata' ? <window.LoadingSpinner text="Generating..." /> : '🪄 Generate Metadata'}</button>) : 
                     ( metadata ? <div className="space-y-6">
                         <div>
                             <label className="block text-sm font-semibold text-gray-400 mb-2">Title Suggestions</label>
                             <div className="space-y-2">{metadata.titleSuggestions.map(title => ( <label key={title} className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 cursor-pointer"><input type="radio" name={`title-${video.id}`} value={title} checked={video.chosenTitle === title} onChange={() => updateTask('metadataGenerated', 'complete', { chosenTitle: title })} className="h-4 w-4 bg-gray-900 border-gray-600 text-primary-accent focus:ring-primary-accent"/><span>{title}</span></label>))}</div>
                         </div>
                         <div>
                             <div className="flex justify-between items-center mb-2"><label className="block text-sm font-semibold text-gray-400">Description</label><window.CopyButton textToCopy={metadata.description} /></div>
                             <textarea readOnly value={metadata.description} rows="10" className="w-full form-textarea bg-gray-800/50"/>
                         </div>
                         <div>
                             <label className="block text-sm font-semibold text-gray-400 mb-2">Chapter Timestamps</label>
                             <div className="space-y-2">{chapters.map((chap, i) => (<div key={i} className="flex items-center gap-2"><input type="text" value={chap.timestamp} onChange={(e) => handleChapterChange(i, e.target.value)} className="form-input w-20" placeholder="00:00"/> <span className="text-gray-300">{chap.title}</span></div>))}</div>
                             <button onClick={applyTimestamps} className="mt-3 px-4 py-2 text-sm bg-green-600 hover:bg-green-700 rounded-lg">Apply Timestamps</button>
                         </div>
                          <div>
                             <div className="flex justify-between items-center mb-2"><label className="block text-sm font-semibold text-gray-400">Tags</label><window.CopyButton textToCopy={metadata.tags} /></div>
                             <div className="p-3 rounded-lg bg-gray-800/50 text-sm text-gray-300 whitespace-pre-wrap">{metadata.tags}</div>
                         </div>
                     </div> : <p className="text-gray-500">Could not parse metadata.</p> )}
                </window.TaskItem>
                
                <window.TaskItem title="5. Generate Thumbnails" status={tasks.thumbnailsGenerated} isLocked={isTaskLocked(4)} onRevisit={() => updateTask('thumbnailsGenerated', 'pending', { 'generatedThumbnails': [] })}>
                    {tasks.thumbnailsGenerated !== 'complete' ? (<button onClick={() => handleGenerate('thumbnails')} disabled={generating === 'thumbnails'} className="px-5 py-2.5 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold disabled:bg-gray-500 flex items-center gap-2">{generating === 'thumbnails' ? <window.LoadingSpinner text="Generating..." /> : '🪄 Generate Thumbnails'}</button> ) : ( <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">{video.generatedThumbnails?.map((src, index) => ( <window.ImageComponent key={index} src={src} className="rounded-lg object-cover" alt={`Generated Thumbnail ${index + 1}`}/> ))}</div> )}
                </window.TaskItem>

                <window.TaskItem title="6. Upload to YouTube" status={tasks.videoUploaded} isLocked={isTaskLocked(5)} onRevisit={() => updateTask('videoUploaded', 'pending')}>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Publish Date</label>
                    <input type="date" value={publishDate} onChange={(e) => setPublishDate(e.target.value)} className="form-input w-auto" readOnly={tasks.videoUploaded === 'complete'}/>
                    {tasks.videoUploaded !== 'complete' ? <button onClick={() => updateTask('videoUploaded', 'complete', { publishDate: publishDate })} disabled={!publishDate} className="mt-4 px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg font-semibold disabled:bg-gray-500">Confirm Upload & Save Date</button> : <p className="text-gray-400 mt-2">Video was uploaded on: {publishDate}</p>}
                </window.TaskItem>
                
                <window.TaskItem title="7. Generate First Comment" status={tasks.firstCommentGenerated} isLocked={isTaskLocked(6)} onRevisit={() => updateTask('firstCommentGenerated', 'pending')}>
                    {tasks.firstCommentGenerated !== 'complete' ? ( <button onClick={() => handleGenerate('firstComment')} disabled={generating === 'firstComment'} className="px-5 py-2.5 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold disabled:bg-gray-500 flex items-center gap-2">{generating === 'firstComment' ? <window.LoadingSpinner text="Generating..." /> : '🪄 Generate Comment'}</button> ) : ( <div><h4 className="text-sm font-semibold text-gray-400 mb-2">Generated Comment</h4><textarea readOnly value={tasks.firstComment || ""} rows="5" className="w-full form-textarea bg-gray-800/50" /></div> )}
                </window.TaskItem>
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
