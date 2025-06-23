// creators-hub/js/utils/imageUploadUtils.js

const uploadUtils = {
    /**
     * Downloads an image from a given URL (can be external or a data URL)
     * and uploads it to Firebase Storage. Handles Base64 decoding if necessary.
     * @param {string} imageUrl - The URL of the image to download.
     * @param {string} storageFolderPath - The specific folder path within Firebase Storage (e.g., 'project_thumbnails' or 'video_thumbnails/projectID').
     * @param {string} filePrefix - A prefix for the filename (e.g., projectID_ or videoID_).
     * @param {firebase.storage.Storage} storageInstance - The Firebase Storage instance.
     * @returns {Promise<string>} - A promise that resolves with the Firebase Storage URL, or an empty string on error.
     */
    downloadAndUploadImage: async (imageUrl, storageFolderPath, filePrefix, storageInstance) => {
        if (!imageUrl || !storageInstance) {
            console.warn("No image URL or Firebase Storage instance available for download and upload.");
            return '';
        }
        // If imageUrl is already a Firebase Storage URL, no need to re-download and re-upload.
        // This prevents infinite loops with auto-save if the URL is already processed.
        if (imageUrl.includes('firebasestorage.googleapis.com')) {
            return imageUrl;
        }

        const fileExtensionMatch = imageUrl.match(/\.(jpg|jpeg|png|gif|webp)/i);
        const fileExtension = fileExtensionMatch ? fileExtensionMatch[0] : '.jpg'; // Default if no extension found
        const path = `${storageFolderPath}/${filePrefix}${Date.now()}${fileExtension}`; // Dynamic path

        const fetchUrl = `/.netlify/functions/fetch-image?url=${encodeURIComponent(imageUrl)}`;
        try {
            const response = await fetch(fetchUrl);
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Netlify function fetch-image error: ${response.status} ${errorText}`);
                throw new Error(`Failed to fetch image via Netlify function: ${errorText}`);
            }

            const base64Image = await response.text();
            const contentType = response.headers.get('content-type') || 'image/jpeg';
            const base64Response = await fetch(`data:${contentType};base64,${base64Image}`);
            const blob = await base64Response.blob();

            const storageRef = storageInstance.ref(path);
            await storageRef.put(blob);
            return await storageRef.getDownloadURL();
        } catch (error) {
            console.error(`Error downloading or uploading image from ${imageUrl} to ${path}:`, error);
            return '';
        }
    },

    /**
     * Uploads a file (e.g., from a file input) directly to Firebase Storage.
     * @param {File} file - The File object to upload.
     * @param {string} storageFolderPath - The specific folder path within Firebase Storage (e.g., 'project_thumbnails' or 'video_thumbnails/projectID').
     * @param {string} filePrefix - A prefix for the filename (e.g., projectID_ or videoID_).
     * @param {firebase.storage.Storage} storageInstance - The Firebase Storage instance.
     * @returns {Promise<string>} - A promise that resolves with the Firebase Storage URL, or an empty string on error.
     */
    uploadFile: async (file, storageFolderPath, filePrefix, storageInstance) => {
        if (!file || !storageInstance) {
            console.warn("No file or Firebase Storage instance available for upload.");
            return '';
        }
        try {
            const path = `${storageFolderPath}/${filePrefix}${Date.now()}_${file.name}`; // Dynamic path
            const storageRef = storageInstance.ref(path);
            await storageRef.put(file);
            return await storageRef.getDownloadURL();
        } catch (error) {
            console.error(`Error uploading file ${file.name} to ${path}:`, error);
            return '';
        }
    }
};

window.uploadUtils = uploadUtils; // Expose to global scope if needed, or use ES module export/import
