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

    // FIX: Trim trailing slashes from the URL to prevent double slashes.
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
        categories: categoryId ? [categoryId] : []
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
 *
 * @param {object} wordpressConfig - The WordPress connection settings.
 * @returns {Promise<Array>} - An array of category objects.
 */
async function getWordPressCategories(wordpressConfig) {
    const { url, username, applicationPassword } = wordpressConfig;
    if (!url || !username || !applicationPassword) {
        throw new Error('WordPress settings are not fully configured.');
    }

    // FIX: Trim trailing slashes from the URL to prevent double slashes.
    const cleanedUrl = url.replace(/\/+$/, '');
    
    const endpoint = `${cleanedUrl}/wp-json/wp/v2/categories?per_page=100`;
    const token = btoa(`${username}:${applicationPassword}`);
    
    const headers = {
        'Authorization': `Basic ${token}`
    };

    try {
        const response = await fetch(endpoint, { headers });
        const responseData = await response.json();
        
        if (!response.ok) {
            console.error('WordPress API Error Response:', responseData);
            throw new Error(`Failed to fetch categories: ${responseData.message || response.statusText}`);
        }
        
        // Filter out "Uncategorized" category if it exists
        return responseData.filter(cat => cat.slug !== 'uncategorized');

    } catch (error) {
        console.error('Error fetching WordPress categories:', error);
        throw error; // Re-throw the error to be handled by the calling component
    }
}

window.wordpressUtils = {
    postToWordPress,
    getWordPressCategories,
};
