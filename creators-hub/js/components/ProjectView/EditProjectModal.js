// js/components/ProjectView/EditProjectModal.js

const { useState, useCallback } = React; // Add React import for useState and useCallback

window.EditProjectModal = ({ project, userId, settings, onClose, googleMapsLoaded, firebaseAppInstance }) => { // Added firebaseAppInstance
    const [title, setTitle] = useState(project.playlistTitle);
    const [description, setDescription] = useState(project.playlistDescription);
    const [locations, setLocations] = useState(project.locations || []);
    const [refinement, setRefinement] = useState('');
    const [generating, setGenerating] = useState(null);
    // Add state for cover image URL
    const [coverImageUrl, setCoverImageUrl] = useState(project.coverImageUrl || ''); 
    const [isSaving, setIsSaving] = useState(false); // New state for saving loading indicator
    const appId = window.CREATOR_HUB_CONFIG.APP_ID;
    const projectDocRef = db.collection(`artifacts/${appId}/users/${userId}/projects`).doc(project.id);

    // Initialize Firebase Storage
    const storage = firebaseAppInstance ? firebaseAppInstance.storage() : null;

    /**
     * Downloads an image from a URL via a Netlify proxy function and uploads it to Firebase Storage.
     * @param {string} imageUrl - The URL of the image to download.
     * @param {string} uploadPath - The desired path in Firebase Storage (e.g., 'project_thumbnails/my_image.jpg').
     * @returns {Promise<string>} - A promise that resolves to the Firebase Storage download URL, or an empty string on error.
     */
    const downloadAndUploadImage = async (imageUrl, uploadPath) => {
        if (!imageUrl || !storage) {
            console.warn("No image URL or Firebase Storage instance available for upload.");
            return '';
        }

        // Use the Netlify function as a proxy to bypass CORS issues.
        const fetchUrl = `/.netlify/functions/fetch-image?url=${encodeURIComponent(imageUrl)}`;

        try {
            const response = await fetch(fetchUrl);
            if (!response.ok) {
                 const errText = await response.text();
                throw new Error(errText || 'Failed to fetch image via Netlify Function');
            }
            const blob = await response.blob(); // Get image as Blob

            const storageRef = storage.ref(uploadPath);
            await storageRef.put(blob); // Upload the Blob
            const downloadUrl = await storageRef.getDownloadURL(); // Get the permanent URL
            return downloadUrl;
        } catch (error) {
            console.error(`Error downloading or uploading image from ${imageUrl} to ${uploadPath}:`, error);
            return '';
        }
    };

    const handleLocationsUpdate = useCallback((newLocations) => {
        setLocations(newLocations);
    }, []);

    const handleSave = async () => {
        setIsSaving(true); // Start loading

        let finalCoverImageUrl = coverImageUrl;
        // Check if the URL is a new external URL (not already a Firebase Storage URL)
        if (coverImageUrl && !coverImageUrl.includes('firebasestorage.googleapis.com')) {
            try {
                const fileExtensionMatch = coverImageUrl.match(/\.(jpg|jpeg|png|gif|webp)/i);
                const fileExtension = fileExtensionMatch ? fileExtensionMatch[0] : '.jpg';
                const path = `project_thumbnails/${project.id}_${Date.now()}${fileExtension}`;
                finalCoverImageUrl = await downloadAndUploadImage(coverImageUrl, path);
            } catch (error) {
                console.error("Failed to upload new cover image to Firebase Storage:", error);
                // Optionally, revert to old image or keep current external URL if upload fails
                finalCoverImageUrl = project.coverImageUrl || ''; 
            }
        }

        try {
            await projectDocRef.update({
                playlistTitle: title,
                playlistDescription: description,
                locations: locations,
                coverImageUrl: finalCoverImageUrl // Save the new cover image URL (Firebase or original if failed)
            });
            onClose();
        } catch (error) {
            console.error("Error saving project details:", error);
            // Handle error (e.g., show a message to the user)
        } finally {
            setIsSaving(false); // Stop loading
        }
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
                                <window.ImageComponent src={coverImageUrl} alt="Project Cover Preview" className="max-w-full h-auto rounded-lg mx-auto" style={{ maxHeight: '150px', objectFit: 'cover' }} />
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
                    <button onClick={handleSave} disabled={isSaving} className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                        {isSaving ? <window.LoadingSpinner isButton={true} /> : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};
