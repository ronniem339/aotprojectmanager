// js/components/ProjectView.js

const VideoProductionModule = ({ video, settings, project, userId }) => {
    const [activeTab, setActiveTab] = useState('script');
    const [generating, setGenerating] = useState(null);
    const [metadata, setMetadata] = useState(null);
    const [chapters, setChapters] = useState([{ timestamp: '00:00', title: 'Intro' }]);
    
    const appId = window.CREATOR_HUB_CONFIG.APP_ID;

    useEffect(() => {
        if (video.metadata) {
            try {
                const parsedMeta = JSON.parse(video.metadata);
                setMetadata(parsedMeta);
                if (!video.chosenTitle && parsedMeta.titleSuggestions && parsedMeta.titleSuggestions.length > 0) {
                    handleTextChange('chosenTitle', parsedMeta.titleSuggestions[0]);
                }
            }
            catch (e) { setMetadata({ raw: video.metadata }); }
        } else { setMetadata(null); }
    }, [video.metadata]);

    const handleGenerate = async (type) => {
        const apiKey = settings.geminiApiKey || "";
        if (!apiKey) {
            console.error("Please set your Gemini API Key in the settings first.");
            return;
        }
        setGenerating(type);
        let prompt;
        const knowledgeBase = settings.youtubeSeoKnowledgeBase || window.CREATOR_HUB_CONFIG.YOUTUBE_SEO_KNOWLEDGE_BASE;
        const styleGuide = `This is my Style Guide, you must adhere to it:\n${settings.styleGuideText || 'Default informative tone'}`;
        const footageInfo = `This is the footage I have:\n${project.locations?.map(l => `- ${l.name}: ${Object.entries(l.footage || {}).filter(([, v]) => v).map(([k]) => k).join(', ')}`).join('\n')}`;
        const videoLength = `The video should be between 5 and 20 minutes long. Adjust script length accordingly based on the number of locations.`;

        switch (type) {
            case 'script': prompt = `${knowledgeBase}\n${styleGuide}\n\n${footageInfo}\n\n${videoLength}\n\nGenerate a complete, engaging voiceover script only for a YouTube video titled "${video.chosenTitle || video.title}". The overall project theme is "${project.playlistDescription}". Do NOT include camera directions, shot lists, or scene numbers. The script should be broken down into logical sections using markdown headings (e.g., # Hook, # Introduction, # Location: [Location Name], # Outro).`; break;
            case 'metadata': prompt = `${knowledgeBase}\n\nAct as a YouTube SEO expert. Based on the video titled "${video.chosenTitle || video.title}" with concept "${video.concept}", generate an optimized metadata package. Prioritize the knowledge base over creative style for SEO. Your response MUST be a valid JSON object with NO other text before or after it, with keys: "titleSuggestions" (array of 3 distinct, catchy, keyword-rich titles under 70 characters), "description" (string, a detailed description ~3000-4000 characters incorporating keywords, a hook, and a placeholder for chapters like 'CHAPTERS_HERE'), "tags" (string of comma-separated tags, ~450-500 characters total), and "thumbnailConcepts" (array of 3 distinct, high-CTR thumbnail concepts as structured objects: {"imageSuggestion": "string", "textOverlay": "string"}).`; break;
            case 'blogPost': prompt = `${styleGuide}\n\nWrite a complete, standalone blog post of at least 700 words based on the video script: "${video.script}". Incorporate on-page SEO best practices for Google Search (headings, keyword density, natural language). The post should be engaging and provide value on its own, not just summarize the video. Include a placeholder like [YOUTUBE_VIDEO_EMBED] where the video should go.`; break;
            case 'shortsIdeas': prompt = `${knowledgeBase}\n${styleGuide}\n\nGenerate as many high-quality ideas as possible for 9:16 vertical videos (YouTube Shorts/Reels) to promote the main video titled "${video.chosenTitle || video.title}". For each idea, provide a "hook," "footageToUse" (referencing the provided footage inventory), and "onScreenText." Format as a numbered list.`; break;
        }
        try {
            const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }], ...(type === 'metadata' && { generationConfig: { responseMimeType: "application/json" } }) };
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
            const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!response.ok) { const err = await response.json(); throw new Error(err?.error?.message || 'API Error'); }
            const result = await response.json();
            let generatedText = result.candidates[0].content.parts[0].text;
            const videoDocRef = db.collection(`artifacts/${appId}/users/${userId}/projects/${project.id}/videos`).doc(video.id);
            await videoDocRef.update({ [type]: generatedText });
        } catch (error) { console.error("Error generating content:", error); } finally { setGenerating(null); }
    };

    const handleTextChange = async (field, value) => { const videoDocRef = db.collection(`artifacts/${appId}/users/${userId}/projects/${project.id}/videos`).doc(video.id); await videoDocRef.update({ [field]: value }); };
    const handleChapterChange = (index, field, value) => { const newChapters = [...chapters]; newChapters[index][field] = value; setChapters(newChapters); };
    const addChapter = () => setChapters([...chapters, { timestamp: '', title: '' }]);
    const applyChapters = () => { if (!metadata?.description) return; const chapterString = chapters.map(c => `${c.timestamp} ${c.title}`).join('\n'); const newDescription = metadata.description.replace('CHAPTERS_HERE', chapterString); handleTextChange('metadata', JSON.stringify({ ...metadata, description: newDescription })); };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'script': return (<div><div className="flex justify-between items-center mb-2"><h4 className="text-xl font-semibold">Voiceover Script</h4><button onClick={() => handleGenerate('script')} disabled={!!generating} className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 rounded-md text-sm font-semibold flex items-center gap-2 disabled:bg-gray-500">{generating === 'script' ? <LoadingSpinner /> : '🪄 Generate'}</button></div><textarea value={video.script || ''} onChange={(e) => handleTextChange('script', e.target.value)} rows="20" className="w-full form-textarea text-base leading-relaxed whitespace-pre-wrap" placeholder="Generate or write your script..." /></div>)
            case 'metadata': return (<div><div className="flex justify-between items-center mb-2"><h4 className="text-xl font-semibold">YouTube Metadata</h4><button onClick={() => handleGenerate('metadata')} disabled={!!generating} className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 rounded-md text-sm font-semibold flex items-center gap-2 disabled:bg-gray-500">{generating === 'metadata' ? <LoadingSpinner /> : '🪄 Generate'}</button></div>{metadata && !metadata.raw ? (<div className="space-y-4"><div><label className="text-sm font-semibold text-gray-400">Title Suggestions</label><div className="p-2 form-input bg-gray-800 space-y-2">{metadata.titleSuggestions?.map(title => (<label key={title} className="flex items-center gap-2 cursor-pointer"><input type="radio" name={`title-${video.id}`} value={title} checked={video.chosenTitle === title} onChange={(e) => handleTextChange('chosenTitle', e.target.value)} className="h-4 w-4 bg-gray-900 border-gray-600 text-indigo-600 focus:ring-indigo-500" />{title}</label>))}</div></div><div><label className="text-sm font-semibold text-gray-400">Description</label><p className="form-textarea bg-gray-800 h-32 overflow-y-auto whitespace-pre-wrap">{metadata.description}</p></div><div><h5 className="text-sm font-semibold text-gray-400">Chapters</h5>{chapters.map((c, i) => (<div key={i} className="flex gap-2 items-center"><input type="text" value={c.timestamp} onChange={(e) => handleChapterChange(i, 'timestamp', e.target.value)} placeholder="00:00" className="form-input w-20" /><input type="text" value={c.title} onChange={(e) => handleChapterChange(i, 'title', e.target.value)} placeholder="Chapter Title" className="form-input" /></div>))}{metadata.description?.includes('CHAPTERS_HERE') && <div className="flex gap-2 mt-2"><button onClick={addChapter} className="text-xs">Add Chapter</button><button onClick={applyChapters} className="text-xs text-green-400">Apply Chapters</button></div>}</div><div><label className="text-sm font-semibold text-gray-400">Tags</label><p className="form-textarea bg-gray-800">{metadata.tags}</p></div><div><label className="text-sm font-semibold text-gray-400">Thumbnail Concepts</label><div className="grid grid-cols-1 md:grid-cols-3 gap-2">{metadata.thumbnailConcepts?.map((idea, i) => (<div key={i} className="p-2 bg-gray-800 rounded-lg"> <p className="font-semibold">Idea {i + 1}:</p><p className="text-xs mt-1"><b>Image:</b> {idea.imageSuggestion}</p><p className="text-xs mt-1"><b>Text:</b> {idea.textOverlay}</p></div>))}</div></div></div>) : <textarea value={video.metadata || ''} onChange={(e) => handleTextChange('metadata', e.target.value)} rows="15" className="w-full form-textarea" placeholder="Generate metadata to see results..." />}</div>)
            case 'blogPost': return (<div><div className="flex justify-between items-center mb-2"><h4 className="text-xl font-semibold">Blog Post</h4><button onClick={() => handleGenerate('blogPost')} disabled={!!generating} className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 rounded-md text-sm font-semibold flex items-center gap-2 disabled:bg-gray-500">{generating === 'blogPost' ? <LoadingSpinner /> : '🪄 Generate'}</button></div><textarea value={video.blogPost || ''} onChange={(e) => handleTextChange('blogPost', e.target.value)} rows="20" className="w-full form-textarea text-base leading-relaxed" placeholder="Generate or write your blog post..." /></div>)
            case 'shortsIdeas': return (<div><div className="flex justify-between items-center mb-2"><h4 className="text-xl font-semibold">Shorts Ideas</h4><button onClick={() => handleGenerate('shortsIdeas')} disabled={!!generating} className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 rounded-md text-sm font-semibold flex items-center gap-2 disabled:bg-gray-500">{generating === 'shortsIdeas' ? <LoadingSpinner /> : '🪄 Generate'}</button></div><textarea value={video.shortsIdeas || ''} onChange={(e) => handleTextChange('shortsIdeas', e.target.value)} rows="20" className="w-full form-textarea text-base leading-relaxed whitespace-pre-wrap" placeholder="Generate or write your shorts ideas..." /></div>)
        }
    };

    return (<div className="glass-card p-6 rounded-lg"><h3 className="text-3xl font-bold text-blue-300 mb-6">{video.chosenTitle || video.title}</h3><div className="flex border-b border-gray-700 mb-4 overflow-x-auto"><button onClick={() => setActiveTab('script')} className={`py-2 px-4 tab-button ${activeTab === 'script' ? 'tab-button-active' : 'text-gray-400 hover:bg-gray-700'}`}>🎬 Script</button><button onClick={() => setActiveTab('metadata')} className={`py-2 px-4 tab-button ${activeTab === 'metadata' ? 'tab-button-active' : 'text-gray-400 hover:bg-gray-700'}`}>📊 Metadata</button><button onClick={() => setActiveTab('blogPost')} className={`py-2 px-4 tab-button ${activeTab === 'blogPost' ? 'tab-button-active' : 'text-gray-400 hover:bg-gray-700'}`}>✍️ Blog</button><button onClick={() => setActiveTab('shortsIdeas')} className={`py-2 px-4 tab-button ${activeTab === 'shortsIdeas' ? 'tab-button-active' : 'text-gray-400 hover:bg-gray-700'}`}>📱 Shorts</button></div>{renderTabContent()}</div>);
};

const ProjectView = ({ project, userId, onBack, settings }) => {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeVideoId, setActiveVideoId] = useState(null);
    const appId = window.CREATOR_HUB_CONFIG.APP_ID;


    useEffect(() => {
        if (!userId || !project?.id) return;
        const videosCollectionRef = db.collection(`artifacts/${appId}/users/${userId}/projects/${project.id}/videos`);
        const unsubscribe = videosCollectionRef.onSnapshot(querySnapshot => {
            const videosData = [];
            querySnapshot.forEach((doc) => { videosData.push({ id: doc.id, ...doc.data() }); });
            videosData.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            setVideos(videosData);
            if (videosData.length > 0 && !activeVideoId) {
                setActiveVideoId(videosData[0].id);
            }
            setLoading(false);
        }, (error) => { console.error("Error fetching videos:", error); setLoading(false); });
        return () => unsubscribe();
    }, [userId, project.id, activeVideoId]);

    const activeVideo = videos.find(v => v.id === activeVideoId);

    return (
        <div className="p-4 md:p-8">
            <button onClick={onBack} className="flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-6">
                ⬅️ Back to Dashboard
            </button>
            <div className="mb-8 p-4 glass-card">
                <h2 className="text-2xl font-bold text-blue-300">{project.playlistTitle || project.title}</h2>
                <p className="mt-2 text-gray-300 whitespace-pre-wrap">{project.playlistDescription || ''}</p>
            </div>
            {loading ? <LoadingSpinner /> : (
                <div className="flex flex-col md:flex-row gap-8">
                    <div className="md:w-1/4">
                        <h3 className="text-xl font-semibold mb-4">Videos</h3>
                        <div className="space-y-2">
                            {videos.map(video => (
                                <button
                                    key={video.id}
                                    onClick={() => setActiveVideoId(video.id)}
                                    className={`w-full text-left p-3 rounded-lg transition-colors ${activeVideoId === video.id ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                                >
                                    {video.chosenTitle || video.title}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="md:w-3/4">
                        {activeVideo && <VideoProductionModule key={activeVideo.id} video={activeVideo} settings={settings} project={project} userId={userId} />}
                    </div>
                </div>
            )}
        </div>
    );
};
