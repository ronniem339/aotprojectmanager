// js/components/ProjectView/VideoWorkspace.js

const { useState, useEffect, useMemo } = React;

// No longer need to define TASK_PIPELINE or expose TaskItem/CopyButton globally here,
// as they are now handled via window.CREATOR_HUB_CONFIG.TASK_PIPELINE and other window. exposures in common.js.

window.VideoWorkspace = React.memo(({ video, settings, project, userId }) => {
    const [feedbackText, setFeedbackText] = useState(video.tasks?.feedbackText || '');
    const [publishDate, setPublishDate] = useState(video.tasks?.publishDate || '');
    const [generating, setGenerating] = useState(null);
    const [scriptContent, setScriptContent] = useState(video.script || '');
    const [refinementText, setRefinementText] = useState('');
    const [isConceptVisible, setIsConceptVisible] = useState(false);
    const [chapters, setChapters] = useState([]);
    
    const appId = window.CREATOR_HUB_CONFIG.APP_ID;

    useEffect(() => {
        setFeedbackText(video.tasks?.feedbackText || '');
        setPublishDate(video.tasks?.publishDate || '');
        setScriptContent(video.script || '');
        setIsConceptVisible(false);
    }, [video.id, video.script]);
    
    useEffect(() => {
        if (video.metadata) {
            try {
                const parsed = JSON.parse(video.metadata);
                if(parsed.chapters) {
                    setChapters(parsed.chapters.map(ch => ({ ...ch, timestamp: ch.timestamp || '00:00' })));
                }
            } catch(e) { console.error("Could not parse chapters from metadata", e); }
        }
    }, [video.metadata]);
    
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
                    ? `Your task is to refine an existing voiceover script based on user feedback. Original Script:\n---\n${currentContent}\n---\nUser's Refinement Instructions: "${refinement}"\nRewrite the entire script to incorporate the feedback, maintaining the core message and adhering to the style guide. Style Guide: ${styleGuide}\nIMPORTANT: Your response MUST contain ONLY the updated voiceover script text.`
                    : `Your task is to generate a complete, engaging voiceover script for a YouTube video based on the following details. Video Title: "${video.chosenTitle || video.title}". Overall Project Theme: "${project.playlistDescription}". Style Guide: ${styleGuide}. Knowledge Base: ${knowledgeBase}\nIMPORTANT: Your response MUST contain ONLY the voiceover script text, ready for a voice actor. Do NOT include titles, descriptions, metadata, or any other text outside of the script itself. The script should be broken down into logical sections using markdown headings (e.g., # Hook, # Introduction, # Location: [Location Name], # Outro).`;
                const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
                const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
                const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                if (!response.ok) throw new Error(await response.text());
                const result = await response.json();
                setScriptContent(result.candidates[0].content.parts[0].text);
                if (isRefining) setRefinementText('');
            } else if (type === 'metadata') {
                const prompt = `Act as a YouTube SEO expert. Based on the video script provided below, generate an optimized metadata package.
Video Script:
---
${video.script}
---
Knowledge Base:
${knowledgeBase}
---
Your response MUST be a valid JSON object with these exact keys: "titleSuggestions" (array of 3 distinct, catchy titles), "description" (a detailed description incorporating keywords, a hook, and the placeholder '{{CHAPTERS}}'), "tags" (string of comma-separated tags), "chapters" (array of structured objects: {"timestamp": "00:00", "title": "Chapter Title based on script headings"}), and "thumbnailConcepts" (array of 3 structured objects: {"imageSuggestion": "string", "textOverlay": "string"}).`;
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
                
                const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;
                const thumbnailPromises = concepts.map(concept => {
                    const prompt = `A high-CTR YouTube thumbnail. Cinematic, professional photography. ${concept.imageSuggestion}. Text overlay reads: "${concept.textOverlay}".`;
                    const payload = { instances: [{ prompt }], parameters: { "sampleCount": 1 } };
                    return fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
                    .then(response => {
                        if (!response.ok) { console.error(`API Error for thumbnail concept "${concept.imageSuggestion}":`, response.statusText); return null; }
                        return response.json();
                    })
                    .catch(err => { console.error(`Fetch error for thumbnail concept "${concept.imageSuggestion}":`, err); return null; });
                });

                const results = await Promise.all(thumbnailPromises);
                const generatedThumbnails = results.filter(result => result && result.predictions?.[0]?.bytesBase64Encoded).map(result => result.predictions[0].bytesBase64Encoded);

                if (generatedThumbnails.length > 0) {
                    await updateTask('thumbnailsGenerated', 'complete', { 'tasks.generatedThumbnails': generatedThumbnails });
                } else {
                    console.error("All thumbnail generations failed. Please check the API key and concepts.");
                }

            } else if (type === 'firstComment') {
                 const prompt = `Generate a friendly and engaging "first pinned comment" for a YouTube video titled "${video.chosenTitle}". The comment should ask a question to spark conversation and encourage viewers to subscribe or watch other videos.`;
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
    const isTaskLocked = (index) => index > 0 && tasks[window.CREATOR_HUB_CONFIG.TASK_PIPELINE[index - 1].id] !== 'complete'; // Use window.CREATOR_HUB_CONFIG.TASK_PIPELINE
    
    const handleChapterChange = (index, value) => {
        const newChapters = [...chapters];
        newChapters[index].timestamp = value;
        setChapters(newChapters);
    };

    const applyTimestamps = () => {
        const chapterText = chapters.map(c => `${c.timestamp} - ${c.title}`).join('\n');
        const parsedMeta = JSON.parse(video.metadata);
        const newDescription = parsedMeta.description.replace('{{CHAPTERS}}', chapterText);
        updateTask('metadataGenerated', 'complete', { metadata: JSON.stringify({ ...parsedMeta, description: newDescription, chapters: chapters }) });
    };

    const metadata = useMemo(() => {
        try {
            return video.metadata ? JSON.parse(video.metadata) : null;
        } catch { return null; }
    }, [video.metadata]);
    
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
                
                <window.TaskItem title="1. Scripting & Recording" status={tasks.scripting} isLocked={isTaskLocked(0)} onRevisit={() => updateTask('scripting', 'pending')}>
                    {tasks.scripting === 'complete' ? ( <div><h4 className="text-sm font-semibold text-gray-400 mb-2">Final Script (Recorded)</h4><textarea readOnly value={scriptContent || ""} rows="10" className="w-full form-textarea bg-gray-800/50" /></div> ) : tasks.scripting === 'locked' ? ( <div><h4 className="text-sm font-semibold text-gray-400 mb-2">Script Locked - Ready to Record</h4><textarea readOnly value={scriptContent} rows="10" className="w-full form-textarea bg-gray-800/50 mb-4" /><button onClick={() => updateTask('scripting', 'complete')} className="px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg font-semibold">Mark as Recorded</button></div> ) : ( <div>{!scriptContent ? ( <button onClick={() => handleGenerate('script')} disabled={generating === 'script'} className="px-5 py-2.5 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold disabled:bg-gray-500 flex items-center gap-2">{generating === 'script' ? <window.LoadingSpinner text="Generating..." /> : '🪄 Generate Script'}</button> ) : ( <div className="space-y-4"><div><label className="block text-sm font-medium text-gray-300 mb-2">Script Draft</label><textarea value={scriptContent} onChange={(e) => setScriptContent(e.target.value)} rows="12" className="w-full form-textarea" /></div><div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700"><label className="block text-sm font-medium text-gray-300 mb-2">Refinement Instructions</label><textarea value={refinementText} onChange={(e) => setRefinementText(e.target.value)} rows="2" className="w-full form-textarea" placeholder="e.g., 'Make the tone more energetic' or 'Add a section about the local food'"/>
                                        <button onClick={() => handleGenerate('script', scriptContent, refinementText)} disabled={generating === 'script' || !refinementText} className="mt-2 px-4 py-2 text-sm bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold disabled:bg-gray-500 flex items-center gap-2">{generating === 'script' ? <window.LoadingSpinner/> : 'Refine with AI'}</button></div><button onClick={() => updateTask('scripting', 'locked', { script: scriptContent })} className="px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg font-semibold">Confirm & Lock Script</button></div> )}</div>)}
                </window.TaskItem>

                <window.TaskItem title="2. Edit Video" status={tasks.videoEdited} isLocked={isTaskLocked(1)} onRevisit={() => updateTask('videoEdited', 'pending')}>
                     {tasks.videoEdited !== 'complete' && <button onClick={() => updateTask('videoEdited', 'complete')} className="px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg font-semibold">Mark as Edited</button>}
                </window.TaskItem>

                <window.TaskItem title="3. Log Production Changes" status={tasks.feedbackProvided} isLocked={isTaskLocked(2)} onRevisit={() => updateTask('feedbackProvided', 'pending')}>
                    <textarea value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} rows="5" className="w-full form-textarea" placeholder="e.g., 'We decided to combine the first two locations...'" readOnly={tasks.feedbackProvided === 'complete'} />
                    {tasks.feedbackProvided !== 'complete' && <button onClick={() => updateTask('feedbackProvided', 'complete', { 'tasks.feedbackText': feedbackText })} disabled={!feedbackText} className="mt-4 px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg font-semibold disabled:bg-gray-500">Confirm & Save Notes</button>}
                </window.TaskItem>
                
                <window.TaskItem title="4. Generate Metadata" status={tasks.metadataGenerated} isLocked={isTaskLocked(3)} onRevisit={() => updateTask('metadataGenerated', 'pending')}>
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
                
                <window.TaskItem title="5. Generate Thumbnails" status={tasks.thumbnailsGenerated} isLocked={isTaskLocked(4)} onRevisit={() => updateTask('thumbnailsGenerated', 'pending', { 'tasks.generatedThumbnails': [] })}>
                    {tasks.thumbnailsGenerated !== 'complete' ? (<button onClick={() => handleGenerate('thumbnails')} disabled={generating === 'thumbnails'} className="px-5 py-2.5 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold disabled:bg-gray-500 flex items-center gap-2">{generating === 'thumbnails' ? <window.LoadingSpinner text="Generating..." /> : '🪄 Generate Thumbnails'}</button> ) : ( <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">{tasks.generatedThumbnails?.map((base64, index) => ( <img key={index} src={`data:image/png;base64,${base64}`} className="rounded-lg object-cover" alt={`Generated Thumbnail ${index + 1}`}/> ))}</div> )}
                </window.TaskItem>

                <window.TaskItem title="6. Upload to YouTube" status={tasks.videoUploaded} isLocked={isTaskLocked(5)} onRevisit={() => updateTask('videoUploaded', 'pending')}>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Publish Date</label>
                    <input type="date" value={publishDate} onChange={(e) => setPublishDate(e.target.value)} className="form-input w-auto" readOnly={tasks.videoUploaded === 'complete'}/>
                    {tasks.videoUploaded !== 'complete' && <button onClick={() => updateTask('videoUploaded', 'complete', { 'tasks.publishDate': publishDate })} disabled={!publishDate} className="mt-4 px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg font-semibold disabled:bg-gray-500">Confirm Upload & Save Date</button>}
                </window.TaskItem>
                
                <window.TaskItem title="7. Generate First Comment" status={tasks.firstCommentGenerated} isLocked={isTaskLocked(6)} onRevisit={() => updateTask('firstCommentGenerated', 'pending')}>
                    {tasks.firstCommentGenerated !== 'complete' ? ( <button onClick={() => handleGenerate('firstComment')} disabled={generating === 'firstComment'} className="px-5 py-2.5 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold disabled:bg-gray-500 flex items-center gap-2">{generating === 'firstComment' ? <window.LoadingSpinner text="Generating..." /> : '🪄 Generate Comment'}</button> ) : ( <div><h4 className="text-sm font-semibold text-gray-400 mb-2">Generated Comment</h4><textarea readOnly value={tasks.firstComment || ""} rows="5" className="w-full form-textarea bg-gray-800/50" /></div> )}
                </window.TaskItem>
            </div>
        </main>
    );
});
