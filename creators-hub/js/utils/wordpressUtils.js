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

    const validTagNames = (tagNames || []).filter(tag => typeof tag === 'string' && tag.trim() !== '');
    if (validTagNames.length === 0) {
        return [];
    }

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

    for (const tagName of validTagNames) {
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

    if (tagsToCreate.length > 0) {
        const createTagPromises = tagsToCreate.map(tagName => {
            return fetch(tagsCreateEndpoint, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({ name: tagName })
            }).then(async (res) => { // Made async to allow awaiting inner parsing
                if (!res.ok) {
                    // *** ENHANCED ERROR LOGGING ***
                    console.error(`---WORDPRESS TAG CREATION FAILED---`);
                    console.error(`Tag Name: "${tagName}"`);
                    console.error(`Status: ${res.status} (${res.statusText})`);
                    try {
                        const err = await res.json();
                        console.error('Error Response Body:', err);
                        if (err.code === 'term_exists' && err.data?.term_id) {
                            console.warn(`Tag "${tagName}" already existed. Recovered with ID: ${err.data.term_id}`);
                            return { id: err.data.term_id };
                        }
                        return { error: true, message: err.message || 'Unknown WordPress API error' };
                    } catch (jsonError) {
                        console.error("Could not parse error response as JSON.", jsonError);
                        const textResponse = await res.text().catch(() => "Could not read response text.");
                        console.error("Error Response Text:", textResponse);
                        return { error: true, message: `HTTP error ${res.status}. See console for response text.` };
                    }
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
