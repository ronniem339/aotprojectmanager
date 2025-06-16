// js/components/ProjectView/tasks/DescriptionTask.js

window.DescriptionTask = ({ video, settings, onUpdateTask, isLocked }) => {
    const { useState, useEffect, useMemo } = React;
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState('');
    const [editableDescription, setEditableDescription] = useState('');
    const [descriptionRefinement, setDescriptionRefinement] = useState('');

    const metadata = useMemo(() => {
        try {
            return video.metadata ? JSON.parse(video.metadata) : null;
        } catch { return null; }
    }, [video.metadata]);
    
    useEffect(() => {
        setEditableDescription(metadata?.description || '');
        setError('');
        setDescriptionRefinement('');
    }, [video.id, metadata]);

    const handleGenerateDescription = async () => {
        setGenerating(true);
        setError('');
        // **FIX**: Removed 'tags' from the prompt. It now only generates description and chapters.
        const prompt = `Act as a YouTube SEO expert. Based on the video script and title, generate a metadata package.
Video Script:
---
${video.script}
---
Video Title: "${video.chosenTitle}"
YouTube Video Description Guidelines: "${settings.knowledgeBases?.youtube?.videoDescriptions || 'Write a compelling and SEO-friendly description.'}"

Your response MUST be a valid JSON object with these exact keys: "description" (a detailed description with a {{CHAPTERS}} placeholder for later) and "chapters" (array of objects: {"timestamp": "0:00", "title": "..."}).`;
        
        try {
            const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings.geminiApiKey);
            await onUpdateTask('descriptionGenerated', 'pending', { 
                metadata: JSON.stringify(parsedJson),
                chapters: parsedJson.chapters,
            });
        } catch (err) {
            setError(`Failed to generate description: ${err.message}`);
        } finally {
            setGenerating(false);
        }
    };
    
    const handleRefineDescription = async () => {
        setGenerating(true);
        setError('');
        const prompt = `Rewrite the following YouTube video description based on the user's feedback, adhering to the provided guidelines.
Original Description:\n---\n${editableDescription}\n---\n
User Feedback: "${descriptionRefinement}"
YouTube Video Description Guidelines: "${settings.knowledgeBases?.youtube?.videoDescriptions || 'Write a compelling and SEO-friendly description.'}"
Return a JSON object with one key: {"newDescription": "..."}`;
        try {
            const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings.geminiApiKey);
            if (parsedJson?.newDescription) {
                setEditableDescription(parsedJson.newDescription);
                setDescriptionRefinement('');
            }
        } catch (err) {
            setError(`Failed to refine description: ${err.message}`);
        } finally {
            setGenerating(false);
        }
    };

    const handleAcceptDescription = () => {
        const newMetadata = { ...(metadata || {}), description: editableDescription };
        onUpdateTask('descriptionGenerated', 'complete', { 
            metadata: JSON.stringify(newMetadata) 
        });
    };

    if (isLocked) {
        return <p className="text-gray-400 text-center py-2 text-sm">Please finalize the title first.</p>;
    }
    
    if (video.tasks?.descriptionGenerated === 'complete') {
        return <p className="text-gray-400 text-center py-2 text-sm">Description has been finalized.</p>;
    }

    if (!metadata || !metadata.description) {
        return (
            <div className="text-center py-4">
                <button onClick={handleGenerateDescription} disabled={generating} className="w-full max-w-xs mx-auto px-5 py-2.5 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold disabled:opacity-75">
                    {generating ? <window.LoadingSpinner isButton={true} /> : '✨ Generate Description'}
                </button>
                {error && <p className="text-red-400 mt-4 text-sm bg-red-900/50 p-3 rounded-lg">{error}</p>}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <textarea value={editableDescription} onChange={(e) => setEditableDescription(e.target.value)} rows="10" className="w-full form-textarea bg-gray-800/50 resize-y"/>
            <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                <label className="block text-sm font-medium text-gray-300 mb-1">Refinement Instructions</label>
                <textarea value={descriptionRefinement} onChange={(e) => setDescriptionRefinement(e.target.value)} rows="2" className="w-full form-textarea" placeholder="e.g., 'Make it more personal'"/>
                <div className="flex justify-between items-center mt-2">
                    <button onClick={handleRefineDescription} disabled={generating || !descriptionRefinement} className="px-4 py-2 text-sm bg-secondary-accent hover:bg-secondary-accent-darker rounded-lg font-semibold disabled:opacity-75">
                        {generating ? <window.LoadingSpinner isButton={true} /> : 'Refine Description'}
                    </button>
                     <button onClick={handleAcceptDescription} className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 rounded-lg font-semibold">Accept Description</button>
                </div>
            </div>
            {error && <p className="text-red-400 mt-2 text-sm text-right">{error}</p>}
        </div>
    );
};
