// File: netlify/functions/fetch-place-details.js

const fetch = require('node-fetch');

exports.handler = async (event) => {
  const { place_id } = event.queryStringParameters;

  // Securely access your API key from a Netlify environment variable
  const apiKey = process.env.VITE_Maps_API_KEY;

  if (!place_id) {
    return { statusCode: 400, body: 'Missing place_id parameter' };
  }

  if (!apiKey) {
    return { statusCode: 500, body: 'API key not configured on the server.' };
  }

  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=<span class="math-inline">\{place\_id\}&fields\=name,editorial\_summary,photos&key\=</span>{apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch place details' }),
    };
  }
};
