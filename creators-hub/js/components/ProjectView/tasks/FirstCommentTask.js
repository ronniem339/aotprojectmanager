// js/components/ProjectView/tasks/FirstCommentTask.js

window.FirstCommentTask = ({ video, onUpdateTask, settings }) => {
    const { useState } = React;
    const [generating, setGenerating] = useState(false);
    const [comment, setComment] = useState(video.metadata?.firstComment || '');
    const [error, setError] = useState('');

    const handleGenerateComment = async () => {
        setGenerating(true);
        setError('');
        const firstCommentKB = settings.knowledgeBases?.youtube?.firstPinnedCommentExpert 
            || 'You are a YouTube channel manager tasked with writing the first "pinned" comment for a new video. The comment should be engaging, ask a question to spark conversation, and provide extra value (e.g., a link, a correction, or extra context).';

        const prompt = `
            **Your Expert Role:**
            ${firstCommentKB}

            **Video Context:**
            * **Video Title:** "${video.chosenTitle || video.title}"
            * **Video Description:** "${video.metadata?.description || video.concept}"

            **Your Task:**
            Based on your expert role and the provided video context, write a compelling first pinned comment.
            Return a JSON object like: {"comment": "The text of the first comment..."}.
        `;

        try {
            const parsedJson = await window.aiUtils.callGeminiAPI(prompt, settings);
            setComment(parsedJson.comment || '');
        } catch (err) {
            setError(`Failed to generate comment: ${err.message}`);
        } finally {
            setGenerating(false);
        }
    };
    
    // --- FIX START ---
    const handleSave = () => {
        // Prepare the data payload with the new comment.
        const updatedData = {
            metadata: {
                ...video.metadata,
                firstComment: comment
            }
        };
        // Call the onUpdateTask function with the correct arguments:
        // task ID, new status, and the data payload.
        onUpdateTask('firstCommentGenerated', 'complete', updatedData);
    };
    // --- FIX END ---

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
                        // This onCompletion is not passed, so we can remove it or make the parent aware
                        // For now, we assume the main save button handles completion status.
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
