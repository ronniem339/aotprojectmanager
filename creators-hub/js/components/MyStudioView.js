// creators-hub/js/components/MyStudioView.js

const { useState, useEffect } = React;

window.MyStudioView = ({ settings, onSave, onBack, previousView }) => {
    // State for legacy style guide inputs
    const [styleInputs, setStyleInputs] = useState({
        myWriting: '',
        admiredWriting: '',
        keywords: '',
        dosAndDonts: '',
        excludedPhrases: ''
    });

    const [styleGuideText, setStyleGuideText] = useState('');
    const [styleGuideLog, setStyleGuideLog] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [refinementText, setRefinementText] = useState('');
    const [isRefining, setIsRefining] = useState(false);

    // State for the new, detailed V2 style guide object.
    const [styleGuideV2, setStyleGuideV2] = useState({
        brandVoice: '',
        videoTone: '',
        videoStyle: '',
        speakingStyle: '',
        humorLevel: '',
        pacing: '',
        targetAudience: '',
        keyTerminology: '',
        thingsToAvoid: '',
        outroMessage: '',
        visualStyle: '',
        musicStyle: ''
    });

    // State for V2 refinement logs.
    const [styleGuideV2Refinements, setStyleGuideV2Refinements] = useState([]);

    useEffect(() => {
        // This effect syncs the component if the 'settings' prop itself is replaced.
        setStyleGuideText(settings.knowledgeBases?.creator?.styleGuideText || '');
        setStyleGuideLog(settings.knowledgeBases?.creator?.styleGuideLog || []);
        setStyleInputs({
            myWriting: settings.myWriting || '',
            admiredWriting: settings.admiredWriting || '',
            keywords: settings.keywords || '',
            dosAndDonts: settings.dosAndDonts || '',
            excludedPhrases: settings.excludedPhrases || ''
        });
        
        // Populate the detailed V2 style guide state from its own separate object.
        setStyleGuideV2(settings.knowledgeBases?.styleV2?.detailedStyleGuide || {
            brandVoice: '', videoTone: '', videoStyle: '', speakingStyle: '',
            humorLevel: '', pacing: '', targetAudience: '', keyTerminology: '',
            thingsToAvoid: '', outroMessage: '', visualStyle: '', musicStyle: ''
        });

        // Populate the V2 refinement logs.
        setStyleGuideV2Refinements(settings.knowledgeBases?.styleV2?.refinements || []);

    }, [settings]);

    const handleAnalyzeStyle = async () => {
        setIsLoading(true);
        const whoAmIKb = settings.knowledgeBases?.creator?.whoAmI || '';

        const prompt = `Analyze the following inputs to define a detailed YouTube creator's style guide.
        
        ${whoAmIKb ? `User Persona (Who Am I): "${whoAmIKb}"` : ''}

        1.  **My Writing Sample:** "${styleInputs.myWriting}"
        2.  **Admired Writing Sample:** "${styleInputs.admiredWriting}"
        3.  **Descriptive Keywords:** "${styleInputs.keywords}"
        4.  **Specific Dos and Don'ts:** "${styleInputs.dosAndDonts}"
        5.  **Excluded Phrases:** "${styleInputs.excludedPhrases}"

        Synthesize these inputs into a structured style guide covering: Tone, Pacing, Vocabulary, Sentence Structure, and Humor. Also include the explicit Dos/Don'ts and Excluded Phrases. Provide a detailed, actionable description for each category.`;

        try {
            const generatedGuide = await window.aiUtils.callGeminiAPI(prompt, settings, { isComplex: true }, { responseMimeType: "text/plain" });
            setStyleGuideText(generatedGuide);
        } catch (e) {
            console.error("Error generating style guide:", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRefineWithAI = async () => {
        if (!refinementText) {
            alert("Please enter your feedback for the AI to refine the style guide.");
            return;
        }

        setIsRefining(true);
        try {
            const styleGuideResponse = await window.aiUtils.updateStyleGuideAI({
                currentStyleGuide: styleGuideText,
                refinementFeedback: refinementText,
                settings: settings
            });

            if (!styleGuideResponse?.newStyleGuideText) {
                throw new Error("The AI did not return a valid response.");
            }

            const newStyleGuideText = styleGuideResponse.newStyleGuideText;

            const newLogEntry = {
                date: new Date().toISOString(),
                change: refinementText,
            };

            const newLog = [newLogEntry, ...styleGuideLog];

            const updatedSettings = {
                ...settings,
                ...styleInputs,
                knowledgeBases: {
                    ...settings.knowledgeBases,
                    creator: {
                        ...settings.knowledgeBases?.creator,
                        styleGuideText: newStyleGuideText,
                        styleGuideLog: newLog
                    }
                }
            };
            onSave(updatedSettings);

            setStyleGuideText(newStyleGuideText);
            setStyleGuideLog(newLog);
            setRefinementText('');

        } catch (error) {
            console.error("Error refining style guide:", error);
            alert("There was an error refining the style guide: " + error.message);
        } finally {
            setIsRefining(false);
        }
    };


    const handleSave = () => {
        const updatedSettings = {
            ...settings,
            ...styleInputs,
            knowledgeBases: {
                ...settings.knowledgeBases,
                creator: {
                    ...settings.knowledgeBases?.creator,
                    styleGuideText: styleGuideText,
                    styleGuideLog: styleGuideLog
                },
                styleV2: {
                    ...settings.knowledgeBases?.styleV2,
                    detailedStyleGuide: styleGuideV2,
                }
            }
        };
        onSave(updatedSettings);
        alert("Style Guide Saved!");
    };

    const getBackLinkText = () => {
        if (previousView === 'project') {
            return 'Back to Project';
        }
        return 'Back to Settings Menu';
    };
    
    const handleStyleGuideV2Change = (field, value) => {
        setStyleGuideV2(prev => ({ ...prev, [field]: value }));
    };
    
    const renderV2StyleGuideInput = (field, label, placeholder) => (
        React.createElement('div', null,
            React.createElement('label', { className: 'block text-sm font-medium text-gray-300' }, label),
            React.createElement('input', {
                type: 'text',
                className: 'mt-1 block w-full rounded-md bg-gray-900 border-gray-600 shadow-sm focus:border-primary-accent focus:ring-primary-accent sm:text-sm',
                value: styleGuideV2[field] || '',
                onChange: e => handleStyleGuideV2Change(field, e.target.value),
                placeholder: placeholder
            })
        )
    );
    
    const renderV2StyleGuideTextarea = (field, label, placeholder) => (
       React.createElement('div', null,
            React.createElement('label', { className: 'block text-sm font-medium text-gray-300' }, label),
            React.createElement('textarea', {
                className: 'mt-1 block w-full rounded-md bg-gray-900 border-gray-600 shadow-sm focus:border-primary-accent focus:ring-primary-accent sm:text-sm',
                rows: 3,
                value: styleGuideV2[field] || '',
                onChange: e => handleStyleGuideV2Change(field, e.target.value),
                placeholder: placeholder
            })
        )
    );

    const refinementLog = styleGuideLog || [];

    const renderV2RefinementLog = () => {
        return React.createElement('div', { className: 'mt-8' },
            React.createElement('h4', { className: 'text-lg font-semibold text-gray-200 mb-2' }, 'V2 Style Guide Refinement History'),
            React.createElement('div', { className: 'bg-gray-800/50 p-4 rounded-lg border border-gray-700 h-64 overflow-y-auto custom-scrollbar' },
                styleGuideV2Refinements && styleGuideV2Refinements.length > 0 ?
                    React.createElement('ul', { className: 'space-y-4' },
                        styleGuideV2Refinements.map((entry, index) =>
                            React.createElement('li', { key: index, className: 'text-gray-300 text-sm border-b border-gray-700 pb-3 last:border-b-0' },
                                React.createElement('span', { className: 'block font-semibold text-gray-400 text-xs mb-2' },
                                    `${new Date(entry.timestamp).toLocaleString()} - Source: ${entry.source}`
                                ),
                                React.createElement('div', { className: 'pl-2 border-l-2 border-secondary-accent' },
                                    Object.entries(entry).map(([key, value]) => {
                                        if (key === 'timestamp' || key === 'source') return null;
                                        return React.createElement('div', { key: key, className: 'mb-2' },
                                            React.createElement('p', { className: 'font-semibold text-gray-300 capitalize' }, `${key.replace(/([A-Z])/g, ' $1')}:`),
                                            React.createElement('p', { className: 'text-gray-400 italic' }, `"${String(value)}"`)
                                        );
                                    })
                                )
                            )
                        )
                    ) :
                    React.createElement('p', { className: 'text-gray-400 text-sm italic' }, 'No V2 style guide refinements yet. They will appear here automatically after you import a transcript.')
            )
        );
    };

    return React.createElement('div', { className: 'p-4 sm:p-8' },
        React.createElement('button', { onClick: onBack, className: 'flex items-center gap-2 text-secondary-accent hover:text-secondary-accent-light mb-6' }, `⬅️ ${getBackLinkText()}`),
        React.createElement('h1', { className: 'text-3xl sm:text-4xl font-bold mb-4' }, '🎨 Style & Tone'),
        React.createElement('p', { className: 'text-gray-400 mb-8' }, 'Train the AI on your unique creative style. The more detail you provide, the better the AI\'s suggestions will be.'),
        React.createElement('div', { className: 'grid grid-cols-1 lg:grid-cols-2 gap-8' },
            React.createElement('div', null,
                React.createElement('h3', { className: 'text-lg font-medium text-gray-200' }, 'Refine Style Guide with AI (Legacy)'),
                React.createElement('p', { className: 'mt-1 text-sm text-gray-400' }, 'Provide feedback below and let the AI rewrite your legacy style guide.'),
                React.createElement('div', { className: 'mt-4' },
                    React.createElement('textarea', {
                        rows: '3',
                        className: 'form-textarea',
                        placeholder: "e.g., 'Make the tone more professional' or 'Always use bullet points for lists.'",
                        value: refinementText,
                        onChange: (e) => setRefinementText(e.target.value)
                    })
                ),
                React.createElement('div', { className: 'mt-4 flex justify-end' },
                    React.createElement('button', {
                        type: 'button',
                        onClick: handleRefineWithAI,
                        disabled: isRefining,
                        className: 'inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50'
                    }, isRefining ? 'Refining...' : 'Refine with AI')
                )
            ),
            React.createElement('div', null,
                React.createElement('h3', { className: 'text-xl font-semibold mb-3' }, 'Refinement History (Legacy)'),
                React.createElement('div', { className: 'bg-gray-800/50 p-4 rounded-lg border border-gray-700 h-48 overflow-y-auto' },
                    refinementLog.length > 0 ?
                        React.createElement('ul', { className: 'space-y-3' },
                            refinementLog.map((entry, index) =>
                                React.createElement('li', { key: index, className: 'text-gray-300 text-sm border-b border-gray-700 pb-3 last:border-b-0' },
                                    React.createElement('span', { className: 'block font-semibold text-gray-400 text-xs' }, new Date(entry.date).toLocaleDateString()),
                                    React.createElement('p', { className: 'mt-1' }, entry.change)
                                )
                            )
                        ) :
                        React.createElement('p', { className: 'text-gray-400 text-sm italic' }, 'No refinement history yet.')
                )
            ),
            React.createElement('div', { className: 'lg:col-span-2' },
                React.createElement('h2', { className: 'text-2xl font-semibold mb-4' }, 'Your AI-Powered Style Guide (Legacy)'),
                React.createElement('textarea', { value: styleGuideText, onChange: (e) => setStyleGuideText(e.target.value), rows: '15', className: 'form-textarea leading-relaxed', placeholder: 'Your generated style guide will appear here. You can edit it directly.' })
            ),
            React.createElement('div', { className: 'lg:col-span-2' },
                React.createElement('h2', { className: 'text-2xl font-semibold mb-4' }, 'Style Inputs (Legacy)'),
                React.createElement('div', { className: 'space-y-4' },
                    React.createElement('div', null, React.createElement('label', { className: 'block text-sm font-medium text-gray-300 mb-2' }, 'An example of your writing'), React.createElement('textarea', { value: styleInputs.myWriting, onChange: (e) => setStyleInputs(p => ({ ...p, myWriting: e.target.value })), rows: '6', className: 'form-textarea', placeholder: 'Paste a sample of a previous script or blog post here...' })),
                    React.createElement('div', null, React.createElement('label', { className: 'block text-sm font-medium text-gray-300 mb-2' }, 'Writing you admire'), React.createElement('textarea', { value: styleInputs.admiredWriting, onChange: (e) => setStyleInputs(p => ({ ...p, admiredWriting: e.target.value })), rows: '6', className: 'form-textarea', placeholder: 'Paste a sample from another creator or writer whose style you like...' })),
                    React.createElement('div', null, React.createElement('label', { className: 'block text-sm font-medium text-gray-300 mb-2' }, 'Keywords describing your style'), React.createElement('input', { type: 'text', value: styleInputs.keywords, onChange: (e) => setStyleInputs(p => ({ ...p, keywords: e.target.value })), className: 'form-input', placeholder: 'e.g., witty, cinematic, fast-paced, educational' })),
                    React.createElement('div', null, React.createElement('label', { className: 'block text-sm font-medium text-gray-300 mb-2' }, 'Style Dos and Don\'ts'), React.createElement('textarea', { value: styleInputs.dosAndDonts, onChange: (e) => setStyleInputs(p => ({ ...p, dosAndDonts: e.target.value })), rows: '3', className: 'form-textarea', placeholder: 'e.g., DO use humor. DON\'T be too formal.' })),
                    React.createElement('div', null, React.createElement('label', { className: 'block text-sm font-medium text-gray-300 mb-2' }, 'Excluded Phrases & Words'), React.createElement('textarea', { value: styleInputs.excludedPhrases, onChange: (e) => setStyleInputs(p => ({ ...p, excludedPhrases: e.target.value })), rows: '3', className: 'form-textarea', placeholder: 'e.g., synergy, circle back, at the end of the day' })),
                    React.createElement('button', { onClick: handleAnalyzeStyle, disabled: isLoading, className: 'w-full px-6 py-3 bg-primary-accent hover:bg-primary-accent-darker rounded-lg font-semibold flex items-center justify-center gap-2 disabled:bg-gray-500' }, isLoading ? React.createElement(window.LoadingSpinner, { isButton: true }) : '🧬 Analyze & Create Style Guide')
                )
            )
        ),
        React.createElement('div', { className: 'mt-12 pt-8 border-t border-gray-600' },
            React.createElement('div', { className: 'glass-card p-6 rounded-lg border-2 border-secondary-accent' },
                React.createElement('h3', { className: 'text-2xl font-semibold text-secondary-accent mb-2' }, 'Detailed Style Guide (for Scripting V2)'),
                React.createElement('p', { className: 'text-gray-400 mb-6' }, 'Provide specific details about your content style. The more specific you are, the better the new scripting workflow will be at matching your voice.'),
                React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8' },
                    renderV2StyleGuideInput('brandVoice', 'Overall Brand Voice', 'e.g., Inquisitive, adventurous, respectful'),
                    renderV2StyleGuideInput('videoTone', 'Video Tone', 'e.g., Educational but entertaining'),
                    renderV2StyleGuideTextarea('speakingStyle', 'Speaking Style', 'e.g., Conversational, like talking to a friend. Uses simple language.'),
                    renderV2StyleGuideInput('humorLevel', 'Humor Level', 'e.g., Witty and dry, uses puns sparingly'),
                    renderV2StyleGuideInput('pacing', 'Pacing', 'e.g., Fast-paced with quick cuts'),
                    renderV2StyleGuideInput('targetAudience', 'Target Audience', 'e.g., Curious travelers aged 25-45'),
                    renderV2StyleGuideTextarea('keyTerminology', 'Key Terminology', 'List any specific words or phrases you always use.'),
                    renderV2StyleGuideTextarea('thingsToAvoid', 'Things to Avoid', 'List any cliches, words, or topics you want to avoid.'),
                    renderV2StyleGuideTextarea('outroMessage', 'Standard Outro Message', 'e.g., "Thanks for watching, and keep exploring."'),
                    renderV2StyleGuideInput('visualStyle', 'Visual Style', 'e.g., Cinematic, high-contrast, wide lenses'),
                    renderV2StyleGuideInput('musicStyle', 'Music Style', 'e.g., Lo-fi beats, epic orchestral, no vocals')
                ),
                renderV2RefinementLog()
            )
        ),
        React.createElement('div', { className: 'mt-8 text-right' },
            React.createElement('button', { onClick: handleSave, className: 'px-8 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors' }, 'Save All Style Guides')
        )
    );
};
