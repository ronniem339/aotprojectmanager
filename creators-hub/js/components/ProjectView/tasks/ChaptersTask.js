// js/components/ProjectView/tasks/ChaptersTask.js

window.ChaptersTask = ({ video, onUpdateTask, isLocked }) => {
    const { useState, useEffect, useMemo, useRef } = React;
    const [chapters, setChapters] = useState([]);
    const dragItem = useRef();
    const dragOverItem = useRef();

    const metadata = useMemo(() => {
        try {
            return video.metadata ? JSON.parse(video.metadata) : null;
        } catch { return null; }
    }, [video.metadata]);
    
    useEffect(() => {
        const initialChapters = (video.chapters || metadata?.chapters || []).map((chap, i) => ({...chap, id: `chap-${i}-${Date.now()}`}));
        setChapters(initialChapters);
    }, [video.id, video.chapters, metadata]);

    const handleAddChapter = () => {
        const newChapter = { timestamp: '0:00', title: '', id: `temp-${Date.now()}` };
        setChapters([...chapters, newChapter]);
    };

    const handleDeleteChapter = (idToDelete) => {
        setChapters(chapters.filter(chap => chap.id !== idToDelete));
    };

    const handleChapterChange = (id, field, value) => {
        const newChapters = chapters.map(chap => chap.id === id ? { ...chap, [field]: value } : chap);
        setChapters(newChapters);
    };

    const handleDragStart = (e, position) => {
        dragItem.current = position;
    };

    const handleDragEnter = (e, position) => {
        dragOverItem.current = position;
        const list = e.currentTarget.closest('.chapter-list');
        if (list) {
            const children = Array.from(list.children);
            children.forEach(item => item.classList.remove('drag-over-indicator'));
            e.currentTarget.classList.add('drag-over-indicator');
        }
    };
    
    const handleDrop = (e) => {
        const newChapters = [...chapters];
        const dragItemContent = newChapters[dragItem.current];
        newChapters.splice(dragItem.current, 1);
        newChapters.splice(dragOverItem.current, 0, dragItemContent);
        dragItem.current = null;
        dragOverItem.current = null;
        setChapters(newChapters);
    };

    const applyTimestampsAndComplete = () => {
        const requiresPadding = chapters.some(chap => {
            const parts = chap.timestamp.split(':');
            if (parts.length === 2) return parseInt(parts[0], 10) >= 10;
            if (parts.length === 3) return true;
            return false;
        });

        const formatTimestamp = (timestamp, forcePadding) => {
            if (!forcePadding) return timestamp;
            const parts = timestamp.split(':');
            if (parts.length === 2) {
                let [minutes, seconds] = parts;
                if (minutes.length === 1) minutes = '0' + minutes;
                if (seconds.length === 1) seconds = '0' + seconds;
                return `${minutes}:${seconds}`;
            }
            if (parts.length === 3) {
                let [hours, minutes, seconds] = parts;
                if (minutes.length === 1) minutes = '0' + minutes;
                if (seconds.length === 1) seconds = '0' + seconds;
                return `${hours}:${minutes}:${seconds}`;
            }
            return timestamp;
        };

        const finalChapters = chapters.map(({ id, ...rest }) => ({
            ...rest,
            timestamp: formatTimestamp(rest.timestamp, requiresPadding)
        }));

        const chapterText = finalChapters.map(c => `${c.timestamp} - ${c.title}`).join('\n');
        const finalDescription = (metadata?.description || '').replace('{{CHAPTERS}}', chapterText);
        const finalMetadata = { ...(metadata || {}), description: finalDescription, chapters: finalChapters };
        
        onUpdateTask('chaptersGenerated', 'complete', { 
            metadata: JSON.stringify(finalMetadata), 
            chapters: finalChapters
        });
    };

    if (isLocked) {
        return <p className="text-gray-400 text-center py-2 text-sm">Please finalize the description first.</p>;
    }
    
     if (video.tasks?.chaptersGenerated === 'complete') {
        return <p className="text-gray-400 text-center py-2 text-sm">Chapters have been finalized.</p>;
    }

    return (
        <div className="space-y-4">
             <style>{`.drag-over-indicator { border-top: 2px solid #00BFFF; }`}</style>
             <div className="space-y-2 chapter-list" onDragOver={(e) => e.preventDefault()}>
                {chapters.map((chap, i) => (
                    <div 
                        key={chap.id}
                        className="flex items-center gap-2 p-1 rounded-md bg-gray-800/50 chapter-item"
                        draggable
                        onDragStart={(e) => handleDragStart(e, i)}
                        onDragEnter={(e) => handleDragEnter(e, i)}
                        onDragEnd={() => dragOverItem.current = null}
                        onDrop={handleDrop}
                    >
                        <span className="cursor-grab text-gray-500 p-1" title="Drag to reorder">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M2 10a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm3 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm3 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm3 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm3 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2zM2 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm3 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm3 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm3 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm3 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/></svg>
                        </span>
                        <input type="text" value={chap.timestamp} onChange={(e) => handleChapterChange(chap.id, 'timestamp', e.target.value)} className="form-input w-24" placeholder="0:00"/> 
                        <input type="text" value={chap.title} onChange={(e) => handleChapterChange(chap.id, 'title', e.target.value)} className="form-input flex-grow" />
                        <button onClick={() => handleDeleteChapter(chap.id)} className="p-2 text-red-400 hover:text-red-300 rounded-full flex-shrink-0" title="Delete Chapter">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                        </button>
                    </div>
                ))}
            </div>
             <div className="mt-2">
                <button onClick={handleAddChapter} className="text-sm text-primary-accent hover:underline">+ Add Chapter</button>
            </div>
            <div className="pt-4 border-t border-gray-700 text-right">
                <button onClick={applyTimestampsAndComplete} className="px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg">Apply Timestamps & Finalize</button>
            </div>
        </div>
    );
};
