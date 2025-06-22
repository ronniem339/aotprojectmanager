// creators-hub/js/components/ProjectVew/tasks/ChaptersTask.js

window.ChaptersTask = ({ video, settings, onUpdateTask, isLocked }) => {
    const { useState, useEffect } = React;

    // Initialize chapters from video data if they exist, otherwise empty array.
    const [chapters, setChapters] = useState(video.chapters || []);
    const [generating, setGenerating] = useState(false);
    const [refining, setRefining] = useState(false);
    const [refinePrompt, setRefinePrompt] = useState('');
    const [error, setError] = useState('');

    // Effect to update chapters if the video prop changes.
    useEffect(() => {
        setChapters(video.chapters || []);
    }, [video.chapters]);

    // Helper function to parse time strings (like "1:23" or "1:05:10") into seconds.
    const parseTimeToSeconds = (time) => {
        const parts = time.split(':').map(Number);
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
        if (parts.length === 2) return parts[0] * 60 + parts[1];
        return 0;
    };

    // Helper function to format time strings with padded zeros for minutes/seconds.
    const formatTimeWithPadding = (time) => {
        const parts = time.split(':');
        if (parts.length === 2) {
            const [minutes, seconds] = parts;
            return `${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}`;
        }
        if (parts.length === 3) {
            const [hours, minutes, seconds] = parts;
            return `${hours}:${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}`;
        }
        return time; // Return original if format is unexpected
    };

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

    const handleRefineChapters = async () => {
        if (chapters.length === 0 || !refinePrompt) {
            setError("Please generate chapters and enter a refinement prompt first.");
            return;
        }
        setRefining(true);
        setError('');

        const currentTitles = chapters.map(c => c.title);

        const prompt = `
            You are an expert in video content and titling.
            You have been given a list of chapter titles for a video.
            Your task is to refine these titles based on the user's instructions.
            Do not change the number of chapters.
            Return the result as a JSON object with a single key "chapters" containing an array of the refined strings.

            Original Chapter Titles:
            ---
            ${JSON.stringify(currentTitles)}
            ---

            User's Refinement Instructions:
            ---
            ${refinePrompt}
            ---
        `;

        try {
            const result = await window.aiUtils.callGeminiAPI(prompt, settings, {});
            const refinedTitles = result.chapters || [];

            if (refinedTitles.length === chapters.length) {
                const refinedChapters = chapters.map((chapter, index) => ({
                    ...chapter,
                    title: refinedTitles[index]
                }));
                setChapters(refinedChapters);
                setRefinePrompt(''); // Clear the prompt after successful refinement
            } else {
                throw new Error("The number of refined chapters does not match the original count.");
            }

        } catch (err) {
            console.error("Error refining chapters:", err);
            setError(`Failed to refine chapters: ${err.message}`);
        } finally {
            setRefining(false);
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

        // 1. Determine if the video is 10 minutes or longer from the chapter times.
        const maxDurationInSeconds = Math.max(...chapters.map(ch => parseTimeToSeconds(ch.time)));
        const isLongVideo = maxDurationInSeconds >= 600; // 10 minutes = 600 seconds

        // 2. Format the chapter string for the description, applying padding if needed.
        const chapterString = chapters
            .map(ch => {
                const formattedTime = isLongVideo ? formatTimeWithPadding(ch.time) : ch.time;
                return `${formattedTime} - ${ch.title}`;
            })
            .join('\n');

        // 3. Get the current description safely.
        const currentMetadata = (typeof video.metadata === 'string' && video.metadata)
            ? JSON.parse(video.metadata)
            : video.metadata || {};
        const currentDescription = currentMetadata.description || '';

        // 4. Append the formatted chapters to the description.
        const chapterHeader = "\n\n--- CHAPTERS ---\n";
        let newDescription;
        const existingChapterIndex = currentDescription.indexOf(chapterHeader);

        if (existingChapterIndex !== -1) {
            // If chapters already exist in the description, replace them to avoid duplicates.
            newDescription = currentDescription.substring(0, existingChapterIndex) + chapterHeader + chapterString;
        } else {
            // Otherwise, append them for the first time.
            newDescription = currentDescription + chapterHeader + chapterString;
        }

        // 5. Update the database with both the structured chapters and the updated description text.
        onUpdateTask('chaptersGenerated', 'complete', {
            chapters: chapters,
            'metadata.description': newDescription
        });
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

            {chapters.length > 0 && (
                <div className="flex items-center gap-3 mt-4">
                    <input
                        type="text"
                        placeholder="e.g., Make titles shorter and more exciting"
                        value={refinePrompt}
                        onChange={(e) => setRefinePrompt(e.target.value)}
                        className="form-input flex-grow"
                        disabled={refining}
                    />
                    <button
                        onClick={handleRefineChapters}
                        disabled={refining || !refinePrompt}
                        className="button-secondary-small flex-shrink-0"
                    >
                        {refining ? <window.LoadingSpinner isButton={true} /> : 'Refine Titles'}
                    </button>
                </div>
            )}

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
