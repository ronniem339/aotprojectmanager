window.aiUtils = window.aiUtils || {};

/**
 * The core, centralized function to call the Gemini API.
 * It now intelligently selects the model based on the provided options,
 * supporting both the legacy complex/simple flag and the new V2 task tiers.
 *
 * @param {string} prompt The complete prompt to send to the AI.
 * @param {object} settings The application's settings object, containing API keys and model preferences.
 * @param {object} options An object to specify the task type.
 * @param {boolean} [options.isComplex=false] - For legacy tasks. If true, uses the Pro model if enabled.
 * @param {string} [options.taskTier=null] - For V2 tasks ('heavy', 'standard', 'lite').
 * @param {object|null} generationConfig - The generationConfig for the API call.
 * @returns {Promise<object|string>} The parsed JSON object or raw text from the AI.
 */
window.aiUtils.callGeminiAPI = async (prompt, settings, options = {}, generationConfig = {}) => {
    if (!settings || !settings.geminiApiKey) {
        throw new Error("Gemini API Key is not set. Please set it in the settings.");
    }
    const apiKey = settings.geminiApiKey;

    let modelName;
    const techSettings = settings.technical || {};
    const modelSettings = settings.models || {};
    const { isComplex, taskTier } = options;

    // --- CORRECTED Model Selection Logic ---
    if (taskTier) {
        // Handle new V2 tiered system
        console.log("Using V2 Model Selection Logic");
        if (taskTier === 'heavy' && techSettings.useProForV2HeavyTasks) {
            modelName = modelSettings.v2_pro;
            if (!modelName) throw new Error("V2 Pro Model name is not configured in Technical Settings.");
        } else if (taskTier === 'heavy' && !techSettings.useProForV2HeavyTasks) {
            modelName = modelSettings.v2_flash;
            if (!modelName) throw new Error("V2 Flash Model name is not configured in Technical Settings.");
        } else if (taskTier === 'standard') {
            modelName = modelSettings.v2_flash;
            if (!modelName) throw new Error("V2 Flash Model name is not configured in Technical Settings.");
        } else if (taskTier === 'lite') {
            modelName = modelSettings.v2_lite;
            if (!modelName) throw new Error("V2 Lite Model name is not configured in Technical Settings.");
        } else {
             modelName = modelSettings.v2_flash;
             if (!modelName) throw new Error("Default V2 Flash Model name is not configured in Technical Settings.");
        }
    } else {
        // Handle legacy binary system
        console.log("Using Legacy Model Selection Logic");
        const usePro = settings.useProModelForComplexTasks && isComplex;
        modelName = usePro
            ? modelSettings.pro
            : modelSettings.flash;
        if (!modelName) throw new Error("Legacy Pro/Flash Model name is not configured in Technical Settings.");
    }

    console.log(`%c[AI Call] Using model: ${modelName} (Tier: ${taskTier || (isComplex ? 'complex' : 'simple')})`, 'color: #2563eb; font-weight: bold;');

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
    const timeoutId = setTimeout(() => controller.abort(), 300000);

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
                let textToParse = responseText.trim();
                
                const jsonMatch = textToParse.match(/```(json)?\s*([\s\S]*?)\s*```/);
                if (jsonMatch && jsonMatch[2]) {
                    textToParse = jsonMatch[2];
                }

                return JSON.parse(textToParse);

            } catch (e) {
                console.error("Failed to parse AI response as JSON:", responseText, e);
                throw new Error("AI response was expected to be valid JSON but wasn't.");
            }
        } else {
            return responseText;
        }
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('API call timed out after 5 minutes.');
        }
        throw error;
    }
};
