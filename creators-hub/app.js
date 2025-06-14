// --- Firebase Setup ---
const firebaseConfig = {
  apiKey: "AIzaSyDMyKgfdFF55V8OKp_1u684IWeWkpWtQNA",
  authDomain: "aot-project-manager.firebaseapp.com",
  projectId: "aot-project-manager",
  storageBucket: "aot-project-manager.appspot.com",
  messagingSenderId: "732535263997",
  appId: "1:732535263997:web:c9281e5696b8830f0f6494"
};
const appId = 'creators-hub-deploy';
const initialAuthToken = null;

// Initialize Firebase using the compat libraries loaded in index.html
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const { useState, useEffect, useRef, useCallback } = React;

// --- YouTube SEO Knowledge Base ---
const YOUTUBE_SEO_KNOWLEDGE_BASE = `
    **YouTube SEO Best Practices:**
    1.  **Titles:** Include main keywords naturally at the beginning. Keep it under 70 characters. Use numbers or intrigue to boost CTR. For playlists, the title should be broad but compelling.
    2.  **Descriptions:** The first 2-3 sentences are crucial. Include main keywords and a hook. Write a detailed mini-blog post (200-300 words) explaining the video's content and value. Use keywords naturally. Include timestamps and relevant links.
    3.  **Tags:** Use a mix of broad and long-tail tags (15-30 total). Your first tag should be your main target keyword.
    4.  **Thumbnails:** High-contrast, clear, emotionally compelling. Use bold, minimal text. Bright colors draw the eye. It must visually represent the title's promise.
    5.  **Playlists:** A playlist is a series. The title and description should reflect the entire journey and explain why someone should watch it in order.
`;

// --- Helper Functions & Components ---
const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
        return () => { clearTimeout(handler); };
    }, [value, delay]);
    return debouncedValue;
};
const loadGoogleMapsScript = (apiKey, callback) => {
    if (window.google?.maps?.places) { if (callback) callback(); return; }
    const existingScript = document.getElementById('googleMaps');
    if (existingScript) { setTimeout(() => { if (window.google?.maps?.places && callback) callback(); }, 500); return; }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.id = 'googleMaps';
    document.body.appendChild(script);
    script.onload = () => { if(callback) callback() };
    script.onerror = () => console.error("Google Maps script failed to load.");
};

const LoadingSpinner = ({ text = "" }) => (<div className="flex flex-col justify-center items-center p-4"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>{text && <p className="mt-3 text-sm text-gray-400">{text}</p>}</div>);
const ImageComponent = ({ src, alt, className }) => {
    const [imgSrc, setImgSrc] = useState(src);
    const placeholder = `https://placehold.co/600x400/1f2937/3b82f6?text=${encodeURIComponent(alt)}`;
    useEffect(() => { setImgSrc(src) }, [src]);
    return <img src={imgSrc || placeholder} alt={alt} className={className} onError={() => setImgSrc(placeholder)} />;
};

