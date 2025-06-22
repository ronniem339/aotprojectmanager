// creators-hub/js/components/ProjectView/tasks/ChaptersTask.js

window.ChaptersTask = ({ video, settings, onUpdateTask, isLocked }) => {
    const { useState, useEffect } = React;
    const [chapters, setChapters] = useState(video.chapters || []);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState('');

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

    const handleGenerateChapters = async () => { /* ... this function is unchanged ... */ };
    const handleChapterChange = (index, field, value) => { /* ... this function is unchanged ... */ };
    const handleAddChapter = () => { /* ... this function is unchanged ... */ };
    const handleRemoveChapter = (indexToRemove) => { /* ... this function is unchanged ... */ };

    const handleSave = () => {
        // ... (validation logic is unchanged) ...

        // --- UPDATED LOGIC ---
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
            newDescription = currentDescription.substring(0, existingChapterIndex) + chapterHeader + chapterString;
        } else {
            newDescription = currentDescription + chapterHeader + chapterString;
        }

        // 5. Update the database.
        onUpdateTask('chaptersGenerated', 'complete', {
            chapters: chapters,
            'metadata.description': newDescription 
        });
    };

    // ... (the return statement with the UI is unchanged) ...
};
