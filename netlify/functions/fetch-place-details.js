// In netlify/functions/fetch-place-details.js

const fetch = require('node-fetch');

exports.handler = async (event) => {
    const { place_id } = event.queryStringParameters;
    // Use the correct environment variable name provided.
    const apiKey = process.env.VITE_Maps_API_KEY;

    if (!place_id) {
        return { statusCode: 400, body: 'Missing place_id parameter' };
    }

    if (!apiKey) {
        return { statusCode: 500, body: 'API key not configured on the server.' };
    }

    // --- URL for the "Places API (v1)" ---
    const url = `https://places.googleapis.com/v1/places/${place_id}`;

    // --- Headers are required to specify which fields you want ---
    const headers = {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        // Requesting displayName, editorialSummary, and photos
        // MODIFICATION: Added 'rating' and 'website' to the field mask for more robust data.
        'X-Goog-FieldMask': 'displayName,editorialSummary,photos,rating,website'
    };

    try {
        const response = await fetch(url, { method: 'GET', headers: headers });
        const data = await response.json();
        
        // Handle API errors from Google gracefully
        if (data.error) {
            console.error("Google Places API Error:", data.error);
            return {
                statusCode: data.error.code || 500,
                body: JSON.stringify({ 
                    error: `Google API Error: ${data.error.message}`, 
                    status: data.error.status 
                }),
            };
        }

        // The new API nests the summary differently and uses different names.
        // We create a new object to match the structure our front-end expects.
        const result = {
            name: data.displayName,
            editorial_summary: data.editorialSummary, // This can still be undefined
            photos: data.photos,
            rating: data.rating,
            website: data.website
        };
        
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            // THE FIX: Nest the result inside a "details" object to match the front-end.
            body: JSON.stringify({ details: result, status: "OK" }),
        };
        
    } catch (error) {
        console.error("Error fetching from Google Places API:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to fetch place details', details: error.message }),
        };
    }
};
