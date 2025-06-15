// js/components/ProjectView/tasks/MetadataTask.js

window.MetadataTask = ({ video, settings, onUpdateTask, onGenerate, isLocked }) => {
    const { useState, useEffect, useMemo } = React;

    // Local state to manage the multi-step metadata process
    const [generating, setGenerating] = useState(null);
    const [editableDescription, setEditableDescription] = useState('');
    const [descriptionRefinement, setDescriptionRefinement] = useState('');
    const [chapters, setChapters] = useState([]);
    const [rejectedTitles, setRejectedTitles] = useState([]);

    const metadata = useMemo(() => {
        try {
            return video.metadata ? JSON.parse(video.metadata) : null;
        } catch {
            return null;
        }
    }, [video.metadata]);
    
    // Effect to reset local state when the video or its metadata changes
    useEffect(() => {
        if (metadata) {
            setEditableDescription(metadata.description || '');
            const metaChapters = metadata.chapters || [];
            // Prioritize chapters already saved on the video object, fallback to metadata
            setChapters(video.chapters && video.chapters.length > 0 ? video.chapters : metaChapters);
        }
        setRejectedTitles(video.tasks?.rejectedTitles || []);
    }, [video.id, metadata, video.chapters, video.tasks]);


    const handleGenerateMetadata = async () => {
        setGenerating('metadata');
        try {
            const prompt = `Act as a YouTube SEO expert. Based on the video script provided below, generate an optimized metadata package.
Video Script:
---
${video.script}
---
YouTube SEO Knowledge Base: ${settings.knowledgeBases?.youtube?.youtubeSeoKnowledgeBase || ''}
YouTube Video Title Guidelines: ${settings.knowledgeBases?.youtube?.videoTitles || ''}
YouTube Video Description Guidelines: ${settings.knowledgeBases?.youtube?.videoDescriptions || ''}
AVOID these previously rejected titles: ${(video.tasks?.rejectedTitles || []).join(', ')}

Your response MUST be a valid JSON object with these exact keys: "titleSuggestions" (array of 3 distinct, catchy titles), "description" (a detailed description with a {{CHAPTERS}} placeholder), "tags" (string of comma-separated tags), "chapters" (array of objects: {"timestamp": "0:00", "title": "..."}), and "thumbnailConcepts" (array of 3-5 structured objects).`;
            
            const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings.geminiApiKey);
            // Update the video with all generated metadata at once
            onUpdateTask('metadataGenerated', 'pending', { 
                metadata: JSON.stringify(parsedJson), 
                chapters: parsedJson.chapters, 
                'tasks.thumbnailConcepts': parsedJson.thumbnailConcepts,
                'tasks.currentConceptIndex': 0,
                'tasks.descriptionAccepted': false,
                'tasks.chaptersFinalized': false 
            });

        } catch (error) {
            console.error("Error generating metadata:", error);
        } finally {
            setGenerating(null);
        }
    };
    
    const handleAcceptTitle = (titleToAccept) => {
        const otherTitles = metadata.titleSuggestions.filter(t => t !== titleToAccept);
        const newRejected = [...(video.tasks?.rejectedTitles || []), ...otherTitles];
        onUpdateTask('metadataGenerated', 'pending', {
            chosenTitle: titleToAccept,
            'tasks.rejectedTitles': newRejected
        });
    };

    const handleRefineDescription = async () => {
        setGenerating('description');
        const prompt = `Rewrite the following YouTube video description based on the user's feedback.
Original Description:\n---\n${editableDescription}\n---\n
User Feedback: "${descriptionRefinement}"
Return a JSON object with one key: {"newDescription": "..."}`;

        try {
            const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings.geminiApiKey);
            if (parsedJson && parsedJson.newDescription) {
                setEditableDescription(parsedJson.newDescription);
                setDescriptionRefinement('');
                // We don't save to Firestore here, user must click "Accept Description"
            }
        } catch (error) {
            console.error("Error refining description:", error);
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
        
        // Final update that completes the task
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
                    {generating ? <window.LoadingSpinner isButton={true} /> : '✨ Generate Metadata'}
                </button>
                {isLocked && <p className="text-xs text-amber-400 mt-2">Please complete previous steps first.</p>}
            </div>
        );
    }
    
    // Sub-step 1: Title selection
    if (!video.chosenTitle) {
        return (
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
                {/* We can add a "Generate More Titles" button here if needed */}
            </div>
        );
    }

    // Sub-step 2: Description refinement
    if (!video.tasks?.descriptionAccepted) {
        return (
            <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                <label className="block text-sm font-semibold text-gray-300 mb-2">Step 2: Review & Refine Description</label>
                <textarea value={editableDescription} onChange={(e) => setEditableDescription(e.target.value)} rows="10" className="w-full form-textarea bg-gray-800/50 resize-y"/>
                <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-300 mb-1">Refinement Instructions</label>
                    <textarea value={descriptionRefinement} onChange={(e) => setDescriptionRefinement(e.target.value)} rows="2" className="w-full form-textarea" placeholder="e.g., 'Make it more personal', 'Add more about hiking trails'"/>
                    <div className="flex gap-4 mt-2">
                        <button onClick={handleRefineDescription} disabled={generating || !descriptionRefinement} className="px-4 py-2 text-sm bg-secondary-accent hover:bg-secondary-accent-darker rounded-lg font-semibold disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center">
                            {generating ? <window.LoadingSpinner isButton={true} /> : 'Refine Description'}
                        </button>
                        <button onClick={handleAcceptDescription} className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 rounded-lg font-semibold">Accept Description</button>
                    </div>
                </div>
            </div>
        );
    }

    // Sub-step 3: Chapter finalization
    if (!video.tasks?.chaptersFinalized) {
        return (
            <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                <label className="block text-sm font-semibold text-gray-300 mb-2">Step 3: Add Chapter Timestamps</label>
                <div className="space-y-2">
                    {chapters.map((chap, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <input type="text" value={chap.timestamp} onChange={(e) => handleChapterChange(i, 'timestamp', e.target.value)} className="form-input w-24" placeholder={parseInt(video.estimatedLengthMinutes) >= 10 ? '00:00' : '0:00'}/> 
                            <input type="text" value={chap.title} onChange={(e) => handleChapterChange(i, 'title', e.target.value)} className="form-input flex-grow" />
                        </div>
                    ))}
                </div>
                <button onClick={applyTimestampsAndComplete} className="mt-3 px-4 py-2 text-sm bg-green-600 hover:bg-green-700 rounded-lg">Apply Timestamps & Finalize</button>
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
