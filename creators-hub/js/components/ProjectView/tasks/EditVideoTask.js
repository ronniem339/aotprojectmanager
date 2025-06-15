// js/components/ProjectView/tasks/EditVideoTask.js

window.EditVideoTask = ({ video, onUpdateTask, isLocked }) => {
    const { useState, useEffect } = React;

    const [musicTrack, setMusicTrack] = useState('');
    const [changeLog, setChangeLog] = useState('');
    const [showLogChanges, setShowLogChanges] = useState(false);

    // Sync local state with data from Firestore
    useEffect(() => {
        setMusicTrack(video.tasks?.musicTrack || '');
        setChangeLog(video.tasks?.feedbackText || '');
        // If the task is already in progress but logging isn't shown, reset the flag
        if (video.tasks?.videoEdited === 'in-progress') {
            setShowLogChanges(false);
        }
    }, [video.id, video.tasks]);

    const handleStartEditing = () => {
        onUpdateTask('videoEdited', 'in-progress');
    };
    
    const handleSaveMusic = () => {
        // This just saves the text, doesn't complete the task
        onUpdateTask('videoEdited', 'in-progress', { 'tasks.musicTrack': musicTrack });
    };

    const handleConfirmAndLog = () => {
        setShowLogChanges(true);
    };

    const handleSaveLogAndComplete = () => {
        onUpdateTask('videoEdited', 'complete', { 'tasks.feedbackText': changeLog });
    };

    const handleNoChanges = () => {
        onUpdateTask('videoEdited', 'complete', { 'tasks.feedbackText': 'No changes made from the original plan.' });
    };

    const status = video.tasks?.videoEdited || 'pending';

    // -- RENDER LOGIC --

    if (isLocked) {
        return <p className="text-gray-400 text-center py-2 text-sm">Please complete previous steps to begin editing.</p>;
    }

    if (status === 'complete') {
        return (
            <div>
                <p className="text-gray-400 text-center py-2 text-sm">This task is marked as complete.</p>
                <div className="mt-2 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                    <h4 className="font-semibold text-gray-300 mb-1">Selected Music:</h4>
                    <p className="text-gray-400 text-sm italic">{video.tasks?.musicTrack || 'Not specified.'}</p>
                    <h4 className="font-semibold text-gray-300 mt-3 mb-1">Change Log:</h4>
                    <p className="text-gray-400 text-sm whitespace-pre-wrap">{video.tasks?.feedbackText || 'No changes were logged.'}</p>
                </div>
            </div>
        );
    }
    
    // Initial state: Button to start the editing process
    if (status === 'pending') {
        return (
            <button onClick={handleStartEditing} className="w-full px-5 py-2.5 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold">
                Start Editing
            </button>
        );
    }
    
    // In-progress state: Music selection and completion confirmation
    if (status === 'in-progress' && !showLogChanges) {
        return (
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Background Music (Placeholder)</label>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={musicTrack}
                            onChange={(e) => setMusicTrack(e.target.value)}
                            className="w-full form-input" 
                            placeholder="e.g., Suno AI - 'Cinematic Travel Vlog'"
                        />
                        <button onClick={handleSaveMusic} className="px-4 text-sm bg-secondary-accent hover:bg-secondary-accent-darker rounded-lg font-semibold">Save</button>
                    </div>
                     <p className="text-xs text-gray-500 mt-1">Note the name or link of your chosen audio track here.</p>
                </div>
                <div className="pt-4 border-t border-gray-700 text-center">
                    <button onClick={handleConfirmAndLog} className="w-full max-w-sm mx-auto px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg font-semibold">
                        Confirm Edit is Complete & Log Changes
                    </button>
                </div>
            </div>
        );
    }

    // Logging changes state, just before final completion
    if (status === 'in-progress' && showLogChanges) {
        return (
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-amber-400">Log any changes from the original plan</h3>
                <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                     <h4 className="font-semibold text-gray-300 mb-1">Original Script:</h4>
                     <textarea readOnly value={video.script} rows="5" className="w-full form-textarea bg-gray-800/80 cursor-not-allowed" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Describe Changes Made During Editing</label>
                    <textarea 
                        value={changeLog}
                        onChange={(e) => setChangeLog(e.target.value)}
                        rows="4" 
                        className="w-full form-textarea" 
                        placeholder="e.g., 'Removed the intro section and started directly with the hook. Combined the two final locations into one segment.'"
                    />
                </div>
                <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-700">
                    <button onClick={handleNoChanges} className="w-full px-5 py-2.5 bg-secondary-accent hover:bg-secondary-accent-darker rounded-lg font-semibold">
                        No Changes Were Made
                    </button>
                    <button onClick={handleSaveLogAndComplete} disabled={!changeLog} className="w-full px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg font-semibold disabled:opacity-75 disabled:cursor-not-allowed">
                        Save Log & Complete Task
                    </button>
                </div>
            </div>
        );
    }

    return null; // Fallback
};
