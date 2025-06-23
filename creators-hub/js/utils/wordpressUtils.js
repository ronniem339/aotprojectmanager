// creators-hub/js/utils/wordpressUtils.js

/**
 * Posts a blog post to a WordPress site using the REST API.
 *
 * @param {object} postData - The data for the post.
 * @param {string} postData.title - The title of the post.
 * @param {string} postData.htmlContent - The HTML content of the post.
 * @param {string} postData.excerpt - The excerpt for the post.
 * @param {number} postData.categoryId - The ID of the WordPress category.
 * @param {object} wordpressConfig - The WordPress connection settings.
 * @param {string} wordpressConfig.url - The URL of the WordPress site.
 * @param {string} wordpressConfig.username - The WordPress username.
 * @param {string} wordpressConfig.applicationPassword - The WordPress application password.
 * @returns {Promise<object>} - The response from the WordPress API.
 */
async function postToWordPress(postData, wordpressConfig) {
    const { title, htmlContent, excerpt, categoryId } = postData;
    const { url, username, applicationPassword } = wordpressConfig;

    const endpoint = `${url}/wp-json/wp/v2/posts`;
    // The token is a base64 encoding of "username:applicationPassword".
    const token = btoa(`${username}:${applicationPassword}`);

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${token}`
    };

    const body = JSON.stringify({
        title: title,
        content: htmlContent,
        excerpt: excerpt,
        status: 'draft', // Always post as a draft
        categories: categoryId ? [categoryId] : []
    });

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: headers,
            body: body
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('WordPress API Error Response:', errorData);
            throw new Error(`WordPress API Error: ${errorData.message || response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Failed to post to WordPress:', error);
        throw error;
    }
}

/**
 * Fetches categories from a WordPress site.
 *
 * @param {object} wordpressConfig - The WordPress connection settings.
 * @returns {Promise<Array>} - An array of category objects.
 */
async function getWordPressCategories(wordpressConfig) {
    const { url, username, applicationPassword } = wordpressConfig;
    if (!url || !username || !applicationPassword) {
        console.log('WordPress settings not configured for fetching categories.');
        return [];
    }
    const endpoint = `${url}/wp-json/wp/v2/categories?per_page=100`;
    const token = btoa(`${username}:${applicationPassword}`);
    const headers = {
        'Authorization': `Basic ${token}`
    };

    try {
        const response = await fetch(endpoint, { headers });
        if (!response.ok) {
            console.error('Failed to fetch WordPress categories. Status:', response.status);
            return []; // Return empty array on error
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching WordPress categories:', error);
        return []; // Return empty array on error
    }
}

window.wordpressUtils = {
    postToWordPress,
    getWordPressCategories,
};
