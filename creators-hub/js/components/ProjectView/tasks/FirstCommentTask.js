// js/components/ProjectView/tasks/FirstCommentTask.js

window.FirstCommentTask = ({ video, settings, onUpdateTask, isLocked }) => {
    const { useState, useEffect } = React;
    const [comment, setComment] = useState('');
    const [generating, setGenerating] = useState(false);
    
    const taskStatus = video.tasks?.firstCommentGenerated || 'pending';
    const savedComment = video.tasks?.firstComment || '';
    
    useEffect(() => {
        setComment(savedComment);
    }, [savedComment]);

    const handleGenerate = async () => {
        setGenerating(true);
        const firstCommentKb = settings.knowledgeBases?.youtube?.firstPinnedCommentExpert || '';
        
        const prompt = `Act as a YouTube creator writing the first pinned comment for your video. The goal is to spark conversation.
Video Title: "${video.chosenTitle}"
Video Description: "${video.concept}"
My Persona: "${settings.knowledgeBases?.youtube?.whoAmI || ''}"
First Comment Guidelines: "${firstCommentKb}"

Write a compelling first comment. Return as a JSON object: {"comment": "your comment here..."}`;

        try {
            const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings.geminiApiKey);
            if (parsedJson && parsedJson.comment) {
                setComment(parsedJson.comment);
            }
        } catch (error) {
            console.error("Error generating first comment:", error);
        } finally {
            setGenerating(false);
        }
    };
    
    const handleSave = () => {
        onUpdateTask('firstCommentGenerated', 'complete', { 'tasks.firstComment': comment });
    };

    if (taskStatus === 'complete') {
        return (
             <div>
                <textarea readOnly value={comment} rows="4" className="w-full form-textarea bg-gray-800/50"/>
                <div className="flex justify-end gap-2 mt-2">
                    <window.CopyButton textToCopy={comment} />
                    <p className="text-gray-400 text-sm">Comment is saved.</p>
                </div>
            </div>
        );
    }
    
    return (
        <div>
            <textarea 
                value={comment} 
                onChange={(e) => setComment(e.target.value)}
                rows="4"
                className="w-full form-textarea"
                placeholder="The AI-generated comment will appear here..."
                disabled={isLocked}
            />
            <div className="flex flex-col sm:flex-row gap-4 mt-4">
                <button onClick={handleGenerate} disabled={generating || isLocked} className="w-full px-5 py-2.5 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {generating ? <window.LoadingSpinner isButton={true} /> : '💬 Generate Comment'}
                </button>
                 <button onClick={handleSave} disabled={!comment || isLocked} className="w-full px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg font-semibold disabled:opacity-75 disabled:cursor-not-allowed">
                    Save Comment
                </button>
            </div>
        </div>
    );
};
