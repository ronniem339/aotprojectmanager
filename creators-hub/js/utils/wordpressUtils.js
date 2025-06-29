// js/utils/wordpressUtils.js

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
    //... (existing function code is unchanged)
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
    //... (existing function code is unchanged)
    const { url, username, applicationPassword } = wordpressConfig;
    const cleanedUrl = url.replace(/\/+$/, '');
    const token = btoa(`${username}:${applicationPassword}`);
    const headers = { 'Authorization': `Basic ${token}`, 'Content-Type': 'application/json' };
    const tagsListEndpoint = `${cleanedUrl}/wp-json/wp/v2/tags?per_page=100`;
    const tagsCreateEndpoint = `${cleanedUrl}/wp-json/wp/v2/tags`;
    let existingTags = [];
    try {
        const response = await fetch(tagsListEndpoint, { headers });
        existingTags = await response.json();
        if (!response.ok) existingTags = [];
    } catch (e) {
        console.warn("Could not fetch existing tags, may need to create all.", e);
    }
    const existingTagMap = new Map(existingTags.map(tag => [tag.name.toLowerCase(), tag.id]));
    const tagIds = [];
    const tagsToCreate = [];
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
 * A wrapper that first publishes a post to WordPress and saves to Firestore.
 */
async function publishPostAndSaveToDb(postData, extraDataForDb, wordpressConfig, firestoreDb, currentUser) {
    //... (existing function code is unchanged)
    const newWpPost = await postToWordPress(postData, wordpressConfig);
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
        console.error(`CRITICAL: Post ${newWpPost.id} was published to WordPress but FAILED to save to Firestore.`, firestoreError);
    }
    return newWpPost;
}

/**
 * NEW, SIMPLIFIED IMPORTER FUNCTION
 * Fetches all posts from a WordPress site and saves them to Firestore.
 * This is designed to be called directly from a UI component's event handler.
 * @param {object} args - The arguments for the function.
 * @param {object} args.db - The Firestore database instance.
 * @param {object} args.user - The currently authenticated user.
 * @param {object} args.wordpressConfig - The WordPress connection settings.
 * @param {function} args.onProgress - A callback function to report progress messages.
 * @returns {Promise<number>} A promise that resolves with the total number of imported posts.
 */
async function importAllWordPressPosts({ db, user, wordpressConfig, onProgress }) {
    const { url, username, applicationPassword } = wordpressConfig;
    if (!url || !username || !applicationPassword) {
        throw new Error('WordPress settings are not fully configured.');
    }

    const appId = typeof window.__app_id !== 'undefined' ? window.__app_id : 'default-app-id';
    const blogPostsCollectionRef = db.collection('artifacts').doc(appId).collection('users').doc(user.uid).collection('blogPosts');

    let page = 1;
    let totalPostsImported = 0;
    let hasMorePosts = true;

    while (hasMorePosts) {
        onProgress(`Fetching page ${page} of posts...`);
        const response = await fetch(`/.netlify/functions/fetch-wp-posts?url=${encodeURIComponent(url)}&user=${encodeURIComponent(username)}&pass=${encodeURIComponent(applicationPassword)}&page=${page}`);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to fetch posts. Status: ${response.status}. Message: ${errorData.message || 'Check Netlify function logs.'}`);
        }

        const posts = await response.json();

        if (posts.length === 0) {
            hasMorePosts = false;
            continue;
        }

        const batch = db.batch();
        posts.forEach(post => {
            const postRef = blogPostsCollectionRef.doc(post.id.toString());
            const postData = {
                title: post.title.rendered,
                content: post.content.rendered,
                status: post.status,
                location: '',
                postType: 'wordpress-import',
                wordPressId: post.id,
                url: post.link,
                createdAt: post.date_gmt + 'Z',
                userId: user.uid
            };
            batch.set(postRef, postData);
        });

        await batch.commit();
        totalPostsImported += posts.length;
        onProgress(`${totalPostsImported} posts imported successfully.`);
        page++;
    }

    return totalPostsImported;
}

// Add all functions to the global utility object
window.wordpressUtils = {
    postToWordPress,
    getWordPressCategories,
    getAndCreateTags,
    publishPostAndSaveToDb,
    importAllWordPressPosts, // Add the new function here
};

