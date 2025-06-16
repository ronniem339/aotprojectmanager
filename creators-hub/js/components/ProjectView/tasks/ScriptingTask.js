// js/components/ProjectView/tasks/ScriptingTask.js

window.ScriptingTask = ({ video, settings, onUpdateTask, isLocked, project, userId }) => { // Added project and userId to props
    const { useState, useEffect } = React;

    // Main script content and general UI states
    const [scriptContent, setScriptContent] = useState('');
    const [generating, setGenerating] = useState(false);
    const [showFullScreenScript, setShowFullScreenScript] = useState(false);
    const [error, setError] = useState('');
    const [refinementPrompt, setRefinementPrompt] = useState('');

    // New states for the multi-step script generation process
    // scriptingStage: 'pending' | 'plan_generation' | 'plan_review' | 'full_script_generation' | 'script_review' | 'complete'
    const [scriptingStage, setScriptingStage] = useState(video.tasks?.scriptingStage || 'pending');
    const [scriptPlan, setScriptPlan] = useState(video.tasks?.scriptPlan || '');
    const [locationQuestions, setLocationQuestions] = useState(video.tasks?.locationQuestions || []);
    const [userExperiences, setUserExperiences] = useState(video.tasks?.userExperiences || {}); // { locationName: "user response" }
    const [generalFeedback, setGeneralFeedback] = useState(video.tasks?.generalFeedback || '');

    // Sync component's state with the video data from Firestore
    useEffect(() => {
        setScriptContent(video.script || '');
        // When video data changes, determine the current scripting stage.
        // If there's a script, it's at least in review. If there's a plan, it's in plan_review.
        // Otherwise, it's pending.
        if (video.script) {
            setScriptingStage(video.tasks?.scriptingStage || 'script_review');
        } else if (video.tasks?.scriptPlan) {
            setScriptingStage(video.tasks?.scriptingStage || 'plan_review');
        } else {
            setScriptingStage(video.tasks?.scriptingStage || 'pending');
        }
        setScriptPlan(video.tasks?.scriptPlan || '');
        setLocationQuestions(video.tasks?.locationQuestions || []);
        setUserExperiences(video.tasks?.userExperiences || {});
        setGeneralFeedback(video.tasks?.generalFeedback || '');
        setError('');
        setRefinementPrompt('');
    }, [video.id, video.script, video.tasks]);

    // Derived state for button/field locking
    const isTaskComplete = scriptingStage === 'complete';

    /**
     * Step 1: Calls AI to generate a high-level script plan and specific questions.
     */
    const handleGenerateScriptPlan = async () => {
        setGenerating(true);
        setError('');

        const apiKey = settings.geminiApiKey;
        if (!apiKey) {
            setError("Gemini API Key is not set. Please set it in the settings.");
            setGenerating(false);
            return;
        }

        try {
            // Fetch project's full location data and footage inventory for context
            // Corrected: Use userId and project.id from props
            const projectDocRef = db.collection(`artifacts/${window.CREATOR_HUB_CONFIG.APP_ID}/users/${userId}/projects`).doc(project.id);
            const projectSnap = await projectDocRef.get();
            const projectData = projectSnap.data();

            const planData = await window.aiUtils.generateScriptPlanAI({
                videoTitle: video.chosenTitle || video.title,
                videoConcept: video.concept,
                videoLocationsFeatured: video.locations_featured || [], // Array of location names
                projectFootageInventory: projectData.footageInventory || {}, // Pass entire footage inventory
                whoAmI: settings.knowledgeBases?.youtube?.whoAmI,
                styleGuideText: settings.styleGuideText,
                apiKey: apiKey
            });

            setScriptPlan(planData.scriptPlan);
            setLocationQuestions(planData.locationQuestions);
            // Initialize userExperiences using the questions, ensuring 'overall' is always present if no specific locations
            const initialUserExperiences = planData.locationQuestions.reduce((acc, q) => ({ ...acc, [q.locationName || 'overall']: '' }), {});
            if (planData.locationQuestions.length === 0) { // Ensure 'overall' if no specific questions
                initialUserExperiences.overall = '';
            }
            setUserExperiences(initialUserExperiences);
            setGeneralFeedback(''); // Reset general feedback for new plan
            setScriptingStage('plan_review');
            // Save the current state of the task to Firestore
            await onUpdateTask('scriptingStage', 'plan_review', {
                'tasks.scriptPlan': planData.scriptPlan,
                'tasks.locationQuestions': planData.locationQuestions,
                'tasks.userExperiences': initialUserExperiences, // Save initialized experiences
                'tasks.generalFeedback': ''
            });

        } catch (err) {
            console.error("Error generating script plan:", err);
            setError(`Failed to generate script plan: ${err.message}`);
        } finally {
            setGenerating(false);
        }
    };

    /**
     * Step 2: Calls AI to generate the full script based on the plan and user's input.
     */
    const handleGenerateFullScript = async () => {
        setGenerating(true);
        setError('');

        const apiKey = settings.geminiApiKey;
        if (!apiKey) {
            setError("Gemini API Key is not set. Please set it in the settings.");
            setGenerating(false);
            return;
        }

        try {
            const fullScript = await window.aiUtils.generateFullScriptAI({
                scriptPlan: scriptPlan,
                generalFeedback: generalFeedback,
                locationExperiences: userExperiences,
                videoTitle: video.chosenTitle || video.title,
                videoConcept: video.concept,
                whoAmI: settings.knowledgeBases?.youtube?.whoAmI,
                styleGuideText: settings.styleGuideText,
                apiKey: apiKey
            });

            setScriptContent(fullScript);
            setScriptingStage('script_review');
            // Save the full script and stage to Firestore
            await onUpdateTask('scriptingStage', 'script_review', {
                'script': fullScript
            });

        } catch (err) {
            console.error("Error generating full script:", err);
            setError(`Failed to generate full script: ${err.message}`);
        } finally {
            setGenerating(false);
        }
    };

    /**
     * Refines the existing script (either generated or manually entered) based on user feedback.
     */
    const handleRefineScript = async () => {
        if (!refinementPrompt) return;
        setGenerating(true);
        setError('');

        const apiKey = settings.geminiApiKey;
        if (!apiKey) {
            setError("Gemini API Key is not set.");
            setGenerating(false);
            return;
        }

        const prompt = `You are a professional script editor. The user has provided an existing video script and an instruction to refine it.
        Your task is to rewrite the script based on the instruction.

        Original Script:
        ---
        ${scriptContent}
        ---
        
        User's Refinement Instruction: "${refinementPrompt}"

        IMPORTANT: Please provide only the complete, rewritten, raw text script as your response. Do not include any explanations, apologies, or conversational text. Only return the spoken dialogue.`;

        try {
            const payload = {
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "text/plain" }
            };
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err?.error?.message || 'API Error');
            }
            const result = await response.json();
            const refinedScript = result.candidates[0].content.parts[0].text;
            setScriptContent(refinedScript);
            setRefinementPrompt(''); // Clear the prompt after use
            // Save the refined script
            await onUpdateTask('scriptingStage', 'script_review', { 'script': refinedScript });
        } catch (err) {
            console.error("Error refining script:", err);
            setError(`Failed to refine script: ${err.message}`);
        } finally {
            setGenerating(false);
        }
    };

    /**
     * Saves the final script content and marks the task as complete.
     */
    const handleConfirmScript = async () => {
        setScriptingStage('complete');
        await onUpdateTask('scripting', 'complete', {
            script: scriptContent,
            'tasks.scriptingStage': 'complete', // Persist stage
            'tasks.scriptPlan': scriptPlan,
            'tasks.locationQuestions': locationQuestions,
            'tasks.userExperiences': userExperiences,
            'tasks.generalFeedback': generalFeedback
        });
    };

    // Render logic based on scriptingStage
    const renderContent = () => {
        if (isLocked) {
            return <p className="text-gray-400 text-center py-2 text-sm">Please complete previous steps to begin scripting.</p>;
        }

        if (isTaskComplete) {
            return (
                <div className="space-y-4">
                    <p className="text-gray-400 text-center py-2 text-sm">Scripting task is complete. Use "Revisit" to make changes.</p>
                    <h4 className="text-sm font-semibold text-gray-400 mb-2">Final Script:</h4>
                    <textarea
                        value={scriptContent}
                        rows="10"
                        className="w-full form-textarea bg-gray-800/50"
                        readOnly
                    />
                    <div className="flex justify-center mt-4">
                        <button onClick={() => setShowFullScreenScript(true)} className="px-5 py-2.5 bg-secondary-accent hover:bg-secondary-accent-darker rounded-lg font-semibold">View Fullscreen Script</button>
                    </div>
                </div>
            );
        }

        switch (scriptingStage) {
            case 'pending':
                return (
                    <div className="text-center py-4">
                        <button onClick={handleGenerateScriptPlan} disabled={generating} className="w-full max-w-xs mx-auto px-5 py-2.5 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold disabled:opacity-75">
                            {generating ? <window.LoadingSpinner isButton={true} /> : '✨ Generate Script Plan'}
                        </button>
                    </div>
                );

            case 'plan_review':
                return (
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-primary-accent">AI-Generated Script Plan:</h3>
                        <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                            <textarea
                                value={scriptPlan}
                                rows="10"
                                className="w-full form-textarea bg-gray-800/80"
                                readOnly
                                placeholder="Your script plan will appear here..."
                            />
                        </div>

                        <h3 className="text-lg font-semibold text-gray-300">Your Experience & Footage Details:</h3>
                        <p className="text-sm text-gray-400">Answer these questions to help the AI craft a personalized script. Be specific!</p>
                        <div className="space-y-4 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                            {locationQuestions.map((q, index) => (
                                <div key={index}>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                                        {q.question} {q.locationName && <span className="text-secondary-accent-lighter-text">({q.locationName})</span>}
                                    </label>
                                    <textarea
                                        value={userExperiences[q.locationName || 'overall'] || ''}
                                        onChange={(e) => setUserExperiences(prev => ({ ...prev, [q.locationName || 'overall']: e.target.value }))}
                                        rows="2"
                                        className="w-full form-textarea"
                                        placeholder="Type your details here..."
                                    />
                                </div>
                            ))}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">General Feedback on Plan (Optional):</label>
                                <textarea
                                    value={generalFeedback}
                                    onChange={(e) => setGeneralFeedback(e.target.value)}
                                    rows="2"
                                    className="w-full form-textarea"
                                    placeholder="e.g., 'Make the intro more personal', 'Ensure to highlight the drone footage in segment 2'"
                                />
                            </div>
                        </div>

                        <div className="text-center pt-4 border-t border-gray-700">
                            <button onClick={handleGenerateFullScript} disabled={generating} className="w-full max-w-xs mx-auto px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg font-semibold disabled:opacity-75">
                                {generating ? <window.LoadingSpinner isButton={true} /> : 'Generate Full Script'}
                            </button>
                        </div>
                    </div>
                );

            case 'script_review':
            default: // Fallback for 'script_review' or if scriptContent somehow exists without a stage
                return (
                    <div>
                        <h4 className="text-sm font-semibold text-gray-400 mb-2">Video Script:</h4>
                        <textarea
                            value={scriptContent}
                            onChange={(e) => setScriptContent(e.target.value)}
                            rows="10"
                            className="w-full form-textarea bg-gray-800/50"
                            placeholder="Paste your script here, or click the button below to generate one with AI."
                        />
                        
                        {scriptContent && (
                            <div className="mt-4 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                                <label className="block text-sm font-medium text-gray-300 mb-2">Refine with AI</label>
                                <textarea 
                                    value={refinementPrompt}
                                    onChange={(e) => setRefinementPrompt(e.target.value)}
                                    rows="2" 
                                    className="w-full form-textarea" 
                                    placeholder="e.g., 'Make the intro more exciting', 'Add a section about the local food', 'Make it 2 minutes longer'"
                                />
                                <div className="text-right mt-2">
                                    <button onClick={handleRefineScript} disabled={generating || !refinementPrompt} className="px-4 py-2 text-sm bg-secondary-accent hover:bg-secondary-accent-darker rounded-lg font-semibold disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center ml-auto gap-2">
                                        {generating ? <window.LoadingSpinner isButton={true} /> : '✍️ Refine Script'}
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-3 mt-4">
                            <button onClick={() => setShowFullScreenScript(true)} className="flex-grow px-5 py-2.5 bg-secondary-accent hover:bg-secondary-accent-darker rounded-lg font-semibold">View Fullscreen Script</button>
                            <button onClick={handleConfirmScript} className="flex-grow px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg font-semibold">Confirm & Lock Script</button>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div>
            {error && <p className="text-red-400 mb-2 text-sm bg-red-900/50 p-3 rounded-lg">{error}</p>}
            {renderContent()}
            
            {showFullScreenScript && ReactDOM.createPortal(
                <window.FullScreenScriptView
                    scriptContent={scriptContent}
                    onClose={() => setShowFullScreenScript(false)}
                />,
                document.body
            )}
        </div>
    );
};
