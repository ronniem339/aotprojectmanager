// js/components/ProjectView/tasks/FirstCommentTask.js

window.FirstCommentTask = ({ video, onUpdate, onCompletion, project, settings }) => {
    const { useState } = React;
    const [generating, setGenerating] = useState(false);
    const [comment, setComment] = useState(video.metadata?.firstComment || '');
    const [error, setError] = useState('');

    const handleGenerateComment = async () => {
        setGenerating(true);
        setError('');
        const prompt = `
            **Knowledge Base: Best Practices for First Pinned Comments on YouTube**

            * **Objective:** Encourage engagement, provide value, and set a positive tone for the comments section.
            * **Key Elements:**
                * **Call to Action (CTA):** Ask a direct question related to the video's content to spark discussion.
                * **Add Value:** Provide a link to a resource mentioned in the video, a correction, a timestamp for a key moment, or extra context.
                * **Set the Tone:** Use a friendly and approachable tone.
                * **Be Concise:** Keep the comment relatively short and easy to read.
            * **Examples:**
                * "What was your favorite part of the video? Let me know in the replies! 👇"
                * "Here's the link to the [resource I mentioned](link). What other topics would you like me to cover?"
                * "I made a mistake at 2:35! It should be 'xyz', not 'abc'. Thanks for understanding!"

            **Video Context:**

            * **Video Title:** "${video.chosenTitle || video.title}"
            * **Video Description:** "${video.metadata?.description || video.concept}"

            **Your Task:**

            You are a YouTube channel manager. Based on the knowledge base and the video context, write a compelling first pinned comment for this video.
            Return a JSON object like: {"comment": "The text of the first comment..."}.
        `;

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
