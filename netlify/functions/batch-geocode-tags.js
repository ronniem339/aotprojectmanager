// netlify/functions/batch-geocode-tags.js
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    const { tags, apiKey } = event.queryStringParameters;

    if (!tags || !apiKey) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Missing required parameters: tags, apiKey' }),
        };
    }

    const tagList = decodeURIComponent(tags).split(',');
    if (tagList.length === 0) {
        return {
            statusCode: 200,
            body: JSON.stringify({}),
        };
    }

    const geocodePromises = tagList.map(tag => {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(tag)}&key=${apiKey}`;
        return fetch(url)
            .then(res => res.json())
            .then(data => ({ tag, data }));
    });

    try {
        const results = await Promise.all(geocodePromises);
        const locationTagMap = {};

        for (const result of results) {
            if (result.data.status === 'OK' && result.data.results.length > 0) {
                locationTagMap[result.tag] = {
                    types: result.data.results[0].types,
                    formatted_address: result.data.results[0].formatted_address,
                };
            }
        }

        return {
            statusCode: 200,
            body: JSON.stringify(locationTagMap),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to geocode tags.', error: error.message }),
        };
    }
};