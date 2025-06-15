// js/components/ProjectView/EditProjectModal.js

const { useState, useCallback } = React; // Add React import for useState and useCallback

window.EditProjectModal = ({ project, userId, settings, onClose, googleMapsLoaded }) => {
    const [title, setTitle] = useState(project.playlistTitle);
    const [description, setDescription] = useState(project.playlistDescription);
    const [locations, setLocations] = useState(project.locations || []);
    const [refinement, setRefinement] = useState('');
    const [generating, setGenerating] = useState(null);
    // Add state for cover image URL
    const [coverImageUrl, setCoverImageUrl] = useState(project.coverImageUrl || ''); 
    const appId = window.CREATOR_HUB_CONFIG.APP_ID;
    const projectDocRef = db.collection(`artifacts/${appId}/users/${userId}/projects`).doc(project.id);

    const handleLocationsUpdate = useCallback((newLocations) => {
        setLocations(newLocations);
    }, []);

    const handleSave = async () => {
        await projectDocRef.update({
            playlistTitle: title,
            playlistDescription: description,
            locations: locations,
            coverImageUrl: coverImageUrl // Save the new cover image URL
        });
        onClose();
    };

    const handleRefine = async (type) => {
        setGenerating(type);
        const apiKey = settings.geminiApiKey || "";
        let prompt = '';
        if (type === 'title') {
            prompt = `The user is creating a YouTube series. The current title is "${title}". Their refinement instruction is: "${refinement}". Generate 3 NEW, creative, and SEO-friendly title suggestions. Return as a JSON object like: {"suggestions": ["title1", "title2", "title3"]}`;
        } else {
            prompt = `The user is creating a YouTube series. The current description is: "${description}". Their refinement instruction is: "${refinement}". Rewrite the playlist description to incorporate the feedback, keeping it SEO-optimized. Return as a JSON object like: {"suggestion": "new description..."}`;
        }

        try {
            const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } };
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
            const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!response.ok) throw new Error(await response.text());
            const result = await response.json();
            const parsedJson = JSON.parse(result.candidates[0].content.parts[0].text);
            if (type === 'title' && parsedJson.suggestions) {
                setTitle(parsedJson.suggestions[0]);
            } else if (type === 'description' && parsedJson.suggestion) {
                setDescription(parsedJson.suggestion);
            }
        } catch (error) {
            console.error(`Error refining ${type}:`, error);
        } finally {
            setGenerating(false);
            setRefinement('');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4">
            <div className="glass-card rounded-lg p-8 w-full max-w-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-6 text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
                <h2 className="text-2xl font-bold mb-6">Edit Project Details</h2>
                
                <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Project Title</label>
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full form-input" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Project Description</label>
                        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows="6" className="w-full form-textarea" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Project Locations</label>
                        {googleMapsLoaded 
                            ? <window.LocationSearchInput onLocationsChange={handleLocationsUpdate} existingLocations={locations} /> 
                            : <window.MockLocationSearchInput />
                        }
                    </div>
                    {/* New field for Cover Image URL */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Cover Image URL (e.g., from Unsplash)</label>
                        <input 
                            type="url" 
                            value={coverImageUrl} 
                            onChange={(e) => setCoverImageUrl(e.target.value)} 
                            className="w-full form-input" 
                            placeholder="Paste image URL here (e.g., from Unsplash)"
                        />
                        {coverImageUrl && (
                            <div className="mt-2 text-center">
                                <img src={coverImageUrl} alt="Project Cover Preview" className="max-w-full h-auto rounded-lg mx-auto" style={{ maxHeight: '150px', objectFit: 'cover' }} />
                            </div>
                        )}
                    </div>
                     {/* New section for creating project thumbnail on Canva */}
                    <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                        <label className="block text-sm font-medium text-gray-300 mb-1">Project Thumbnail</label>
                        <p className="text-xs text-gray-400 mb-3">Use Canva to create the main thumbnail for your YouTube playlist.</p>
                        <a 
                            href="https://www.canva.com/create/youtube-thumbnails/"
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-block px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold"
                        >
                            Create Project Thumbnail on Canva
                        </a>
                    </div>
                    <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                        <label className="block text-sm font-medium text-gray-300 mb-2">Refine with AI</label>
                        <textarea value={refinement} onChange={(e) => setRefinement(e.target.value)} rows="2" className="w-full form-textarea" placeholder="e.g., 'Make the title more mysterious' or 'Add more about the history in the description'"/>
                        <div className="flex gap-4 mt-2">
                             <button onClick={() => handleRefine('title')} disabled={generating || !refinement} className="px-4 py-2 text-sm bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold disabled:bg-gray-500 flex items-center gap-2">{generating === 'title' ? <window.LoadingSpinner/> : 'Refine Title'}</button>
                             <button onClick={() => handleRefine('description')} disabled={generating || !refinement} className="px-4 py-2 text-sm bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold disabled:bg-gray-500 flex items-center gap-2">{generating === 'description' ? <window.LoadingSpinner/> : 'Refine Description'}</button>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-700">
                    <button onClick={onClose} className="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold">Cancel</button>
                    <button onClick={handleSave} className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold">Save Changes</button>
                </div>
            </div>
        </div>
    );
};
