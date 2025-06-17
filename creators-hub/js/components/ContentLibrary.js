// js/components/ContentLibrary.js

window.ContentLibrary = ({ onBack, userId, db }) => {
    const { useState, useEffect, useMemo, useCallback } = React;

    const [allVideos, setAllVideos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('projectTitle');
    const [sortOrder, setSortOrder] = useState('asc');

    const [editableFields, setEditableFields] = useState({}); // { videoId: { field: value } }

    const appId = window.CREATOR_HUB_CONFIG.APP_ID;

    useEffect(() => {
        const fetchAllVideos = async () => {
            if (!userId || !db) {
                setError("User or database not available.");
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            try {
                const projectsSnapshot = await db.collection(`artifacts/${appId}/users/${userId}/projects`).get();
                const videoPromises = [];

                projectsSnapshot.forEach(projectDoc => {
                    const projectData = { id: projectDoc.id, ...projectDoc.data() };
                    const promise = db.collection(`artifacts/${appId}/users/${userId}/projects/${projectDoc.id}/videos`).get().then(videosSnapshot => {
                        return videosSnapshot.docs.map(videoDoc => ({
                            ...videoDoc.data(),
                            id: videoDoc.id,
                            projectId: projectData.id,
                            projectTitle: projectData.playlistTitle
                        }));
                    });
                    videoPromises.push(promise);
                });

                const videosByProject = await Promise.all(videoPromises);
                const flattenedVideos = videosByProject.flat();
                setAllVideos(flattenedVideos);

            } catch (err) {
                console.error("Error fetching all videos:", err);
                setError("Failed to load content library.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchAllVideos();
    }, [userId, db, appId]);
    
    const handleFieldChange = (videoId, field, value) => {
        setEditableFields(prev => ({
            ...prev,
            [videoId]: {
                ...prev[videoId],
                [field]: value
            }
        }));
    };
    
    const handleSaveField = async (videoId, field) => {
        if (!editableFields[videoId] || typeof editableFields[videoId][field] === 'undefined') {
            return; // No changes to save
        }

        const videoToUpdate = allVideos.find(v => v.id === videoId);
        if (!videoToUpdate) return;
        
        const videoDocRef = db.collection(`artifacts/${appId}/users/${userId}/projects/${videoToUpdate.projectId}/videos`).doc(videoId);
        
        const valueToSave = editableFields[videoId][field];
        
        let updatePayload = { [field]: valueToSave };
        
        // If script is being updated, also update task status
        if (field === 'script') {
            updatePayload['tasks.scripting'] = valueToSave.trim() !== '' ? 'complete' : 'pending';
        }

        try {
            await videoDocRef.update(updatePayload);
            // Update local state to reflect the change
            setAllVideos(prev => prev.map(v => v.id === videoId ? { ...v, ...updatePayload } : v));
            // Remove the field from editable state after saving
            setEditableFields(prev => {
                const newVideoFields = { ...prev[videoId] };
                delete newVideoFields[field];
                return { ...prev, [videoId]: newVideoFields };
            });
        } catch(err) {
            console.error(`Failed to save ${field} for video ${videoId}:`, err);
            // Optionally show an error message to the user
        }
    };


    const sortedAndFilteredVideos = useMemo(() => {
        let videos = [...allVideos];

        // Filter
        if (searchTerm) {
            const lowerCaseSearch = searchTerm.toLowerCase();
            videos = videos.filter(v => 
                (v.title && v.title.toLowerCase().includes(lowerCaseSearch)) ||
                (v.projectTitle && v.projectTitle.toLowerCase().includes(lowerCaseSearch))
            );
        }

        // Sort
        videos.sort((a, b) => {
            let valA, valB;
            switch (sortBy) {
                case 'scriptStatus':
                    valA = a.script && a.script.trim() !== '' ? 1 : 0;
                    valB = b.script && b.script.trim() !== '' ? 1 : 0;
                    break;
                case 'title':
                    valA = (a.title || '').toLowerCase();
                    valB = (b.title || '').toLowerCase();
                    break;
                case 'projectTitle':
                default:
                    valA = (a.projectTitle || '').toLowerCase();
                    valB = (b.projectTitle || '').toLowerCase();
                    break;
            }

            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        return videos;
    }, [allVideos, searchTerm, sortBy, sortOrder]);

    const handleSort = (column) => {
        if (sortBy === column) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('asc');
        }
    };
    
    const SortableHeader = ({ children, columnId }) => (
        <th className="p-3 text-sm font-semibold text-left cursor-pointer" onClick={() => handleSort(columnId)}>
            <div className="flex items-center gap-1">
                {children}
                {sortBy === columnId && (sortOrder === 'asc' ? '▲' : '▼')}
            </div>
        </th>
    );

    return (
        <div className="p-8 h-screen flex flex-col">
            <header className="flex justify-between items-center mb-8 flex-shrink-0">
                <h1 className="text-4xl font-bold text-white">📚 Content Library</h1>
                <button onClick={onBack} className="flex items-center gap-2 glass-card px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to Tools
                </button>
            </header>

            <div className="mb-6 flex-shrink-0">
                <input
                    type="text"
                    placeholder="Filter by video or project title..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full md:w-1/3 form-input"
                />
            </div>

            {isLoading ? <window.LoadingSpinner text="Loading all your videos..." /> : error ? <p className="text-red-400">{error}</p> : (
                <div className="flex-grow overflow-auto glass-card rounded-lg">
                    <table className="w-full text-left table-auto">
                        <thead className="bg-gray-800/50 sticky top-0 backdrop-blur-sm">
                            <tr>
                                <SortableHeader columnId="projectTitle">Project</SortableHeader>
                                <SortableHeader columnId="title">Video Title</SortableHeader>
                                <th className="p-3 text-sm font-semibold text-left">Concept</th>
                                <th className="p-3 text-sm font-semibold text-left">Script</th>
                                <SortableHeader columnId="scriptStatus">Script Status</SortableHeader>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {sortedAndFilteredVideos.map(video => (
                                <tr key={video.id} className="hover:bg-gray-800/50">
                                    <td className="p-3 align-top text-sm font-semibold text-primary-accent">{video.projectTitle}</td>
                                    <td className="p-3 align-top w-1/4">
                                        <textarea
                                            value={editableFields[video.id]?.title ?? video.title}
                                            onChange={(e) => handleFieldChange(video.id, 'title', e.target.value)}
                                            onBlur={() => handleSaveField(video.id, 'title')}
                                            className="w-full form-textarea bg-transparent border-0 focus:bg-gray-800 p-1"
                                            rows="2"
                                        />
                                    </td>
                                    <td className="p-3 align-top w-1/4">
                                        <textarea
                                            value={editableFields[video.id]?.concept ?? video.concept}
                                            onChange={(e) => handleFieldChange(video.id, 'concept', e.target.value)}
                                            onBlur={() => handleSaveField(video.id, 'concept')}
                                            className="w-full form-textarea bg-transparent border-0 focus:bg-gray-800 p-1"
                                            rows="3"
                                        />
                                    </td>
                                    <td className="p-3 align-top w-1/3">
                                        <textarea
                                            value={editableFields[video.id]?.script ?? video.script}
                                            onChange={(e) => handleFieldChange(video.id, 'script', e.target.value)}
                                            onBlur={() => handleSaveField(video.id, 'script')}
                                            className="w-full form-textarea bg-transparent border-0 focus:bg-gray-800 p-1"
                                            rows="4"
                                            placeholder="No script yet..."
                                        />
                                    </td>
                                    <td className="p-3 align-top text-center">
                                        {video.script && video.script.trim() !== '' ? (
                                            <span className="px-2 py-1 text-xs font-semibold text-green-300 bg-green-900/50 rounded-full">Complete</span>
                                        ) : (
                                            <span className="px-2 py-1 text-xs font-semibold text-amber-300 bg-amber-900/50 rounded-full">Pending</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
