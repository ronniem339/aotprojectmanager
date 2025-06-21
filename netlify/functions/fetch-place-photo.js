// In netlify/functions/fetch-place-photo.js

const fetch = require('node-fetch');

exports.handler = async (event) => {
    const { photoName } = event.queryStringParameters;
    const apiKey = process.env.GOOGLEAPIKEY; // Using the key without underscores

    if (!photoName) {
        return { statusCode: 400, body: 'Missing photoName parameter' };
    }

    if (!apiKey) {
        return { statusCode: 500, body: 'API key not configured on the server.' };
    }

    // --- NEW URL for the "Places API (New)" Photos ---
    const url = `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=400&key=${apiKey}`;

    try {
        const response = await fetch(url);
        const imageBuffer = await response.buffer();
        return {
            statusCode: 200,
            headers: { 'Content-Type': response.headers.get('content-type') },
            body: imageBuffer.toString('base64'),
            isBase64Encoded: true,
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to fetch photo' }),
        };
    }
};
