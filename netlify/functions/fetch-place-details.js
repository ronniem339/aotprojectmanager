// In netlify/functions/fetch-place-details.js

const fetch = require('node-fetch');

exports.handler = async (event) => {
    const { place_id } = event.queryStringParameters;
    const apiKey = process.env.Maps_API_KEY;

    if (!place_id) {
        return { statusCode: 400, body: 'Missing place_id parameter' };
    }

    if (!apiKey) {
        return { statusCode: 500, body: 'API key not configured on the server.' };
    }

    const url = `https://places.googleapis.com/v1/places/${place_id}`;

    const headers = {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        // THE FIX: Changed 'website' to the correct v1 field name 'websiteUri'.
        'X-Goog-FieldMask': 'displayName,editorialSummary,photos,rating,websiteUri'
    };

    try {
        const response = await fetch(url, { method: 'GET', headers: headers });
        const data = await response.json();
        
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

        // Create a new object to match the structure our front-end expects.
        const result = {
            name: data.displayName,
            editorial_summary: data.editorialSummary,
            photos: data.photos,
            rating: data.rating,
            // THE FIX: Map the correct source field 'websiteUri' to the 'website' field for the client.
            website: data.websiteUri 
        };
        
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
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
