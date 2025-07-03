// netlify/functions/fetch-wp-tags.js
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    const { url, user, pass } = event.queryStringParameters;

    if (!url || !user || !pass) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Missing required parameters: url, user, pass' }),
        };
    }

    // Fetch up to 100 tags. 
    const apiUrl = `${url}/wp-json/wp/v2/tags?per_page=100&_fields=id,name`;
    const credentials = Buffer.from(`${user}:${pass}`).toString('base64');

    try {
        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `Basic ${credentials}`,
            },
        });

        if (!response.ok) {
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
            body: JSON.stringify({ message: 'Failed to fetch tags from WordPress API.', error: error.message }),
        };
    }
};
