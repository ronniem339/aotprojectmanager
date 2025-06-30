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
 * Utility function to find the most specific location from a list of tags.
 */
function getMostSpecificLocation(postTags, locationTagMap) {
    // Defines the hierarchy of location types, from most to least specific.
    const locationHierarchy = [
        'point_of_interest', 
        'premise', 
        'subpremise', 
        'locality', // e.g., city
        'administrative_area_level_3',
        'administrative_area_level_2',
        'administrative_area_level_1', // e.g., state/province
        'country'
    ];

    let mostSpecificLocation = '';
    let lowestRank = Infinity; // Lower rank is more specific

    for (const tagName of postTags) {
        const locationInfo = locationTagMap[tagName.toLowerCase()]; // Use lowercase for matching
        if (locationInfo) {
            for (const type of locationInfo.types) {
                const rank = locationHierarchy.indexOf(type);
                if (rank !== -1 && rank < lowestRank) {
                    lowestRank = rank;
                    mostSpecificLocation = locationInfo.formatted_address;
                }
            }
        }
    }
    return mostSpecificLocation;
}


/**
 * CORRECTED IMPORTER FUNCTION
 * Fetches all posts from WordPress, using a geocoded map of tags to determine the most specific location for each post.
 */
async function importAllWordPressPosts({ db, user, wordpressConfig, onProgress, locationTagMap }) {
    const { url, username, applicationPassword } = wordpressConfig;
    if (!url || !username || !applicationPassword) {
        throw new Error('WordPress settings are not fully configured.');
    }
    if (!locationTagMap) {
        throw new Error('Location tag map is required for import.');
    }

    const appId = window.CREATOR_HUB_CONFIG.APP_ID;
    const blogPostsCollectionRef = db.collection('artifacts').doc(appId).collection('users').doc(user.uid).collection('blogPosts');

    onProgress('Checking for already imported posts...');
    const existingPostIds = new Set();
    const q = blogPostsCollectionRef.where("postType", "==", "wordpress-import");
    const querySnapshot = await q.get();
    querySnapshot.forEach(doc => {
        const data = doc.data();
        if (data.wordPressId) {
            existingPostIds.add(data.wordPressId);
        }
    });
    onProgress(`Found ${existingPostIds.size} existing posts. New content will be added/updated.`);

    let page = 1;
    let totalPostsImportedThisSession = 0;
    let hasMorePosts = true;

    while (hasMorePosts) {
        onProgress(`Fetching page ${page} of posts...`);
        const response = await fetch(`/.netlify/functions/fetch-wp-posts?url=${encodeURIComponent(url)}&user=${encodeURIComponent(username)}&pass=${encodeURIComponent(applicationPassword)}&page=${page}`);

        if (!response.ok) {
            const errorBody = await response.text(); 
            let errorMessage = `Failed to fetch posts. Status: ${response.status}.`;
            let isPaginationError = false;

            try {
                const errorData = JSON.parse(errorBody);
                errorMessage += ` Message: ${errorData.message || 'Check Netlify function logs.'}`;
                if (errorData.code === 'rest_post_invalid_page_number') {
                    isPaginationError = true;
                }
            } catch (e) {
                if (errorBody.includes('rest_post_invalid_page_number')) {
                    isPaginationError = true;
                }
            }

            if (isPaginationError) {
                hasMorePosts = false;
                continue;
            } else {
                throw new Error(errorMessage);
            }
        }

        const posts = await response.json();

        if (posts.length === 0) {
            hasMorePosts = false;
            continue;
        }
        
        onProgress(`Fetched ${posts.length} posts from page ${page}. Processing...`);
        
        const batchSize = 20;
        let currentBatch = db.batch();
        let batchCount = 0;
        
        for (const post of posts) {
            const postRef = blogPostsCollectionRef.doc(post.id.toString());
            
            const terms = post._embedded['wp:term'] || [];
            const postCategories = (terms[0] || []).map(cat => cat.name);
            const postTags = (terms[1] || []).map(tag => tag.name);

            // Determine location from tags using the new logic
            const location = getMostSpecificLocation(postTags, locationTagMap);

            const postData = {
                title: post.title.rendered,
                content: post.content.rendered,
                status: post.status,
                location: location,
                location_lowercase: location.toLowerCase(),
                categories: postCategories.map(c => c.toLowerCase()), // Save categories separately
                tags: postTags.map(t => t.toLowerCase()),
                postType: 'wordpress-import',
                wordPressId: post.id,
                url: post.link,
                createdAt: window.firebase.firestore.Timestamp.fromDate(new Date(post.date_gmt)),
                userId: user.uid
            };

            currentBatch.set(postRef, postData, { merge: true });
            batchCount++;

            if (batchCount === batchSize) {
                await currentBatch.commit();
                currentBatch = db.batch(); 
                batchCount = 0;
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        if (batchCount > 0) {
            await currentBatch.commit();
        }

        totalPostsImportedThisSession += posts.length;
        onProgress(`Successfully processed ${posts.length} posts from page ${page}.`);
        page++;
    }

    onProgress(`Import complete. Processed ${totalPostsImportedThisSession} posts this session.`);
    return totalPostsImportedThisSession;
}


// Add all functions to the global utility object
window.wordpressUtils = {
    postToWordPress,
    getWordPressCategories,
    getAndCreateTags,
    publishPostAndSaveToDb,
    deduplicateWordPressPosts,
    importAllWordPressPosts, 
};