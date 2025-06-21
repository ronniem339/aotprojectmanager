// In netlify/functions/fetch-place-details.js

const fetch = require('node-fetch');

exports.handler = async (event) => {
    const { place_id } = event.queryStringParameters;
    const apiKey = process.env.GOOGLEAPIKEY; // Using the key without underscores as a test

    if (!place_id) {
        return { statusCode: 400, body: 'Missing place_id parameter' };
    }

    if (!apiKey) {
        return { statusCode: 500, body: 'API key not configured on the server.' };
    }

    // --- NEW URL for the "Places API (New)" ---
    const url = `https://places.googleapis.com/v1/places/${place_id}`;

    // --- NEW: Headers are required to specify which fields you want ---
    const headers = {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'displayName,editorialSummary,photos' // Corresponds to name, editorial_summary, and photos
    };

    try {
        const response = await fetch(url, { method: 'GET', headers: headers });
        const data = await response.json();

        // The new API nests the summary differently
        const result = {
            name: data.displayName,
            editorial_summary: data.editorialSummary,
            photos: data.photos
        };

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ result: result }), // Re-nesting to match the old structure for our front-end
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to fetch place details' }),
        };
    }
};
