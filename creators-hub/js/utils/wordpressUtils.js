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
    const tagsEndpoint = `${cleanedUrl}/wp-json/wp/v2/tags?per_page=100`;
    let existingTags = [];
    try {
        const response = await fetch(tagsEndpoint, { headers });
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
        // Ensure the tag name is not null, empty, or just whitespace
        if (tagName && tagName.trim() !== '') {
            const cleanTagName = tagName.trim();
            const lowerCaseTag = cleanTagName.toLowerCase();

            if (existingTagMap.has(lowerCaseTag)) {
                // Add existing tag ID if not already in the list
                if (!tagIds.includes(existingTagMap.get(lowerCaseTag))) {
                    tagIds.push(existingTagMap.get(lowerCaseTag));
                }
            } else {
                // Add new, unique tag to the creation list
                if (!tagsToCreate.map(t => t.toLowerCase()).includes(lowerCaseTag)) {
                   tagsToCreate.push(cleanTagName);
                }
            }
        }
    }

    // 3. Create new tags in parallel
    if (tagsToCreate.length > 0) {
        const createTagPromises = tagsToCreate.map(tagName => {
            return fetch(tagsEndpoint, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({ name: tagName })
            }).then(res => {
                // Add more detailed error handling inside the promise
                if (!res.ok) {
                    return res.json().then(err => {
                        // This error is okay; it means the tag already exists. We can grab its ID.
                        if (err.code === 'term_exists' && err.data?.term_id) {
                            return { id: err.data.term_id };
                        }
                        // Log other errors but don't crash the entire process
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
                // Only add tags that were successfully created and have an ID
                if (newTag && newTag.id) {
                    tagIds.push(newTag.id);
                }
            });
        } catch (error) {
            console.error("Error processing tag creation promises in WordPress:", error);
        }
    }

    // Return a unique set of tag IDs to prevent duplicates
    return [...new Set(tagIds)];
}


window.wordpressUtils = {
    postToWordPress,
    getWordPressCategories,
    getAndCreateTags,
};
