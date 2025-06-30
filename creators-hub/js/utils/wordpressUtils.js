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
        console.error(`CRITICAL: Post ${newWpPost.id} was published to WordPress but FAILED to save to Firestore. Manual sync may be needed.`, firestoreError);
    }
    
    return newWpPost;
}

/**
 * NEW UTILITY FUNCTION
 * Finds and removes duplicate WordPress posts from the Firestore database.
 * It groups posts by their original 'wordPressId' and keeps only the oldest entry.
 */
async function deduplicateWordPressPosts({ db, user, onProgress }) {
    const appId = typeof window.__app_id !== 'undefined' ? window.__app_id : 'default-app-id';
    // CORRECTED: Use the v8-compatible syntax db.collection(...).where(...)
    const collectionRef = db.collection('artifacts').doc(appId).collection('users').doc(user.uid).collection('blogPosts');

    onProgress('Fetching all imported posts to check for duplicates...');
    const q = collectionRef.where("postType", "==", "wordpress-import");
    // CORRECTED: Use .get() to execute the query
    const snapshot = await q.get();

    if (snapshot.empty) {
        onProgress('No WordPress posts found to check.');
        return { checked: 0, removed: 0 };
    }

    onProgress(`Found ${snapshot.docs.length} total posts. Analyzing...`);

    // Group documents by wordPressId
    const postsByWpId = new Map();
    snapshot.forEach(doc => {
        const data = doc.data();
        const wpId = data.wordPressId;
        if (!wpId) return;

        if (!postsByWpId.has(wpId)) {
            postsByWpId.set(wpId, []);
        }
        // Store the full document reference and its creation date
        postsByWpId.get(wpId).push({ ref: doc.ref, createdAt: data.createdAt });
    });

    // CORRECTED: Use db.batch()
    const batch = db.batch();
    let duplicatesFound = 0;
    
    onProgress('Searching for duplicates...');
    for (const [wpId, docs] of postsByWpId.entries()) {
        if (docs.length > 1) {
            // Sort by creation date to ensure we keep the oldest one
            docs.sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis());
            
            // Keep the first one (the original)
            docs.shift(); 
            
            // The rest are duplicates, add their deletion to the batch
            docs.forEach(dup => {
                batch.delete(dup.ref);
                duplicatesFound++;
            });
        }
    }

    if (duplicatesFound > 0) {
        onProgress(`Found ${duplicatesFound} duplicate(s). Removing now...`);
        // CORRECTED: Use batch.commit()
        await batch.commit();
        onProgress(`Successfully removed ${duplicatesFound} duplicate posts.`);
    } else {
        onProgress('No duplicates found.');
    }

    return { checked: postsByWpId.size, removed: duplicatesFound };
}


/**
 * CORRECTED IMPORTER FUNCTION
 * Fetches all posts from WordPress, checks for duplicates, and saves only new ones to Firestore.
 * This function is now idempotent and can be safely re-run.
 */
