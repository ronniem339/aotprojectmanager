// js/components/ProjectView/tasks/FirstCommentTask.js

window.FirstCommentTask = ({ video, onUpdate, onCompletion, project, settings }) => {
    const { useState } = React;
    const [generating, setGenerating] = useState(false);
    const [comment, setComment] = useState(video.metadata?.firstComment || '');
    const [error, setError] = useState('');

    const handleGenerateComment = async () => {
        setGenerating(true);
        setError('');
        const prompt = `You are a YouTube channel manager tasked with writing the first "pinned" comment for a new video.
        The comment should be engaging, ask a question to spark conversation, and provide extra value (e.g., a link, a correction, or extra context).
        Video Title: "${video.chosenTitle || video.title}"
        Video Description: "${video.metadata?.description || video.concept}"
        Return a JSON object like: {"comment": "The text of the first comment..."}.`;
        try {
            // FIXED: Pass the 'settings' object
            const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings);
            setComment(parsedJson.comment || '');
        } catch (err) {
            setError(`Failed to generate comment: ${err.message}`);
        } finally {
            setGenerating(false);
        }
    };
    
    const handleSave = () => {
        onUpdate({ ...video, metadata: { ...video.metadata, firstComment: comment }});
        onCompletion(true);
    };

    return (
        <div className="task-container">
            <h3 className="task-title">Generate First Comment</h3>
            {video.tasks.firstCommentGenerated === 'complete' && <span className="task-badge-complete">✓ Completed</span>}
            <div className="task-content">
                <button onClick={handleGenerateComment} disabled={generating} className="button-primary-small w-full justify-center">
                    {generating ? <window.LoadingSpinner isButton={true}/> : '🤖 Generate Pinned Comment'}
                </button>
                {error && <p className="error-message">{error}</p>}
                <textarea
                    className="form-textarea mt-4 h-48"
                    value={comment}
                    onChange={(e) => {
                        setComment(e.target.value);
                        onCompletion(false);
                    }}
                    placeholder="Write or generate the first comment to pin on the video..."
                />
                <button onClick={handleSave} className="button-secondary-small mt-4 w-full justify-center">
                    Save and Mark Complete
                </button>
            </div>
        </div>
    );
};
