window.aiUtils = window.aiUtils || {};

/**
 * The core, centralized function to call the Gemini API.
 */
window.aiUtils.callGeminiAPI = async (prompt, settings, generationConfig = {}, isComplex = false) => {
    if (!settings || !settings.geminiApiKey) {
        throw new Error("Gemini API Key is not set. Please set it in the settings.");
    }
    const apiKey = settings.geminiApiKey;

    const usePro = isComplex && settings.useProModelForComplexTasks;
    const modelName = usePro
        ? (settings.proModelName || 'gemini-1.5-pro-latest')
        : (settings.flashModelName || 'gemini-1.5-flash-latest');

    console.log(`%c[AI Call] Using model: ${modelName} (Complex Task: ${isComplex})`, 'color: #2563eb; font-weight: bold;');

    const diacriticsRule = `CRITICAL RULE: For all text you generate (titles, keywords, descriptions, names, script content, etc.), you MUST NOT use diacritics (e.g., use 'cafe' instead of 'café', 'Cordoba' instead of 'Córdoba'). This is for SEO and searchability for an English-speaking audience.`;

    const finalPrompt = `${diacriticsRule}\n\n--- ORIGINAL PROMPT BEGINS ---\n${prompt}`;
    
    const finalGenerationConfig = {
        responseMimeType: "application/json",
        ...generationConfig
    };

    const payload = {
        contents: [{ role: "user", parts: [{ text: finalPrompt }] }],
        generationConfig: finalGenerationConfig
    };

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err?.error?.message || `API Error (${response.status})`);
        }

        const result = await response.json();

        if (!result.candidates || !result.candidates[0].content || !result.candidates[0].content.parts) {
            console.error("Unexpected AI response structure:", result);
            throw new Error("AI returned an unexpected or empty response.");
        }

        const responseText = result.candidates[0].content.parts[0].text;
        
        if (finalGenerationConfig.responseMimeType === "application/json") {
            try {
                // **FIX:** Replaced the fragile parsing logic with a more robust method.
                let textToParse = responseText.trim();
                
                // Check for markdown code fences (```json ... ```) and extract the content.
                const jsonMatch = textToParse.match(/```(json)?\s*([\s\S]*?)\s*```/);
                if (jsonMatch && jsonMatch[2]) {
                    textToParse = jsonMatch[2];
                }

                // Attempt to parse the cleaned text.
                return JSON.parse(textToParse);

            } catch (e) {
                console.error("Failed to parse AI response as JSON:", responseText, e);
                throw new Error("AI response was expected to be valid JSON but wasn't.");
            }
        } else {
            // For plain text, just return it directly
            return responseText;
        }
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('API call timed out after 2 minutes.');
        }
        throw error;
    }
};
