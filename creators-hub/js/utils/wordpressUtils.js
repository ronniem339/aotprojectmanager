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

    // **FIX:** Add a strict filter at the beginning to ensure we only work with valid strings.
    const validTagNames = (tagNames || []).filter(tag => typeof tag === 'string' && tag.trim() !== '');
    if (validTagNames.length === 0) {
        return [];
    }

    // 1. Fetch all existing tags
    // FIX: Use separate, correct endpoints for listing and creating tags.
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

    // 2. Identify which tags need to be created
    for (const tagName of validTagNames) { // Use the validated list
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

    // 3. Create new tags in parallel
    if (tagsToCreate.length > 0) {
        const createTagPromises = tagsToCreate.map(tagName => {
            return fetch(tagsCreateEndpoint, { // Use the correct endpoint for creation
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


window.wordpressUtils = {
    postToWordPress,
    getWordPressCategories,
    getAndCreateTags,
};
