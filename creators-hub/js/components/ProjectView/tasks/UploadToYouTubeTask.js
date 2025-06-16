// js/components/ProjectView/tasks/UploadToYouTubeTask.js

window.UploadToYouTubeTask = ({ video, onUpdateTask, isLocked }) => {
    const { useMemo } = React;

    const metadata = useMemo(() => {
        try {
            return video.metadata ? JSON.parse(video.metadata) : {};
        } catch { return {}; }
    }, [video.metadata]);

    const title = video.chosenTitle || '';
    const description = metadata.description || '';
    const tags = metadata.tags || '';

    // A small, reusable component for each piece of metadata
    const CopyableField = ({ label, value, isTextarea = false, rows = 8 }) => (
        <div>
            <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-300">{label}</label>
                <window.CopyButton textToCopy={value} />
            </div>
            {isTextarea ? (
                <textarea readOnly value={value} rows={rows} className="w-full form-textarea bg-gray-800/80 cursor-copy"/>
            ) : (
                <input type="text" readOnly value={value} className="w-full form-input bg-gray-800/80 cursor-copy"/>
            )}
        </div>
    );
    
    if (isLocked) {
        return <p className="text-gray-400 text-center py-2 text-sm">Please complete all previous steps first.</p>;
    }

    if (video.tasks?.videoUploaded === 'complete') {
        return <p className="text-gray-400 text-center py-2 text-sm">This video has been marked as uploaded.</p>;
    }

    return (
        <div className="space-y-6">
            <p className="text-sm text-gray-400">Copy the following details and paste them into the corresponding fields on YouTube's upload page.</p>
            
            <CopyableField label="Video Title" value={title} />
            <CopyableField label="Video Description" value={description} isTextarea={true} rows={12} />
            <CopyableField label="Video Tags" value={tags} isTextarea={true} rows={5}/>

            <div className="pt-4 border-t border-gray-700 text-center">
                 <button onClick={() => onUpdateTask('videoUploaded', 'complete')} className="w-full max-w-sm mx-auto px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg font-semibold">
                    Mark as Uploaded
                </button>
            </div>
        </div>
    );
};
