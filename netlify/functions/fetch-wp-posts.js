// netlify/functions/fetch-wp-posts.js
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    const { url, user, pass, page = 1 } = event.queryStringParameters;

    if (!url || !user || !pass) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Missing required parameters: url, user, pass' }),
        };
    }

    const apiUrl = `${url}/wp-json/wp/v2/posts?per_page=50&page=${page}&_embed`;
    const credentials = Buffer.from(`${user}:${pass}`).toString('base64');

    try {
        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `Basic ${credentials}`,
            },
        });

        if (!response.ok) {
            // Forward the error from the WordPress API
            const errorBody = await response.text();
            return {
                statusCode: response.status,
                body: errorBody,
            };
        }

        const data = await response.json();
        return {
            statusCode: 200,
            body: JSON.stringify(data),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to fetch from WordPress API.', error: error.message }),
        };
    }
};