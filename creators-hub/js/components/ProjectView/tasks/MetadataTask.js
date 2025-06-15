// js/components/ProjectView/tasks/MetadataTask.js

window.MetadataTask = ({ video, settings, onUpdateTask, isLocked }) => {
    const { useState, useEffect, useMemo } = React;

    // Local state for the multi-step metadata process
    const [generating, setGenerating] = useState(null);
    const [error, setError] = useState('');
    
    // State for title management
    const [editableTitle, setEditableTitle] = useState('');
    const [titleRefinement, setTitleRefinement] = useState('');
    const [titleSuggestions, setTitleSuggestions] = useState([]);

    // State for description management
    const [editableDescription, setEditableDescription] = useState('');
    const [descriptionRefinement, setDescriptionRefinement] = useState('');
    
    // State for chapters
    const [chapters, setChapters] = useState([]);

    const metadata = useMemo(() => {
        try {
            return video.metadata ? JSON.parse(video.metadata) : null;
        } catch {
            return null;
        }
    }, [video.metadata]);
    
    // Effect to reset local state when the video or its metadata changes
    useEffect(() => {
        setError('');
        setTitleRefinement('');
        setDescriptionRefinement('');
        setEditableTitle(video.chosenTitle || video.title || '');
        setTitleSuggestions([]);

        if (metadata) {
            setEditableDescription(metadata.description || '');
            const metaChapters = metadata.chapters || [];
            setChapters(video.chapters && video.chapters.length > 0 ? video.chapters : metaChapters);
        }
    }, [video.id, video.chosenTitle, metadata, video.chapters]);

    const handleGenerateMetadata = async () => {
        setGenerating('metadata');
        setError('');
        const prompt = `Act as a YouTube SEO expert. Based on the video script and existing title, generate an optimized metadata package.
Video Script:
---
${video.script}
---
Existing Video Title: "${video.chosenTitle || video.title}"

Your response MUST be a valid JSON object with these exact keys: "description" (a detailed description with a {{CHAPTERS}} placeholder), "tags" (string of comma-separated tags), and "chapters" (array of objects: {"timestamp": "0:00", "title": "..."}). Do NOT suggest new titles.`;
        
        try {
            const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings.geminiApiKey);
            await onUpdateTask('metadataGenerated', 'pending', { 
                metadata: JSON.stringify(parsedJson), 
                chapters: parsedJson.chapters, 
                'tasks.titleConfirmed': false,
                'tasks.descriptionAccepted': false,
                'tasks.chaptersFinalized': false 
            });
        } catch (err) {
            console.error("Error generating metadata:", err);
            setError(`Failed to generate metadata: ${err.message}`);
        } finally {
            setGenerating(null);
        }
    };

    const handleGenerateTitleSuggestions = async () => {
        setGenerating('titles');
        setError('');
        const prompt = `Act as a YouTube title expert. Based on the script, generate 3 new, distinct title suggestions. Avoid titles similar to "${editableTitle}".
Script:
---
${video.script}
---
Return a JSON object: {"suggestions": ["title1", "title2", "title3"]}`;
        try {
            const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings.geminiApiKey);
            setTitleSuggestions(parsedJson.suggestions || []);
        } catch (err) {
            setError(`Failed to generate titles: ${err.message}`);
        } finally {
            setGenerating(null);
        }
    };
    
    const handleRefineTitle = async () => {
        setGenerating('titles');
        setError('');
        const prompt = `Rewrite the following YouTube title based on the user's feedback.
Original Title: "${editableTitle}"
User Feedback: "${titleRefinement}"
Return a JSON object: {"newTitle": "..."}`;
        try {
            const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings.geminiApiKey);
            if (parsedJson.newTitle) {
                setEditableTitle(parsedJson.newTitle);
                setTitleRefinement('');
            }
        } catch (err) {
            setError(`Failed to refine title: ${err.message}`);
        } finally {
            setGenerating(null);
        }
    };

    const handleConfirmTitle = () => {
        onUpdateTask('metadataGenerated', 'pending', { 
            'chosenTitle': editableTitle,
            'tasks.titleConfirmed': true
        });
    };
    
    const handleRefineDescription = async () => {
        setGenerating('description');
        setError('');
        const prompt = `Rewrite the following YouTube video description based on the user's feedback.
Original Description:\n---\n${editableDescription}\n---\n
User Feedback: "${descriptionRefinement}"
Return a JSON object with one key: {"newDescription": "..."}`;
        try {
            const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings.geminiApiKey);
            if (parsedJson && parsedJson.newDescription) {
                setEditableDescription(parsedJson.newDescription);
                setDescriptionRefinement('');
            }
        } catch (err) {
            console.error("Error refining description:", err);
            setError(`Failed to refine description: ${err.message}`);
        } finally {
            setGenerating(null);
        }
    };
    
    const handleAcceptDescription = () => {
        const newMetadata = { ...metadata, description: editableDescription };
        onUpdateTask('metadataGenerated', 'pending', { 
            'tasks.descriptionAccepted': true,
            metadata: JSON.stringify(newMetadata) 
        });
    };

    const handleChapterChange = (index, field, value) => {
        const newChapters = [...chapters];
        newChapters[index][field] = value;
        setChapters(newChapters);
    };

    const applyTimestampsAndComplete = () => {
        const chapterText = chapters.map(c => `${c.timestamp} - ${c.title}`).join('\n');
        const finalDescription = (metadata.description || '').replace('{{CHAPTERS}}', chapterText);
        const finalMetadata = { ...metadata, description: finalDescription, chapters: chapters };
        
        onUpdateTask('metadataGenerated', 'complete', { 
            metadata: JSON.stringify(finalMetadata), 
            chapters: chapters, 
            'tasks.chaptersFinalized': true 
        });
    };

    // Render logic based on the sub-steps of metadata generation
    if (!metadata) {
        return (
            <div className="text-center py-4">
                <button onClick={handleGenerateMetadata} disabled={isLocked || generating} className="w-full max-w-xs mx-auto px-5 py-2.5 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {generating ? <window.LoadingSpinner isButton={true} /> : '✨ Generate Metadata Package'}
                </button>
                {isLocked && <p className="text-xs text-amber-400 mt-2">Please complete previous steps first.</p>}
                {error && <p className="text-red-400 mt-4 text-sm bg-red-900/50 p-3 rounded-lg">{error}</p>}
            </div>
        );
    }
    
    // Sub-step 1: Title Confirmation/Refinement
    if (!video.tasks?.titleConfirmed) {
        return (
             <div className="space-y-4">
                <h3 className="text-lg font-semibold text-amber-400">Step 1: Review Video Title</h3>
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Current Title</label>
                    <input type="text" value={editableTitle} onChange={(e) => setEditableTitle(e.target.value)} className="w-full form-input" />
                </div>

                <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700 space-y-2">
                    <label className="block text-sm font-medium text-gray-300">Refine or Replace Title</label>
                     <textarea value={titleRefinement} onChange={(e) => setTitleRefinement(e.target.value)} rows="2" className="w-full form-textarea" placeholder="e.g., 'Make it catchier' or 'Focus on the history aspect'"/>
                    <div className="flex gap-2">
                        <button onClick={handleRefineTitle} disabled={generating || !titleRefinement} className="px-3 py-1 text-xs bg-secondary-accent hover:bg-secondary-accent-darker rounded-md font-semibold disabled:opacity-50">Refine Current</button>
                        <button onClick={handleGenerateTitleSuggestions} disabled={generating} className="px-3 py-1 text-xs bg-secondary-accent hover:bg-secondary-accent-darker rounded-md font-semibold disabled:opacity-50">Get New Suggestions</button>
                    </div>
                </div>

                {titleSuggestions.length > 0 && (
                    <div className="space-y-2">
                        {titleSuggestions.map((title, i) => (
                             <div key={i} onClick={() => setEditableTitle(title)} className="p-2 bg-gray-800/60 rounded-md cursor-pointer hover:bg-gray-700/60 text-center">
                                <p className="text-white">{title}</p>
                            </div>
                        ))}
                    </div>
                )}
                
                <div className="pt-4 border-t border-gray-700 text-right">
                     <button onClick={handleConfirmTitle} className="px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg font-semibold">
                        Confirm Title & Continue
                    </button>
                </div>
                 {error && <p className="text-red-400 mt-2 text-sm text-right">{error}</p>}
            </div>
        );
    }

    // Sub-step 2: Description refinement
    if (!video.tasks?.descriptionAccepted) {
        return (
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-amber-400">Step 2: Review & Refine Description</h3>
                <textarea value={editableDescription} onChange={(e) => setEditableDescription(e.target.value)} rows="10" className="w-full form-textarea bg-gray-800/50 resize-y"/>
                <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                    <label className="block text-sm font-medium text-gray-300 mb-1">Refinement Instructions</label>
                    <textarea value={descriptionRefinement} onChange={(e) => setDescriptionRefinement(e.target.value)} rows="2" className="w-full form-textarea" placeholder="e.g., 'Make it more personal'"/>
                    <div className="flex justify-between items-center mt-2">
                        <button onClick={handleRefineDescription} disabled={generating || !descriptionRefinement} className="px-4 py-2 text-sm bg-secondary-accent hover:bg-secondary-accent-darker rounded-lg font-semibold disabled:opacity-75">
                            {generating ? <window.LoadingSpinner isButton={true} /> : 'Refine Description'}
                        </button>
                         <button onClick={handleAcceptDescription} className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 rounded-lg font-semibold">Accept & Continue</button>
                    </div>
                </div>
                {error && <p className="text-red-400 mt-2 text-sm text-right">{error}</p>}
            </div>
        );
    }

    // Sub-step 3: Chapter finalization
    if (!video.tasks?.chaptersFinalized) {
        return (
            <div className="space-y-4">
                 <h3 className="text-lg font-semibold text-amber-400">Step 3: Add Chapter Timestamps</h3>
                 <div className="space-y-2">
                    {chapters.map((chap, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <input type="text" value={chap.timestamp} onChange={(e) => handleChapterChange(i, 'timestamp', e.target.value)} className="form-input w-24" placeholder="0:00"/> 
                            <input type="text" value={chap.title} onChange={(e) => handleChapterChange(i, 'title', e.target.value)} className="form-input flex-grow" />
                        </div>
                    ))}
                </div>
                <div className="pt-4 border-t border-gray-700 text-right">
                    <button onClick={applyTimestampsAndComplete} className="px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg">Apply Timestamps & Finalize</button>
                </div>
            </div>
        );
    }

    // Final state: Show the completed metadata
    return (
        <div className="bg-gray-900/50 p-4 rounded-lg border border-green-500">
            <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-semibold text-gray-300">Final Description</label>
                <window.CopyButton textToCopy={metadata.description} />
            </div>
            <textarea readOnly value={metadata.description} rows="10" className="w-full form-textarea bg-gray-800/50 resize-y"/>
        </div>
    );
};
