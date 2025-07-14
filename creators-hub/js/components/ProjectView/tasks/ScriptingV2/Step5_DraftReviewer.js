// WRITE to file: ./creators-hub/js/components/ProjectView/tasks/ScriptingV2/Step5_DraftReviewer.js

const { useState: useState5, useEffect: useEffect5, useRef: useRef5 } = React; // Use aliases to avoid redeclaration errors

window.Step5_DraftReviewer = () => {
    // --- ANTI-PROP-DRILLING PATTERN ---
    const { video, settings, handlers } = window.useAppState();
    const blueprint = video?.tasks?.scriptingV2_blueprint || {};
    // ------------------------------------

    const [draftScript, setDraftScript] = useState(blueprint.draftScript || []);
    const [globalFeedback, setGlobalFeedback] = useState('');
    const [isProcessingGlobal, setIsProcessingGlobal] = useState(false);
    const [processingBlock, setProcessingBlock] = useState(null); // Tracks which block is being refined

    useEffect(() => {
        setDraftScript(blueprint.draftScript || []);
    }, [blueprint.draftScript]);

    // Debounced Autosave for script edits
    const autosaveTimeout = useRef(null);
    useEffect(() => {
        if (autosaveTimeout.current) clearTimeout(autosaveTimeout.current);
        autosaveTimeout.current = setTimeout(() => {
            const isProcessing = isProcessingGlobal || processingBlock !== null;
            if (!isProcessing && JSON.stringify(draftScript) !== JSON.stringify(blueprint.draftScript || [])) {
                console.log('Autosaving draft script...');
                const newBlueprint = { ...blueprint, draftScript };
                handlers.updateVideo(video.id, { tasks: { ...video.tasks, scriptingV2_blueprint: newBlueprint } }, true);
            }
        }, 2000);
        return () => clearTimeout(autosaveTimeout.current);
    }, [draftScript, isProcessingGlobal, processingBlock, blueprint.draftScript]);


    const handleBlockTextChange = (index, newContent) => {
        const newScript = [...draftScript];
        newScript[index].content = newContent;
        setDraftScript(newScript);
    };

    const handleRefineBlock = async (index, block) => {
        setProcessingBlock(index);
        const taskId = `scriptingV2-refine-block-${video.id}-${Date.now()}`;
        try {
            const refinedContent = await handlers.triggerAiTask({
                id: taskId,
                type: 'scriptingV2-refine-block',
                name: `Refining script block ${index + 1}`,
                intensity: 'low', // Low intensity for small text refinement
                aiFunction: window.aiUtils.refineScriptBlockAI,
                args: { blockContent: block.content, settings }
            });

            if (!refinedContent) throw new Error("AI did not return refined content.");

            const newScript = [...draftScript];
            newScript[index].content = refinedContent;
            setDraftScript(newScript);

        } catch (error) {
            handlers.displayNotification(`Error refining block: ${error.message}`, 'error');
        } finally {
            setProcessingBlock(null);
        }
    };

    const handleGlobalRefine = async () => {
        if (!globalFeedback.trim()) {
            handlers.displayNotification("Global feedback cannot be empty.", 'warning');
            return;
        }
        setIsProcessingGlobal(true);
        const taskId = `scriptingV2-refine-entire-script-${video.id}-${Date.now()}`;
        try {
            const refinedScript = await handlers.triggerAiTask({
                id: taskId,
                type: 'scriptingV2-refine-entire-script',
                name: 'Applying Global Script Refinements',
                intensity: 'heavy',
                aiFunction: window.aiUtils.refineEntireScriptAI,
                args: { draftScript, globalFeedback, settings }
            });

            if (!refinedScript) throw new Error("AI did not return a refined script.");
            setDraftScript(refinedScript);
            setGlobalFeedback('');

        } catch (error) {
            handlers.displayNotification(`Error applying global refinements: ${error.message}`, 'error');
        } finally {
            setIsProcessingGlobal(false);
        }
    };

    const handleFinalize = () => {
        // Combine all script blocks into a single string for the final output
        const finalScriptText = draftScript.map(block => `[${block.type} - ${block.locationTag || 'General'}]\n${block.content}`).join('\n\n');
        
        const newBlueprint = {
            ...blueprint,
            draftScript,
            finalScript: finalScriptText,
            workflowStatus: 'final' // Mark the workflow as complete
        };
        handlers.updateVideo(video.id, { tasks: { ...video.tasks, scriptingV2_blueprint: newBlueprint } });
        handlers.displayNotification("Script finalized successfully!", 'success');
    };
    
    const renderScriptBlocks = () => {
        return draftScript.map((block, index) => {
            const isBlockProcessing = processingBlock === index;
            let blockHeader = `[${block.type}]`;
            if (block.locationTag) {
                blockHeader += ` - Location: ${block.locationTag}`;
            }

            return React.createElement('div', { key: index, className: 'p-3 border border-gray-700 rounded-md bg-gray-800/70' },
                React.createElement('p', { className: 'text-sm font-semibold text-gray-400 mb-2' }, blockHeader),
                React.createElement('textarea', {
                    value: block.content,
                    onChange: (e) => handleBlockTextChange(index, e.target.value),
                    className: 'w-full h-24 p-2 border border-gray-600 rounded bg-gray-900 text-white',
                    disabled: isProcessingGlobal || isBlockProcessing
                }),
                React.createElement('div', { className: 'text-right mt-2' },
                    React.createElement('button', {
                        onClick: () => handleRefineBlock(index, block),
                        disabled: isProcessingGlobal || isBlockProcessing,
                        className: 'btn btn-secondary-small disabled:opacity-50'
                    }, isBlockProcessing ? '🤖 Refining...' : 'Refine this block')
                )
            );
        });
    };

    return React.createElement('div', { className: 'p-4 border border-gray-700 rounded-lg' },
        React.createElement('h2', { className: 'text-xl font-bold text-white mb-3' }, "Step 5: Review and Refine Draft Script"),
        React.createElement('p', { className: 'mb-4 text-gray-400' }, "This is the final draft. Edit the text directly, or use the AI to refine individual blocks or the entire script's tone."),
        
        React.createElement('div', { className: 'space-y-4 mb-6' }, draftScript.length > 0 ? renderScriptBlocks() : React.createElement('p', {className: 'text-center text-gray-500'}, 'No script draft available.')),

        React.createElement('div', { className: 'p-4 border-t border-gray-700' },
            React.createElement('h3', { className: 'font-bold text-lg text-white mb-2' }, 'Global Refinement'),
            React.createElement('p', { className: 'mb-3 text-gray-400' }, "Give a high-level instruction to adjust the tone of the entire script."),
            React.createElement('textarea', {
                className: 'w-full h-20 p-2 border border-gray-600 rounded bg-gray-900 text-white',
                value: globalFeedback,
                onChange: (e) => setGlobalFeedback(e.target.value),
                placeholder: 'e.g., "Make the whole thing a bit more sarcastic and use shorter sentences."',
                disabled: isProcessingGlobal || processingBlock !== null
            }),
            React.createElement('button', {
                onClick: handleGlobalRefine,
                disabled: !globalFeedback.trim() || isProcessingGlobal || processingBlock !== null,
                className: 'btn btn-secondary mt-2 w-full disabled:opacity-50'
            }, isProcessingGlobal ? '🤖 Applying Global Changes...' : 'Apply Global Refinement to Entire Script')
        ),

        React.createElement('div', { className: 'mt-6 flex justify-end' },
            React.createElement('button', {
                onClick: handleFinalize,
                disabled: isProcessingGlobal || processingBlock !== null,
                className: 'btn btn-primary btn-large disabled:opacity-50'
            }, '✅ Finalize Script')
        )
    );
};
