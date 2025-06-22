// creators-hub/js/components/ProjectVew/tasks/ChaptersTask.js

window.ChaptersTask = ({ video, settings, onUpdateTask, isLocked }) => {
    const { useState, useEffect } = React;

    // Initialize chapters from video data if they exist, otherwise empty array.
    const [chapters, setChapters] = useState(video.chapters || []);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState('');

    // Effect to update chapters if the video prop changes.
    useEffect(() => {
        setChapters(video.chapters || []);
    }, [video.chapters]);


    const handleGenerateChapters = async () => {
        if (!video.script) {
            setError('A video script is required to generate chapters.');
            return;
        }
        setGenerating(true);
        setError('');

        const prompt = `
            Analyze the following video script and identify the main sections.
            Based on these sections, generate a list of concise chapter titles.
            The first chapter should always be "Intro".
            Return the result as a JSON object with a single key "chapters" containing an array of strings.
            Example: {"chapters": ["Intro", "First Main Point", "Second Main Point", "Conclusion"]}

            SCRIPT:
            ---
            ${video.script}
            ---
        `;

        try {
            const result = await window.aiUtils.callGeminiAPI(prompt, settings, {});
            const suggestedTitles = result.chapters || [];
            // Transform the array of strings into the state structure { time: '', title: '' }
            const newChapters = suggestedTitles.map((title, index) => ({
                time: index === 0 ? '00:00' : '', // Default the first chapter to 00:00
                title: title
            }));
            setChapters(newChapters);
        } catch (err) {
            console.error("Error generating chapters:", err);
            setError(`Failed to generate chapters: ${err.message}`);
        } finally {
            setGenerating(false);
        }
    };

    const handleChapterChange = (index, field, value) => {
        const newChapters = [...chapters];
        newChapters[index][field] = value;
        setChapters(newChapters);
    };

    const handleAddChapter = () => {
        setChapters([...chapters, { time: '', title: '' }]);
    };

    const handleRemoveChapter = (indexToRemove) => {
        setChapters(chapters.filter((_, index) => index !== indexToRemove));
    };

    const handleSave = () => {
        // Validate that all timestamps and titles are filled
        for (const chapter of chapters) {
            // A simple regex to check for MM:SS or H:MM:SS format
            if (!/^\d{1,2}:\d{2}(:\d{2})?$/.test(chapter.time) || !chapter.title) {
                setError('All chapters must have a valid title and timestamp (e.g., 01:23 or 1:01:23). Please review your chapters.');
                return;
            }
        }
         // Validate that the first chapter starts at 00:00
        if (chapters.length > 0 && chapters[0].time !== '00:00') {
            setError('The first chapter must start at 00:00.');
            return;
        }
        setError('');

        // The 'chapters' object array is saved directly.
        // It will be formatted into the final string only when needed (e.g., in the Upload task).
        onUpdateTask('chaptersGenerated', 'complete', { chapters: chapters });
    };

    if (isLocked) {
        return <p className="text-gray-400 text-center py-2 text-sm">Please complete the previous steps first.</p>;
    }

    return (
        <div className="task-content space-y-4">
            <button onClick={handleGenerateChapters} disabled={generating || !video.script} className="button-primary-small w-full justify-center">
                {generating ? <window.LoadingSpinner isButton={true} /> : '🤖 Generate Suggested Chapters'}
            </button>
            {!video.script && <p className="text-yellow-400 text-sm text-center">A finalized script is needed to generate chapter suggestions.</p>}
            {error && <p className="error-message">{error}</p>}

            <div className="space-y-3 mt-4">
                {chapters.map((chapter, index) => (
                    <div key={index} className="flex items-center gap-3">
                        <input
                            type="text"
                            placeholder="00:00"
                            value={chapter.time}
                            onChange={(e) => handleChapterChange(index, 'time', e.target.value)}
                            className="form-input w-28 text-center"
                        />
                        <input
                            type="text"
                            placeholder="Chapter Title"
                            value={chapter.title}
                            onChange={(e) => handleChapterChange(index, 'title', e.target.value)}
                            className="form-input flex-grow"
                        />
                        <button onClick={() => handleRemoveChapter(index)} className="button-danger-small flex-shrink-0">
                            Remove
                        </button>
                    </div>
                ))}
            </div>

            <div className="mt-4 flex justify-start">
                <button onClick={handleAddChapter} className="button-secondary-small">
                    + Add Chapter
                </button>
            </div>

            <div className="pt-6 border-t border-gray-700 text-center mt-6">
                <button
                    onClick={handleSave}
                    disabled={generating || chapters.length === 0}
                    className="w-full max-w-xs mx-auto px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg font-semibold text-white disabled:bg-gray-500 disabled:cursor-not-allowed"
                >
                    Confirm Chapters & Mark Complete
                </button>
            </div>
        </div>
    );
};
