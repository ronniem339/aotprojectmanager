// File: netlify/functions/fetch-place-photo.js

const fetch = require('node-fetch');

exports.handler = async (event) => {
  const { photoreference } = event.queryStringParameters;

  // Securely access your API key from the same Netlify environment variable
  const apiKey = process.env.Maps_API_KEY_SERVER;

  if (!photoreference) {
    return { statusCode: 400, body: 'Missing photoreference parameter' };
  }

   if (!apiKey) {
    return { statusCode: 500, body: 'API key not configured on the server.' };
  }

  const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=<span class="math-inline">\{photoreference\}&key\=</span>{apiKey}`;

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