async function importAllWordPressPosts({ db, user, wordpressConfig, onProgress, categoryMap, tagMap }) {
    const { url, username, applicationPassword } = wordpressConfig;
    if (!url || !username || !applicationPassword) {
        throw new Error('WordPress settings are not fully configured.');
    }

    const appId = window.CREATOR_HUB_CONFIG.APP_ID;
    console.log("importAllWordPressPosts: Using appId", appId);
    const blogPostsCollectionRef = db.collection('artifacts').doc(appId).collection('users').doc(user.uid).collection('blogPosts');

    onProgress('Checking for already imported posts...');
    const existingPostIds = new Set();
    const q = blogPostsCollectionRef.where("postType", "==", "wordpress-import");
    const querySnapshot = await q.get();
    console.log(`importAllWordPressPosts: Query for existing posts returned ${querySnapshot.size} documents.`);
    querySnapshot.forEach(doc => {
        const data = doc.data();
        if (data.wordPressId) {
            existingPostIds.add(data.wordPressId);
            console.log(`importAllWordPressPosts: Added existing wordPressId: ${data.wordPressId}`);
        }
    });
    console.log(`importAllWordPressPosts: Final existingPostIds set:`, existingPostIds);
    onProgress(`Found ${existingPostIds.size} existing posts. New content will be added.`);

    let page = 1;
    let totalPostsImportedThisSession = 0;
    let hasMorePosts = true;

    while (hasMorePosts) {
        onProgress(`Fetching page ${page} of posts...`);
        const response = await fetch(`/.netlify/functions/fetch-wp-posts?url=${encodeURIComponent(url)}&user=${encodeURIComponent(username)}&pass=${encodeURIComponent(applicationPassword)}&page=${page}`);

        if (!response.ok) {
            const errorBody = await response.text(); // Get raw text to check for specific message
            let errorMessage = `Failed to fetch posts. Status: ${response.status}.`;
            let isPaginationError = false;

            try {
                const errorData = JSON.parse(errorBody);
                errorMessage += ` Message: ${errorData.message || 'Check Netlify function logs.'}`;
                if (errorData.message && errorData.message.includes('page number requested is larger than the number of pages available')) {
                    isPaginationError = true;
                }
            } catch (e) {
                // If parsing as JSON fails, it's likely a plain text error or malformed JSON
                errorMessage += ` Raw response: ${errorBody}`;
                if (errorBody.includes('page number requested is larger than the number of pages available')) {
                    isPaginationError = true;
                }
            }

            if (response.status === 400 && isPaginationError) {
                console.warn(`WordPress import: Reached end of posts on page ${page}. Stopping import.`);
                hasMorePosts = false;
                continue; // Exit the current iteration and the while loop
            } else {
                throw new Error(errorMessage);
            }
        }

        const posts = await response.json();
        console.log(`Fetched ${posts.length} posts from page ${page}:`, posts);

        if (posts.length === 0) {
            hasMorePosts = false;
            continue;
        }
        
        onProgress(`Fetched ${posts.length} posts from page ${page}. Checking for new content...`);
        
        const batchSize = 20; // Reduced batch size to prevent resource exhaustion
        let currentBatch = db.batch();
        let batchCount = 0;
        let postsProcessedInSession = 0;
        
        for (const post of posts) {
            const postRef = blogPostsCollectionRef.doc(post.id.toString());

            // Derive location and tags here, directly within the import function
            const postCategoryIds = post.categories || [];
            const location = postCategoryIds.length > 0 ? categoryMap.get(postCategoryIds[0]) || '' : '';
            const postTagIds = post.tags || [];
            const postTags = postTagIds.map(tagId => tagMap.get(tagId)).filter(Boolean).map(tag => tag.toLowerCase());

            const postData = {
                title: post.title.rendered,
                content: post.content.rendered,
                status: post.status,
                location: location,
                location_lowercase: location.toLowerCase(),
                tags: postTags,
                postType: 'wordpress-import',
                wordPressId: post.id,
                url: post.link,
                createdAt: window.firebase.firestore.Timestamp.fromDate(new Date(post.date_gmt)),
                userId: user.uid
            };
            console.log("Prepared postData for Firebase:", postData);
            console.log("Batch setting document:", postRef.path, "with data:", postData);

            currentBatch.set(postRef, postData, { merge: true });
            batchCount++;
            postsProcessedInSession++;

            if (batchCount === batchSize) {
                onProgress(`Committing batch of ${batchCount} posts...`);
                await currentBatch.commit().then(() => {
                    console.log(`Batch of ${batchCount} posts committed successfully.`);
                }).catch(error => {
                    console.error(`Error committing batch:`, error);
                });
                currentBatch = db.batch(); // Start a new batch
                batchCount = 0;
                // Introduce a small delay to prevent resource exhaustion
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        // Commit any remaining documents in the last batch
        if (batchCount > 0) {
            onProgress(`Committing final batch of ${batchCount} posts...`);
            await currentBatch.commit().then(() => {
                console.log(`Final batch of ${batchCount} posts committed successfully.`);
            }).catch(error => {
                console.error(`Error committing final batch:`, error);
            });
            // Introduce a small delay after the final batch as well
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        totalPostsImportedThisSession += postsProcessedInSession;
        onProgress(`Successfully processed ${postsProcessedInSession} posts from page ${page}.`);
    }

    onProgress(`Import complete. Added ${totalPostsImportedThisSession} new posts this session.`);
    return totalPostsImportedThisSession;
}


// Add all functions to the global utility object, including the new ones.
window.wordpressUtils = {
    postToWordPress,
    getWordPressCategories,
    getAndCreateTags,
    publishPostAndSaveToDb,
    deduplicateWordPressPosts, // The new cleanup tool
    importAllWordPressPosts, 
};