// --- Main Application Components ---
const LoginScreen = ({ onLogin }) => (<div className="min-h-screen flex flex-col justify-center items-center bg-gray-900 text-white"><h1 className="text-5xl font-bold mb-4">Creator's Hub</h1><p className="text-xl text-gray-400 mb-8">Your AI-Powered Content Co-Pilot</p><button onClick={onLogin} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-lg font-semibold transition-all duration-300 transform hover:scale-105">Start Creating</button></div>);

const SettingsView = ({ settings, onSave, onBack }) => {
    const [localSettings, setLocalSettings] = useState(settings);
    useEffect(() => { setLocalSettings(settings); }, [settings]);
    const handleSave = () => { onSave(localSettings); };
    const handleChange = (e) => { const { name, value } = e.target; setLocalSettings(prev => ({...prev, [name]: value})); };
    return (<div className="p-8"><button onClick={onBack} className="flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-6">⬅️ Back to Dashboard</button><h1 className="text-4xl font-bold mb-4">Technical Settings</h1><p className="text-gray-400 mb-8">Manage your API keys here.</p><div className="space-y-6"><div><label className="block text-sm font-medium text-gray-300 mb-2">Your Gemini API Key</label><input type="password" name="geminiApiKey" value={localSettings.geminiApiKey || ''} onChange={handleChange} className="w-full form-input" placeholder="Enter your Gemini API Key"/></div><div><label className="block text-sm font-medium text-gray-300 mb-2">Your Google Maps API Key</label><input type="password" name="googleMapsApiKey" value={localSettings.googleMapsApiKey || ''} onChange={handleChange} className="w-full form-input" placeholder="Enter your Google Maps API Key (for location search)"/></div></div><div className="mt-8 text-right"><button onClick={handleSave} className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors">Save Keys</button></div></div>);
};

const VideoProductionModule = ({ video, settings, project, userId }) => {
    const [activeTab, setActiveTab] = useState('script');
    const [generating, setGenerating] = useState(null);
    const [metadata, setMetadata] = useState(null);
    const [chapters, setChapters] = useState([{timestamp: '00:00', title: 'Intro'}]);

    useEffect(() => {
        if (video.metadata) {
            try { 
                const parsedMeta = JSON.parse(video.metadata);
                setMetadata(parsedMeta);
                if(!video.chosenTitle && parsedMeta.titleSuggestions && parsedMeta.titleSuggestions.length > 0) {
                    handleTextChange('chosenTitle', parsedMeta.titleSuggestions[0]);
                }
            } 
            catch (e) { setMetadata({ raw: video.metadata }); }
        } else { setMetadata(null); }
    }, [video.metadata]);
    
    const handleGenerate = async (type) => {
        const apiKey = settings.geminiApiKey || "";
        if (!apiKey && !window.__firebase_config) { alert("Please set your Gemini API Key in the settings first."); return; }
        setGenerating(type);
        let prompt;
        const styleGuide = `This is my Style Guide, you must adhere to it:\n${settings.styleGuideText || 'Default informative tone'}`;
        const footageInfo = `This is the footage I have:\n${project.locations?.map(l => `- ${l.name}: ${Object.entries(l.footage || {}).filter(([,v])=>v).map(([k])=>k).join(', ')}`).join('\n')}`;
        const knowledgeBase = `This is my foundational knowledge base:\n${YOUTUBE_SEO_KNOWLEDGE_BASE}`;
        const videoLength = `The video should be between 5 and 20 minutes long. Adjust script length accordingly based on the number of locations.`;

        switch(type) {
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
    const addChapter = () => setChapters([...chapters, {timestamp: '', title: ''}]);
    const applyChapters = () => { if(!metadata?.description) return; const chapterString = chapters.map(c => `${c.timestamp} ${c.title}`).join('\n'); const newDescription = metadata.description.replace('CHAPTERS_HERE', chapterString); handleTextChange('metadata', JSON.stringify({...metadata, description: newDescription})); };
    
    const renderTabContent = () => {
        switch(activeTab) {
            case 'script': return (<div><div className="flex justify-between items-center mb-2"><h4 className="text-xl font-semibold">Voiceover Script</h4><button onClick={() => handleGenerate('script')} disabled={!!generating} className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 rounded-md text-sm font-semibold flex items-center gap-2 disabled:bg-gray-500">{generating === 'script' ? <LoadingSpinner/> : '🪄 Generate'}</button></div><textarea value={video.script || ''} onChange={(e) => handleTextChange('script', e.target.value)} rows="20" className="w-full form-textarea text-base leading-relaxed whitespace-pre-wrap" placeholder="Generate or write your script..."/></div>)
            case 'metadata': return (<div><div className="flex justify-between items-center mb-2"><h4 className="text-xl font-semibold">YouTube Metadata</h4><button onClick={() => handleGenerate('metadata')} disabled={!!generating} className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 rounded-md text-sm font-semibold flex items-center gap-2 disabled:bg-gray-500">{generating === 'metadata' ? <LoadingSpinner/> : '🪄 Generate'}</button></div>{metadata && !metadata.raw ? (<div className="space-y-4"><div><label className="text-sm font-semibold text-gray-400">Title Suggestions</label><div className="p-2 form-input bg-gray-800 space-y-2">{metadata.titleSuggestions?.map(title => (<label key={title} className="flex items-center gap-2 cursor-pointer"><input type="radio" name={`title-${video.id}`} value={title} checked={video.chosenTitle === title} onChange={(e) => handleTextChange('chosenTitle', e.target.value)} className="h-4 w-4 bg-gray-900 border-gray-600 text-indigo-600 focus:ring-indigo-500"/>{title}</label>))}</div></div><div><label className="text-sm font-semibold text-gray-400">Description</label><p className="form-textarea bg-gray-800 h-32 overflow-y-auto whitespace-pre-wrap">{metadata.description}</p></div><div><h5 className="text-sm font-semibold text-gray-400">Chapters</h5>{chapters.map((c, i) => (<div key={i} className="flex gap-2 items-center"><input type="text" value={c.timestamp} onChange={(e) => handleChapterChange(i, 'timestamp', e.target.value)} placeholder="00:00" className="form-input w-20"/><input type="text" value={c.title} onChange={(e) => handleChapterChange(i, 'title', e.target.value)} placeholder="Chapter Title" className="form-input"/></div>))}{metadata.description?.includes('CHAPTERS_HERE') && <div className="flex gap-2 mt-2"><button onClick={addChapter} className="text-xs">Add Chapter</button><button onClick={applyChapters} className="text-xs text-green-400">Apply Chapters</button></div>}</div><div><label className="text-sm font-semibold text-gray-400">Tags</label><p className="form-textarea bg-gray-800">{metadata.tags}</p></div><div><label className="text-sm font-semibold text-gray-400">Thumbnail Concepts</label><div className="grid grid-cols-1 md:grid-cols-3 gap-2">{metadata.thumbnailConcepts?.map((idea, i) => (<div key={i} className="p-2 bg-gray-800 rounded-lg"> <p className="font-semibold">Idea {i+1}:</p><p className="text-xs mt-1"><b>Image:</b> {idea.imageSuggestion}</p><p className="text-xs mt-1"><b>Text:</b> {idea.textOverlay}</p></div>))}</div></div></div>) : <textarea value={video.metadata || ''} onChange={(e) => handleTextChange('metadata', e.target.value)} rows="15" className="w-full form-textarea" placeholder="Generate metadata to see results..."/>}</div>)
            case 'blogPost': return (<div><div className="flex justify-between items-center mb-2"><h4 className="text-xl font-semibold">Blog Post</h4><button onClick={() => handleGenerate('blogPost')} disabled={!!generating} className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 rounded-md text-sm font-semibold flex items-center gap-2 disabled:bg-gray-500">{generating === 'blogPost' ? <LoadingSpinner/> : '🪄 Generate'}</button></div><textarea value={video.blogPost || ''} onChange={(e) => handleTextChange('blogPost', e.target.value)} rows="20" className="w-full form-textarea text-base leading-relaxed" placeholder="Generate or write your blog post..."/></div>)
            case 'shortsIdeas': return (<div><div className="flex justify-between items-center mb-2"><h4 className="text-xl font-semibold">Shorts Ideas</h4><button onClick={() => handleGenerate('shortsIdeas')} disabled={!!generating} className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 rounded-md text-sm font-semibold flex items-center gap-2 disabled:bg-gray-500">{generating === 'shortsIdeas' ? <LoadingSpinner/> : '🪄 Generate'}</button></div><textarea value={video.shortsIdeas || ''} onChange={(e) => handleTextChange('shortsIdeas', e.target.value)} rows="20" className="w-full form-textarea text-base leading-relaxed whitespace-pre-wrap" placeholder="Generate or write your shorts ideas..."/></div>)
        }
    };
    return (<div className="glass-card p-6 rounded-lg"><h3 className="text-3xl font-bold text-blue-300 mb-6">{video.chosenTitle || video.title}</h3><div className="flex border-b border-gray-700 mb-4 overflow-x-auto"><button onClick={() => setActiveTab('script')} className={`py-2 px-4 tab-button ${activeTab === 'script' ? 'tab-button-active' : 'text-gray-400 hover:bg-gray-700'}`}>🎬 Script</button><button onClick={() => setActiveTab('metadata')} className={`py-2 px-4 tab-button ${activeTab === 'metadata' ? 'tab-button-active' : 'text-gray-400 hover:bg-gray-700'}`}>📊 Metadata</button><button onClick={() => setActiveTab('blogPost')} className={`py-2 px-4 tab-button ${activeTab === 'blogPost' ? 'tab-button-active' : 'text-gray-400 hover:bg-gray-700'}`}>✍️ Blog</button><button onClick={() => setActiveTab('shortsIdeas')} className={`py-2 px-4 tab-button ${activeTab === 'shortsIdeas' ? 'tab-button-active' : 'text-gray-400 hover:bg-gray-700'}`}>📱 Shorts</button></div>{renderTabContent()}</div>);
};
        const ProjectView = ({ project, userId, onBack, settings }) => {
            const [videos, setVideos] = useState([]);
            const [loading, setLoading] = useState(true);
            const [activeVideoId, setActiveVideoId] = useState(null);
            
            useEffect(() => {
                if (!userId || !project?.id) return;
                const videosCollectionRef = db.collection(`artifacts/${appId}/users/${userId}/projects/${project.id}/videos`);
                const unsubscribe = videosCollectionRef.onSnapshot(querySnapshot => {
                    const videosData = [];
                    querySnapshot.forEach((doc) => { videosData.push({ id: doc.id, ...doc.data() }); });
                    setVideos(videosData);
                    if (videosData.length > 0 && !activeVideoId) {
                        setActiveVideoId(videosData[0].id);
                    }
                    setLoading(false);
                }, (error) => { console.error("Error fetching videos:", error); setLoading(false); });
                return () => unsubscribe();
            }, [userId, project.id]);

            const activeVideo = videos.find(v => v.id === activeVideoId);

            return (
                <div className="p-4 md:p-8">
                    <button onClick={onBack} className="flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-6">⬅️ Back to Dashboard</button>
                    <div className="mb-8 p-4 glass-card">
                        <h2 className="text-2xl font-bold text-blue-300">{project.playlistTitle || project.title}</h2>
                        <p className="mt-2 text-gray-300 whitespace-pre-wrap">{project.playlistDescription || ''}</p>
                    </div>
                    {loading ? <LoadingSpinner/> : (
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
        const MyStudioView = ({ settings, onSave, onBack }) => {
            const [styleInputs, setStyleInputs] = useState({ 
                myWriting: settings.myWriting || '', 
                admiredWriting: settings.admiredWriting || '', 
                keywords: settings.keywords || '',
                dosAndDonts: settings.dosAndDonts || '',
                excludedPhrases: settings.excludedPhrases || ''
            });
            const [styleGuideText, setStyleGuideText] = useState(settings.styleGuideText || '');
            const [isLoading, setIsLoading] = useState(false);
            
            useEffect(() => {
                setStyleGuideText(settings.styleGuideText || '');
                setStyleInputs({
                    myWriting: settings.myWriting || '',
                    admiredWriting: settings.admiredWriting || '',
                    keywords: settings.keywords || '',
                    dosAndDonts: settings.dosAndDonts || '',
                    excludedPhrases: settings.excludedPhrases || ''
                })
            }, [settings]);

            const handleAnalyzeStyle = async () => {
                const apiKey = settings.geminiApiKey || "";
                if (!apiKey) { alert("Please set your Gemini API Key in Settings first."); return; }
                setIsLoading(true);
                const prompt = `Analyze the following inputs to define a detailed YouTube creator's style guide.
                1.  **My Writing Sample:** "${styleInputs.myWriting}"
                2.  **Admired Writing Sample:** "${styleInputs.admiredWriting}"
                3.  **Descriptive Keywords:** "${styleInputs.keywords}"
                4.  **Specific Dos and Don'ts:** "${styleInputs.dosAndDonts}"
                5.  **Excluded Phrases:** "${styleInputs.excludedPhrases}"

                Synthesize these inputs into a structured style guide covering: Tone, Pacing, Vocabulary, Sentence Structure, and Humor. Also include the explicit Dos/Don'ts and Excluded Phrases. Provide a detailed, actionable description for each category.`;
                try {
                    const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }]};
                    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
                    const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                    if (!response.ok) { const err = await response.json(); throw new Error(err?.error?.message || 'API Error'); }
                    const result = await response.json();
                    const generatedGuide = result.candidates[0].content.parts[0].text;
                    setStyleGuideText(generatedGuide);
                } catch(e) { console.error(e); alert("Error analyzing style: " + e.message);
                } finally { setIsLoading(false); }
            };
            
            const handleSave = () => {
                onSave({ ...settings, ...styleInputs, styleGuideText: styleGuideText });
            };

            return (
                <div className="p-8">
                    <button onClick={onBack} className="flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-6">⬅️ Back to Dashboard</button>
                    <h1 className="text-4xl font-bold mb-4">🎨 My Studio</h1>
                    <p className="text-gray-400 mb-8">Train the AI on your unique creative style. The more detail you provide, the better the AI's suggestions will be.</p>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div>
                             <h2 className="text-2xl font-semibold mb-4">Style Inputs</h2>
                             <div className="space-y-4">
                                <div><label className="block text-sm font-medium text-gray-300 mb-2">An example of your writing</label><textarea value={styleInputs.myWriting} onChange={(e) => setStyleInputs(p => ({...p, myWriting: e.target.value}))} rows="6" className="form-textarea" placeholder="Paste a sample of a previous script or blog post here..."></textarea></div>
                                <div><label className="block text-sm font-medium text-gray-300 mb-2">Writing you admire</label><textarea value={styleInputs.admiredWriting} onChange={(e) => setStyleInputs(p => ({...p, admiredWriting: e.target.value}))} rows="6" className="form-textarea" placeholder="Paste a sample from another creator or writer whose style you like..."></textarea></div>
                                <div><label className="block text-sm font-medium text-gray-300 mb-2">Keywords describing your style</label><input type="text" value={styleInputs.keywords} onChange={(e) => setStyleInputs(p => ({...p, keywords: e.target.value}))} className="form-input" placeholder="e.g., witty, cinematic, fast-paced, educational"/></div>
                                <div><label className="block text-sm font-medium text-gray-300 mb-2">Style Dos and Don'ts</label><textarea value={styleInputs.dosAndDonts} onChange={(e) => setStyleInputs(p => ({...p, dosAndDonts: e.target.value}))} rows="3" className="form-textarea" placeholder="e.g., DO use humor. DON'T be too formal."></textarea></div>
                                <div><label className="block text-sm font-medium text-gray-300 mb-2">Excluded Phrases & Words</label><textarea value={styleInputs.excludedPhrases} onChange={(e) => setStyleInputs(p => ({...p, excludedPhrases: e.target.value}))} rows="3" className="form-textarea" placeholder="e.g., synergy, circle back, at the end of the day"></textarea></div>
                                <button onClick={handleAnalyzeStyle} disabled={isLoading} className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold flex items-center justify-center gap-2 disabled:bg-gray-500">{isLoading ? <LoadingSpinner/> : '🧬 Analyze & Create Style Guide'}</button>
                             </div>
                        </div>
                         <div>
                             <h2 className="text-2xl font-semibold mb-4">Your AI-Powered Style Guide</h2>
                             <textarea value={styleGuideText} onChange={(e) => setStyleGuideText(e.target.value)} rows="32" className="form-textarea leading-relaxed" placeholder="Your generated style guide will appear here. You can edit it directly."></textarea>
                         </div>
                    </div>
                    <div className="mt-8 text-right">
                        <button onClick={handleSave} className="px-8 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors">Save My Style</button>
                    </div>
                </div>
            );
        };
        const NewProjectWizard = ({ userId, settings, onClose, googleMapsLoaded, initialDraft }) => {
            const [step, setStep] = useState(initialDraft?.step || 1);
            const [inputs, setInputs] = useState(initialDraft?.inputs || { location: '', theme: '' });
            const [locations, setLocations] = useState(initialDraft?.locations || []);
            const [footageInventory, setFootageInventory] = useState(initialDraft?.footageInventory || {});
            const [editableOutline, setEditableOutline] = useState(initialDraft?.editableOutline || null);
            const [refinement, setRefinement] = useState('');
            const [error, setError] = useState('');
            const [isLoading, setIsLoading] = useState(false);
            
            const debouncedState = useDebounce({ step, inputs, locations, footageInventory, editableOutline }, 1000);

            useEffect(() => {
                if(userId) {
                    const draftRef = db.collection(`artifacts/${appId}/users/${userId}/wizards`).doc('newProjectDraft');
                    draftRef.set(debouncedState, { merge: true });
                }
            }, [debouncedState, userId]);
            
            const handleStartOver = async () => {
                if(confirm("Are you sure you want to start over? This will clear your current project draft.")) {
                    const draftRef = db.collection(`artifacts/${appId}/users/${userId}/wizards`).doc('newProjectDraft');
                    await draftRef.delete();
                    setStep(1);
                    setInputs({ location: '', theme: '' });
                    setLocations([]);
                    setFootageInventory({});
                    setEditableOutline(null);
                    setError('');
                }
            };

            const handleLocationsUpdate = (newLocations) => { setLocations(newLocations); const newInventory = {}; newLocations.forEach(loc => { newInventory[loc.place_id] = footageInventory[loc.place_id] || { bRoll: false, onCamera: false, drone: false }; }); setFootageInventory(newInventory); };
            const handleFootageChange = (placeId, type) => { setFootageInventory(prev => ({ ...prev, [placeId]: { ...prev[placeId], [type]: !prev[placeId][type] } })); };
            const handleOutlineChange = (e, videoIndex = null, field) => {
                const { value } = e.target;
                setEditableOutline(prev => {
                    if (videoIndex !== null) { const newVideos = [...prev.videos]; newVideos[videoIndex] = {...newVideos[videoIndex], [field]: value }; return {...prev, videos: newVideos }; }
                    return {...prev, [field]: value };
                });
            };

            const handleGenerateOrRefineOutline = async (isRefinement = false) => {
                const apiKey = settings.geminiApiKey || "";
                if (!apiKey && !window.__firebase_config) { setError("Please set your Gemini API Key in the settings first."); return; }
                setIsLoading(true); setError('');
                const inventorySummary = locations.map(loc => { const types = []; if (footageInventory[loc.place_id]?.bRoll) types.push("B-Roll"); if (footageInventory[loc.place_id]?.onCamera) types.push("On-camera segments"); if (footageInventory[loc.place_id]?.drone) types.push("Drone footage"); return `- ${loc.name}: ${types.join(', ')}`; }).join('\n');
                let prompt;
                const schema = `{ "playlistTitle": "...", "playlistDescription": "...", "videos": [ { "title": "...", "concept": "..." } ] }`;
                if(isRefinement) { prompt = `Using the following YouTube knowledge base:\n${YOUTUBE_SEO_KNOWLEDGE_BASE}\n\nYou previously generated the following JSON outline:\n\n${JSON.stringify(editableOutline, null, 2)}\n\nThe user has provided the following feedback to refine it: "${refinement}"\n\nPlease generate a NEW, updated JSON object that incorporates this feedback. The original footage inventory is still:\n${inventorySummary}\n\nYour response MUST be ONLY the updated JSON object, following this schema: ${schema}.`;
                } else { prompt = `Using the following YouTube knowledge base:\n${YOUTUBE_SEO_KNOWLEDGE_BASE}\n\nAct as a professional YouTube video producer. Create a project plan for a video series about "${inputs.location}". The overarching theme is: "${inputs.theme}". The user has this footage inventory:\n${inventorySummary}\nBased ONLY on this information, create an intelligent project outline. Your response MUST be a valid JSON object with NO other text before or after it, following this schema: ${schema}`; }
                try {
                    const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } };
                    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
                    const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                    if (!response.ok) { const err = await response.json(); throw new Error(err?.error?.message || 'API Error'); }
                    const result = await response.json();
                    const parsedJson = JSON.parse(result.candidates[0].content.parts[0].text);
                    setEditableOutline(parsedJson);
                    setRefinement("");
                    if(!isRefinement) setStep(3);
                } catch (e) { console.error("Error generating/refining outline:", e); setError(`Failed to process outline. ${e.message}`);
                } finally { setIsLoading(false); }
            };
            
            const handleCreateProject = async () => {
                 if (!editableOutline) return;
                setIsLoading(true);
                setError('');
                try {
                    const thumbnailUrl = `https://source.unsplash.com/600x400/?${encodeURIComponent(editableOutline.playlistTitle || 'travel')}`;
                    const batch = db.batch();
                    const projectRef = db.collection(`artifacts/${appId}/users/${userId}/projects`).doc();
                    batch.set(projectRef, {
                        playlistTitle: editableOutline.playlistTitle,
                        playlistDescription: editableOutline.playlistDescription,
                        thumbnailUrl: thumbnailUrl,
                        locations: locations.map(loc => ({ ...loc, footage: footageInventory[loc.place_id] || {} })),
                        createdAt: new Date().toISOString()
                    });
                    editableOutline.videos.forEach((video) => {
                        const videoRef = projectRef.collection('videos').doc();
                        batch.set(videoRef, { title: video.title, concept: video.concept, script: '', metadata: '', blogPost: '', shortsIdeas: '', createdAt: new Date().toISOString() });
                    });
                    await batch.commit();
                    const draftRef = db.collection(`artifacts/${appId}/users/${userId}/wizards`).doc('newProjectDraft');
                    await draftRef.delete();
                    onClose();
                } catch(e) { console.error("Error creating project:", e); setError(`Failed to save project. ${e.message}`);
                } finally { setIsLoading(false); }
            };

            const wizardStep = () => {
                switch(step) {
                    case 1:
                        return (<div><h2 className="text-2xl font-bold mb-4">New Project Wizard: Step 1 of 3</h2><p className="text-gray-400 mb-6">Define the project's foundation.</p><div className="space-y-4"><input type="text" name="location" value={inputs.location} onChange={(e) => setInputs(p => ({...p, location: e.target.value}))} placeholder="Overall Location (e.g., Scotland)" className="w-full form-input" />{googleMapsLoaded ? <LocationSearchInput onLocationsChange={handleLocationsUpdate} existingLocations={locations} /> : <MockLocationSearchInput onLocationsChange={handleLocationsUpdate} />}<textarea name="theme" value={inputs.theme} onChange={(e) => setInputs(p => ({...p, theme: e.target.value}))} placeholder="Key Message or Theme" rows="3" className="w-full form-textarea"></textarea></div><div className="flex justify-end gap-4 mt-6"><button onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg">Cancel</button><button onClick={() => setStep(2)} disabled={locations.length === 0} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:bg-gray-500 disabled:cursor-not-allowed">Next: Footage Inventory</button></div></div>);
                    case 2:
                        const isInventoryComplete = locations.every(loc => Object.values(footageInventory[loc.place_id] || {}).some(v => v === true));
                        return (<div><h2 className="text-2xl font-bold mb-4">New Project Wizard: Step 2 of 3</h2><p className="text-gray-400 mb-6">Log the footage you already have for each location.</p><div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2">{locations.map(loc => (<div key={loc.place_id} className="p-4 border border-gray-700 rounded-lg"><p className="font-semibold text-lg text-blue-300">{loc.name}</p><div className="flex flex-col gap-2 mt-2"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={footageInventory[loc.place_id]?.bRoll || false} onChange={() => handleFootageChange(loc.place_id, 'bRoll')} className="h-4 w-4 rounded bg-gray-800 border-gray-600 text-indigo-600 focus:ring-indigo-500"/>B-Roll</label><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={footageInventory[loc.place_id]?.onCamera || false} onChange={() => handleFootageChange(loc.place_id, 'onCamera')} className="h-4 w-4 rounded bg-gray-800 border-gray-600 text-indigo-600 focus:ring-indigo-500"/>On-Camera</label><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={footageInventory[loc.place_id]?.drone || false} onChange={() => handleFootageChange(loc.place_id, 'drone')} className="h-4 w-4 rounded bg-gray-800 border-gray-600 text-indigo-600 focus:ring-indigo-500"/>Drone</label></div></div>))}</div>{!isInventoryComplete && <p className="text-amber-400 mt-4 text-sm">Please select at least one footage type for each location.</p>}{error && <p className="text-red-400 mt-4">{error}</p>}<div className="flex justify-between gap-4 mt-6"><button onClick={() => setStep(1)} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg">Back</button><button onClick={() => handleGenerateOrRefineOutline(false)} disabled={isLoading || !isInventoryComplete} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-2 disabled:bg-gray-500">{isLoading ? <LoadingSpinner/> : '🪄 Next: Generate Outline'}</button></div></div>);
                    case 3:
                        return (<div><h2 className="text-2xl font-bold mb-4">New Project Wizard: Step 3 of 3</h2><p className="text-gray-400 mb-6">Review, edit, and refine the AI-generated outline.</p>{editableOutline ? (<div className="space-y-6 text-left p-4 border border-gray-600 rounded-lg max-h-[60vh] overflow-y-auto pr-2"><div><label className="block text-sm font-medium text-gray-300 mb-1">Playlist Title</label><input name="playlistTitle" value={editableOutline.playlistTitle || ''} onChange={(e) => handleOutlineChange(e, null, 'playlistTitle')} className="w-full editable-field editable-field-title"/><label className="block text-sm font-medium text-gray-300 mb-1 mt-2">Playlist Description</label><textarea name="playlistDescription" value={editableOutline.playlistDescription || ''} onChange={(e) => handleOutlineChange(e, null, 'playlistDescription')} rows="2" className="w-full editable-field editable-field-concept"/></div><div className="border-t border-gray-600 pt-4"><h4 className="font-semibold text-lg mb-2">Proposed Videos:</h4><div className="space-y-4">{editableOutline.videos.map((video, index) => (<div key={index}><label className="block text-sm font-medium text-gray-300 mb-1">Video {index+1} Title</label><input name="title" value={video.title} onChange={(e) => handleOutlineChange(e, index, 'title')} className="w-full editable-field font-semibold"/><label className="block text-sm font-medium text-gray-300 mb-1 mt-2">Video {index+1} Concept</label><textarea name="concept" value={video.concept} onChange={(e) => handleOutlineChange(e, index, 'concept')} rows="2" className="w-full editable-field text-sm"/></div>))}</div></div><div className="mt-4"><label className="block text-sm font-medium text-gray-300 mb-1">Refinement Instructions</label><textarea value={refinement} onChange={(e) => setRefinement(e.target.value)} rows="2" className="w-full form-textarea" placeholder="e.g., 'Make the titles more mysterious.' or 'Change video 2 to focus on food.'"/></div></div>) : <LoadingSpinner text="Generating initial outline..." />}{error && <p className="text-red-400 mt-4">{error}</p>}<div className="flex justify-between gap-4 mt-8"><button onClick={() => setStep(2)} disabled={isLoading} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg">Back</button><div className="flex gap-4"><button onClick={() => handleGenerateOrRefineOutline(true)} disabled={isLoading || !refinement} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg flex items-center gap-2 disabled:bg-gray-500">{isLoading ? <LoadingSpinner/> : '🔁 Refine Outline'}</button><button onClick={handleCreateProject} disabled={isLoading} className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg flex items-center gap-2">{isLoading ? <LoadingSpinner text="Finalizing..."/> : '✅ Finish & Create Project'}</button></div></div></div>);
                }
            }
            return (<div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4"><div className="glass-card rounded-lg p-8 w-full max-w-3xl">{wizardStep()}<button onClick={handleStartOver} className="text-xs text-gray-400 hover:text-red-400 mt-4">Start Over</button></div></div>);
        };

        const Dashboard = ({ userId, onSelectProject, onShowSettings, onShowMyStudio, onShowNewProjectWizard }) => {
            const [projects, setProjects] = useState([]);
            const [loading, setLoading] = useState(true);
            const projectCardsRef = useRef(null);
            useEffect(() => {
                if (!userId) return;
                const projectsCollectionRef = db.collection(`artifacts/${appId}/users/${userId}/projects`);
                const unsubscribe = projectsCollectionRef.onSnapshot(querySnapshot => {
                    const projectsData = [];
                    querySnapshot.forEach((doc) => { projectsData.push({ id: doc.id, ...doc.data() }); });
                    setProjects(projectsData);
                    setLoading(false);
                }, (error) => { console.error("Error fetching projects:", error); setLoading(false); });
                return () => unsubscribe();
            }, [userId]);
            useEffect(() => {
                if (!loading && projects.length > 0 && projectCardsRef.current) {
                    gsap.fromTo(projectCardsRef.current.children, { opacity: 0, y: 30 }, { opacity: 1, y: 0, stagger: 0.1, duration: 0.5, ease: 'power3.out' });
                }
            }, [loading, projects]);
            return (<div className="p-8"><header className="flex justify-between items-center mb-8"><h1 className="text-4xl font-bold">Creator's Hub</h1><div className="flex gap-4"><button onClick={onShowMyStudio} className="flex items-center gap-2 glass-card px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">🎨 My Studio</button><button onClick={onShowSettings} className="flex items-center gap-2 glass-card px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">⚙️ Settings</button></div></header>{loading ? <LoadingSpinner /> : (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" ref={projectCardsRef}><button onClick={onShowNewProjectWizard} className="glass-card rounded-lg h-64 flex flex-col justify-center items-center text-gray-400 hover:text-white hover:border-blue-500 border-2 border-dashed border-gray-600 transition-all"><span className="text-5xl">✨</span><span className="text-xl font-semibold mt-2">New AI Project</span></button>{projects.map(project => (<div key={project.id} onClick={() => onSelectProject(project)} className="glass-card rounded-lg flex flex-col justify-between cursor-pointer hover:shadow-2xl hover:shadow-blue-500/20 hover:-translate-y-1 transition-all overflow-hidden"><ImageComponent src={project.thumbnailUrl} alt={project.playlistTitle || project.title} className="w-full h-32 object-cover" /><div className="p-4"><div><h3 className="text-xl font-bold text-blue-300 truncate">{project.playlistTitle || project.title}</h3><p className="text-gray-400 italic mt-1 text-sm h-10 overflow-hidden">"{project.playlistDescription || ''}"</p></div><div className="text-xs text-gray-500 mt-2">Created: {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'N/A'}</div></div></div>))}</div>)}</div>);
        };
        
        function App() {
            const [user, setUser] = useState(null);
            const [isAuthReady, setIsAuthReady] = useState(false);
            const [currentView, setCurrentView] = useState('dashboard');
            const [selectedProject, setSelectedProject] = useState(null);
            const [settings, setSettings] = useState({ geminiApiKey: '', googleMapsApiKey: '', styleGuideText: '' });
            const [projectDraft, setProjectDraft] = useState(null);
            const [showNotification, setShowNotification] = useState(false);
            const [notificationMessage, setNotificationMessage] = useState('');
            const [showNewProjectWizard, setShowNewProjectWizard] = useState(false);
            const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
            const handleLogin = useCallback(async () => { try { if (initialAuthToken) { await auth.signInWithCustomToken(initialAuthToken); } else { await auth.signInAnonymously(); } } catch (error) { console.error("Authentication failed:", error); displayNotification(`Authentication Error: ${error.message}`); } }, []);
            useEffect(() => {
                const unsubscribeAuth = auth.onAuthStateChanged(user => {
                    if (user) {
                        setUser(user);
                        const settingsDocRef = db.collection(`artifacts/${appId}/users/${user.uid}/settings`).doc('styleGuide');
                        const unsubscribeSettings = settingsDocRef.onSnapshot(docSnap => {
                            const defaultSettings = { geminiApiKey: '', googleMapsApiKey: '', styleGuideText: '', myWriting: '', admiredWriting: '', keywords: '', dosAndDonts: '', excludedPhrases: '' };
                            const data = docSnap.exists ? docSnap.data() : {};
                            const newSettings = { ...defaultSettings, ...data };
                            setSettings(newSettings);
                            if (newSettings.googleMapsApiKey && !googleMapsLoaded) { loadGoogleMapsScript(newSettings.googleMapsApiKey, () => { setGoogleMapsLoaded(true); }); }
                        });

                        const draftRef = db.collection(`artifacts/${appId}/users/${user.uid}/wizards`).doc('newProjectDraft');
                        const unsubscribeDraft = draftRef.onSnapshot(docSnap => {
                            setProjectDraft(docSnap.exists ? docSnap.data() : null);
                        });
                        
                        return () => { unsubscribeSettings(); unsubscribeDraft(); };
                    } else { setUser(null); setSettings({ geminiApiKey: '', googleMapsApiKey: '', styleGuideText: '' }); setProjectDraft(null); }
                    setIsAuthReady(true);
                });
                return () => { unsubscribeAuth(); };
            }, [googleMapsLoaded]);
            const displayNotification = (message) => { setNotificationMessage(message); setShowNotification(true); setTimeout(() => setShowNotification(false), 3000); };
            const handleSelectProject = async (project) => { const projectRef = db.collection(`artifacts/${appId}/users/${user.uid}/projects`).doc(project.id); const docSnap = await projectRef.get(); if (docSnap.exists) { setSelectedProject({ id: docSnap.id, ...docSnap.data() }); setCurrentView('project'); } else { displayNotification("Error: Could not find project data."); } };
            const handleBackToDashboard = () => { setSelectedProject(null); setCurrentView('dashboard'); };
            const handleShowSettings = () => setCurrentView('settings');
            const handleShowMyStudio = () => setCurrentView('myStudio');
            const handleSaveSettings = async (newSettings) => {
                if (!user) return;
                const settingsDocRef = db.collection(`artifacts/${appId}/users/${user.uid}/settings`).doc('styleGuide');
                try {
                    await settingsDocRef.set(newSettings, { merge: true });
                    displayNotification('Settings saved successfully!');
                    if (newSettings.googleMapsApiKey && !googleMapsLoaded) { loadGoogleMapsScript(newSettings.googleMapsApiKey, () => { setGoogleMapsLoaded(true); }); }
                    setCurrentView('dashboard');
                } catch (error) { console.error("Error saving settings:", error); displayNotification(`Error: ${error.message}`); }
            };
            const renderView = () => {
                switch (currentView) {
                    case 'project': return <ProjectView project={selectedProject} userId={user.uid} onBack={handleBackToDashboard} settings={settings} />;
                    case 'settings': return <SettingsView settings={settings} onSave={handleSaveSettings} onBack={handleBackToDashboard} />;
                    case 'myStudio': return <MyStudioView settings={settings} onSave={handleSaveSettings} onBack={handleBackToDashboard} />;
                    default: return <Dashboard userId={user.uid} onSelectProject={handleSelectProject} onShowSettings={handleShowSettings} onShowMyStudio={handleShowMyStudio} onShowNewProjectWizard={() => setShowNewProjectWizard(true)} />;
                }
            }
            return (<div className="min-h-screen bg-gray-900">{showNotification && (<div className="fixed top-5 right-5 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">{notificationMessage}</div>)}{showNewProjectWizard && <NewProjectWizard userId={user.uid} settings={settings} onClose={() => setShowNewProjectWizard(false)} googleMapsLoaded={googleMapsLoaded} initialDraft={projectDraft}/>}<main>{!isAuthReady ? <div className="min-h-screen flex justify-center items-center"><LoadingSpinner /></div> : !user ? <LoginScreen onLogin={handleLogin} /> : renderView()}</main></div>);
        }
        
        const MyStudioView = ({ settings, onSave, onBack }) => {
            const [styleInputs, setStyleInputs] = useState({ 
                myWriting: settings.myWriting || '', 
                admiredWriting: settings.admiredWriting || '', 
                keywords: settings.keywords || '',
                dosAndDonts: settings.dosAndDonts || '',
                excludedPhrases: settings.excludedPhrases || ''
            });
            const [styleGuideText, setStyleGuideText] = useState(settings.styleGuideText || '');
            const [isLoading, setIsLoading] = useState(false);
            
            useEffect(() => {
                setStyleGuideText(settings.styleGuideText || '');
                setStyleInputs({
                    myWriting: settings.myWriting || '',
                    admiredWriting: settings.admiredWriting || '',
                    keywords: settings.keywords || '',
                    dosAndDonts: settings.dosAndDonts || '',
                    excludedPhrases: settings.excludedPhrases || ''
                })
            }, [settings]);

            const handleAnalyzeStyle = async () => {
                const apiKey = settings.geminiApiKey || "";
                if (!apiKey) { alert("Please set your Gemini API Key in Settings first."); return; }
                setIsLoading(true);
                const prompt = `Analyze the following inputs to define a detailed YouTube creator's style guide.
                1.  **My Writing Sample:** "${styleInputs.myWriting}"
                2.  **Admired Writing Sample:** "${styleInputs.admiredWriting}"
                3.  **Descriptive Keywords:** "${styleInputs.keywords}"
                4.  **Specific Dos and Don'ts:** "${styleInputs.dosAndDonts}"
                5.  **Excluded Phrases:** "${styleInputs.excludedPhrases}"

                Synthesize these inputs into a structured style guide covering: Tone, Pacing, Vocabulary, Sentence Structure, and Humor. Also include the explicit Dos/Don'ts and Excluded Phrases. Provide a detailed, actionable description for each category.`;
                try {
                    const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }]};
                    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
                    const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                    if (!response.ok) { const err = await response.json(); throw new Error(err?.error?.message || 'API Error'); }
                    const result = await response.json();
                    const generatedGuide = result.candidates[0].content.parts[0].text;
                    setStyleGuideText(generatedGuide);
                } catch(e) { console.error(e); alert("Error analyzing style: " + e.message);
                } finally { setIsLoading(false); }
            };
            
            const handleSave = () => {
                onSave({ ...settings, ...styleInputs, styleGuideText: styleGuideText });
            };

            return (
                <div className="p-8">
                    <button onClick={onBack} className="flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-6">⬅️ Back to Dashboard</button>
                    <h1 className="text-4xl font-bold mb-4">🎨 My Studio</h1>
                    <p className="text-gray-400 mb-8">Train the AI on your unique creative style. The more detail you provide, the better the AI's suggestions will be.</p>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div>
                             <h2 className="text-2xl font-semibold mb-4">Style Inputs</h2>
                             <div className="space-y-4">
                                <div><label className="block text-sm font-medium text-gray-300 mb-2">An example of your writing</label><textarea value={styleInputs.myWriting} onChange={(e) => setStyleInputs(p => ({...p, myWriting: e.target.value}))} rows="6" className="form-textarea" placeholder="Paste a sample of a previous script or blog post here..."></textarea></div>
                                <div><label className="block text-sm font-medium text-gray-300 mb-2">Writing you admire</label><textarea value={styleInputs.admiredWriting} onChange={(e) => setStyleInputs(p => ({...p, admiredWriting: e.target.value}))} rows="6" className="form-textarea" placeholder="Paste a sample from another creator or writer whose style you like..."></textarea></div>
                                <div><label className="block text-sm font-medium text-gray-300 mb-2">Keywords describing your style</label><input type="text" value={styleInputs.keywords} onChange={(e) => setStyleInputs(p => ({...p, keywords: e.target.value}))} className="form-input" placeholder="e.g., witty, cinematic, fast-paced, educational"/></div>
                                <div><label className="block text-sm font-medium text-gray-300 mb-2">Style Dos and Don'ts</label><textarea value={styleInputs.dosAndDonts} onChange={(e) => setStyleInputs(p => ({...p, dosAndDonts: e.target.value}))} rows="3" className="form-textarea" placeholder="e.g., DO use humor. DON'T be too formal."></textarea></div>
                                <div><label className="block text-sm font-medium text-gray-300 mb-2">Excluded Phrases & Words</label><textarea value={styleInputs.excludedPhrases} onChange={(e) => setStyleInputs(p => ({...p, excludedPhrases: e.target.value}))} rows="3" className="form-textarea" placeholder="e.g., synergy, circle back, at the end of the day"></textarea></div>
                                <button onClick={handleAnalyzeStyle} disabled={isLoading} className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold flex items-center justify-center gap-2 disabled:bg-gray-500">{isLoading ? <LoadingSpinner/> : '🧬 Analyze & Create Style Guide'}</button>
                             </div>
                        </div>
                         <div>
                             <h2 className="text-2xl font-semibold mb-4">Your AI-Powered Style Guide</h2>
                             <textarea value={styleGuideText} onChange={(e) => setStyleGuideText(e.target.value)} rows="32" className="form-textarea leading-relaxed" placeholder="Your generated style guide will appear here. You can edit it directly."></textarea>
                         </div>
                    </div>
                    <div className="mt-8 text-right">
                        <button onClick={handleSave} className="px-8 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors">Save My Style</button>
                    </div>
                </div>
            );
        };
        const container = document.getElementById('root');
        const root = ReactDOM.createRoot(container);
        root.render(<App />);
    </script>
</body>
</html>
