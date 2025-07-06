// In netlify/functions/fetch-place-details.js

const fetch = require('node-fetch');

exports.handler = async (event) => {
    const { place_id } = event.queryStringParameters;
    // MODIFICATION: Use the correct environment variable name provided.
    const apiKey = process.env.VITE_Maps_API_KEY;

    if (!place_id) {
        return { statusCode: 400, body: 'Missing place_id parameter' };
    }

    if (!apiKey) {
        // This error will now correctly trigger only if the VITE_Maps_API_KEY is truly missing.
        return { statusCode: 500, body: 'API key not configured on the server.' };
    }

    // --- NEW URL for the "Places API (New)" ---
    const url = `https://places.googleapis.com/v1/places/${place_id}`;

    // --- NEW: Headers are required to specify which fields you want ---
    const headers = {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        // Requesting displayName, editorialSummary, and photos
        'X-Goog-FieldMask': 'displayName,editorialSummary,photos' 
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
            // Re-nesting to match the old structure for our front-end
            body: JSON.stringify({ result: result }), 
        };
    } catch (error) {
        console.error("Error fetching from Google Places API:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to fetch place details', details: error.message }),
        };
    }
};
