// creators-hub/js/utils/wordpressUtils.js

/**
 * Posts a blog post to a WordPress site using the REST API.
 */
async function postToWordPress(postData, wordpressConfig) {
    const { title, htmlContent, excerpt, categoryId, tags } = postData;
    const { url, username, applicationPassword } = wordpressConfig;
    const cleanedUrl = url.replace(/\/+$/, '');
    const endpoint = `${cleanedUrl}/wp-json/wp/v2/posts`;
    const token = btoa(`${username}:${applicationPassword}`);
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${token}`
    };

    const body = JSON.stringify({
        title: title,
        content: htmlContent,
        excerpt: excerpt,
        status: 'draft',
        categories: categoryId ? [categoryId] : [],
        tags: tags || []
    });

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: headers,
            body: body
        });
        const responseData = await response.json();
        if (!response.ok) {
            console.error('WordPress API Error Response:', responseData);
            throw new Error(`WordPress API Error: ${responseData.message || response.statusText}`);
        }
        return responseData;
    } catch (error) {
        console.error('Failed to post to WordPress:', error);
        throw error;
    }
}

/**
 * Fetches categories from a WordPress site.
 */
async function getWordPressCategories(wordpressConfig) {
    const { url, username, applicationPassword } = wordpressConfig;
    if (!url || !username || !applicationPassword) {
        throw new Error('WordPress settings are not fully configured.');
    }
    const cleanedUrl = url.replace(/\/+$/, '');
    const endpoint = `${cleanedUrl}/wp-json/wp/v2/categories?per_page=100`;
    const token = btoa(`${username}:${applicationPassword}`);
    const headers = { 'Authorization': `Basic ${token}` };

    try {
        const response = await fetch(endpoint, { headers });
        const responseData = await response.json();
        if (!response.ok) {
            console.error('WordPress API Error Response:', responseData);
            throw new Error(`Failed to fetch categories: ${responseData.message || response.statusText}`);
        }
        return responseData.filter(cat => cat.slug !== 'uncategorized');
    } catch (error) {
        console.error('Error fetching WordPress categories:', error);
        throw error;
    }
}

/**
 * Fetches existing tags, creates new ones if needed, and returns their IDs.
 */
async function getAndCreateTags(tagNames, wordpressConfig) {
    const { url, username, applicationPassword } = wordpressConfig;
    const cleanedUrl = url.replace(/\/+$/, '');
    const token = btoa(`${username}:${applicationPassword}`);
    const headers = { 'Authorization': `Basic ${token}`, 'Content-Type': 'application/json' };

    // 1. Fetch all existing tags
    const tagsListEndpoint = `${cleanedUrl}/wp-json/wp/v2/tags?per_page=100`;
    const tagsCreateEndpoint = `${cleanedUrl}/wp-json/wp/v2/tags`;
    let existingTags = [];
    try {
        const response = await fetch(tagsListEndpoint, { headers });
        existingTags = await response.json();
        if (!response.ok) existingTags = []; // Handle case where tags might not be enabled or user lacks permissions
    } catch (e) {
        console.warn("Could not fetch existing tags, may need to create all.", e);
    }

    const existingTagMap = new Map(existingTags.map(tag => [tag.name.toLowerCase(), tag.id]));
    const tagIds = [];
    const tagsToCreate = [];

    // 2. Identify which tags need to be created, ensuring they are valid
    for (const tagName of tagNames) {
        if (tagName && tagName.trim() !== '') {
            const cleanTagName = tagName.trim();
            const lowerCaseTag = cleanTagName.toLowerCase();

            if (existingTagMap.has(lowerCaseTag)) {
                if (!tagIds.includes(existingTagMap.get(lowerCaseTag))) {
                    tagIds.push(existingTagMap.get(lowerCaseTag));
                }
            } else {
                if (!tagsToCreate.map(t => t.toLowerCase()).includes(lowerCaseTag)) {
                   tagsToCreate.push(cleanTagName);
                }
            }
        }
    }

    // 3. Create new tags in parallel
    if (tagsToCreate.length > 0) {
        const createTagPromises = tagsToCreate.map(tagName => {
            return fetch(tagsCreateEndpoint, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({ name: tagName })
            }).then(res => {
                if (!res.ok) {
                    return res.json().then(err => {
                        if (err.code === 'term_exists' && err.data?.term_id) {
                            return { id: err.data.term_id };
                        }
                        console.error(`Failed to create tag "${tagName}":`, err.message || 'Unknown error');
                        return { error: true, message: err.message };
                    });
                }
                return res.json();
            });
        });

        try {
            const newTags = await Promise.all(createTagPromises);
            newTags.forEach(newTag => {
                if (newTag && newTag.id) {
                    tagIds.push(newTag.id);
                }
            });
        } catch (error) {
            console.error("Error processing tag creation promises in WordPress:", error);
        }
    }

    return [...new Set(tagIds)];
}

/**
 * NEW FUNCTION
 * A wrapper that first publishes a post to WordPress using the existing function,
 * and upon success, saves the post's data to the Firestore database.
 * @param {object} postData - The post object (title, htmlContent, etc.) for WordPress.
 * @param {object} extraDataForDb - Additional data to save to Firestore (e.g., location, postType).
 * @param {object} wordpressConfig - WP connection settings.
 * @param {object} firestoreDb - The Firestore database instance.
 * @param {object} currentUser - The currently authenticated user object.
 * @returns {Promise<object>} A promise that resolves to the new post data from WordPress.
 */
async function publishPostAndSaveToDb(postData, extraDataForDb, wordpressConfig, firestoreDb, currentUser) {
    // Step 1: Call the existing function to publish to WordPress.
    const newWpPost = await postToWordPress(postData, wordpressConfig);

    // Step 2: If the above call is successful, save the result to Firestore.
    // This part will only run if postToWordPress doesn't throw an error.
    try {
        const appId = typeof window.__app_id !== 'undefined' ? window.__app_id : 'default-app-id';
        const postRef = firestoreDb.collection('artifacts').doc(appId).collection('users').doc(currentUser.uid).collection('blogPosts').doc(newWpPost.id.toString());
        
        const postDataForFirestore = {
            title: newWpPost.title.rendered,
            content: newWpPost.content.rendered,
            status: newWpPost.status,
            location: extraDataForDb.location || '',
            postType: extraDataForDb.postType || 'general',
            wordPressId: newWpPost.id,
            url: newWpPost.link,
            createdAt: newWpPost.date_gmt,
            userId: currentUser.uid,
        };
        
        await postRef.set(postDataForFirestore);
        console.log(`Post ${newWpPost.id} successfully saved to Firestore.`);
    } catch (firestoreError) {
        console.error(`CRITICAL: Post ${newWpPost.id} was published to WordPress but FAILED to save to Firestore. Manual sync may be needed.`, firestoreError);
        // We don't re-throw here because the primary action (WP publish) was successful.
        // The calling function should be notified of the WP success.
    }
    
    // Step 3: Return the original response from WordPress.
    return newWpPost;
}


window.wordpressUtils = {
    postToWordPress,
    getWordPressCategories,
    getAndCreateTags,
    publishPostAndSaveToDb, // Add the new function to the export
};
