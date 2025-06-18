import { generateDraftOutlineAI, generateScriptPlanAI, generateFinalScriptAI } from '../utils/aiUtils.js';
import { FullScreenScriptView } from './ProjectView/FullScreenScriptView.js';

/**
 * A modal component for the multi-step AI-assisted scripting process.
 * @param {object} options - The options for the modal.
 * @param {object} options.video - The video data object.
 * @param {object} options.project - The project data object.
 * @param {object} options.settings - The project settings.
 * @param {function} options.onSave - Callback function to save the final script.
 * @param {function} options.onUpdate - Callback function for real-time updates.
 * @param {string} [options.startStage='initial_thoughts'] - The stage to start the wizard at.
 * @returns {HTMLElement} The modal element.
 */
export const ScriptPlanModal = (options) => {
    const { video, project, settings, onSave, onUpdate, startStage = 'initial_thoughts' } = options;

    const modal = document.createElement('div');
    modal.className = 'modal';

    let state = {
        currentStage: startStage,
        isLoading: false,
        initialThoughts: video.scriptPlan || '',
        draftOutline: video.draftOutline || '',
        scriptPlan: video.scriptPlan || '',
        locationQuestions: video.locationQuestions || [],
        questionAnswers: video.questionAnswers || {},
        finalScript: video.script || '',
        errorMessage: '',
        // New state for refinement text
        outlineRefinementText: '',
        scriptRefinementText: ''
    };

    const setState = (newState) => {
        state = { ...state, ...newState };
        render();
    };

    const handleInitialThoughtsSubmit = async () => {
        setState({ isLoading: true, errorMessage: '' });
        try {
            const result = await generateDraftOutlineAI({
                videoTitle: video.title,
                videoConcept: video.concept,
                initialThoughts: state.initialThoughts,
                settings
            });
            await onUpdate({ draftOutline: result.draftOutline, initialThoughts: state.initialThoughts });
            setState({ isLoading: false, draftOutline: result.draftOutline, currentStage: 'draft_outline_review' });
        } catch (error) {
            console.error('Error generating draft outline:', error);
            setState({ isLoading: false, errorMessage: `Failed to generate outline. ${error.message}` });
        }
    };

    const handleOutlineRefinement = async () => {
        setState({ isLoading: true, errorMessage: '' });
        try {
            const result = await generateDraftOutlineAI({
                videoTitle: video.title,
                videoConcept: video.concept,
                initialThoughts: state.initialThoughts,
                settings,
                refinementText: state.outlineRefinementText // Pass refinement text
            });
            await onUpdate({ draftOutline: result.draftOutline });
            setState({ isLoading: false, draftOutline: result.draftOutline, outlineRefinementText: '' }); // Clear refinement text after use
        } catch (error) {
            console.error('Error refining draft outline:', error);
            setState({ isLoading: false, errorMessage: `Failed to refine outline. ${error.message}` });
        }
    };

    const handleOutlineApproval = async () => {
        setState({ isLoading: true, errorMessage: '' });
        try {
            const result = await generateScriptPlanAI({
                videoTitle: video.title,
                draftOutline: state.draftOutline,
                settings
            });
            await onUpdate({ scriptPlan: result.scriptPlan, locationQuestions: result.locationQuestions });
            setState({
                isLoading: false,
                scriptPlan: result.scriptPlan,
                locationQuestions: result.locationQuestions,
                currentStage: 'question_answering'
            });
        } catch (error) {
            console.error('Error generating script plan:', error);
            setState({ isLoading: false, errorMessage: `Failed to generate questions. ${error.message}` });
        }
    };

    const handleAnswersSubmit = async () => {
        const answersText = state.locationQuestions.map((q, index) =>
            `Q: ${q.question}\nA: ${state.questionAnswers[index] || 'No answer.'}`
        ).join('\n\n');
        
        setState({ isLoading: true, errorMessage: '' });
        try {
            const result = await generateFinalScriptAI({
                videoTitle: video.title,
                scriptPlan: state.scriptPlan,
                userAnswers: answersText,
                settings
            });
            await onUpdate({ finalScript: result.finalScript, questionAnswers: state.questionAnswers });
            setState({ isLoading: false, finalScript: result.finalScript, currentStage: 'full_script_review' });
        } catch (error) {
            console.error('Error generating final script:', error);
            setState({ isLoading: false, errorMessage: `Failed to generate script. ${error.message}` });
        }
    };
    
    const handleScriptRefinement = async () => {
        const answersText = state.locationQuestions.map((q, index) =>
            `Q: ${q.question}\nA: ${state.questionAnswers[index] || 'No answer.'}`
        ).join('\n\n');

        setState({ isLoading: true, errorMessage: '' });
        try {
            const result = await generateFinalScriptAI({
                videoTitle: video.title,
                scriptPlan: state.scriptPlan,
                userAnswers: answersText,
                settings,
                refinementText: state.scriptRefinementText // Pass refinement text
            });
            await onUpdate({ finalScript: result.finalScript });
            setState({ isLoading: false, finalScript: result.finalScript, scriptRefinementText: '' }); // Clear on success
        } catch (error) {
            console.error('Error refining final script:', error);
            setState({ isLoading: false, errorMessage: `Failed to refine script. ${error.message}` });
        }
    };

    const handleSaveAndClose = () => {
        onSave({ ...video, script: state.finalScript, scriptPlan: state.scriptPlan });
        modal.close();
        modal.remove();
    };
    
    const openTeleprompter = () => {
        const teleprompter = FullScreenScriptView({
            script: state.finalScript,
            onClose: () => document.querySelector('.teleprompter-view')?.remove()
        });
        document.body.appendChild(teleprompter);
    };

    const render = () => {
        const loadingIndicator = state.isLoading ? `<div class="loading-indicator"><div></div><div></div><div></div></div>` : '';
        const errorMessage = state.errorMessage ? `<div class="error-message">${state.errorMessage}</div>` : '';

        let content = '';
        switch (state.currentStage) {
            case 'initial_thoughts':
                content = `
                    <h3 class="text-xl font-bold text-white mb-2">Step 1: Brain Dump</h3>
                    <p class="text-gray-400 mb-4">Let's start with your raw ideas. Don't worry about structure. Just jot down everything you're thinking for this video: key points, locations, things to say, emotions to convey, etc.</p>
                    <textarea class="form-textarea w-full h-64" placeholder="- Start with the crazy story about the cat...\n- Main point: why ancient maps are so cool\n- Visit the old library\n- End with a question for the audience">${state.initialThoughts}</textarea>
                    <button id="braindump-submit" class="button-primary mt-4">Generate Draft Outline</button>
                `;
                break;

            case 'draft_outline_review':
                content = `
                    <h3 class="text-xl font-bold text-white mb-2">Step 2: Review AI-Generated Outline</h3>
                    <p class="text-gray-400 mb-4">Here's a potential structure based on your notes. Review it, and if you want changes, tell the AI what to do in the refinement box below.</p>
                    <textarea class="form-textarea w-full h-64" rows="10">${state.draftOutline}</textarea>
                    
                    <div class="mt-6">
                        <h4 class="text-md font-semibold text-amber-400 mb-2">Refinement Instructions</h4>
                        <p class="text-gray-400 text-sm mb-2">Tell the AI what to change. E.g., "Make the intro shorter and more mysterious," or "Add a section about the local food."</p>
                        <textarea id="outline-refinement-input" class="form-textarea w-full" rows="2" placeholder="Your refinement instructions...">${state.outlineRefinementText}</textarea>
                        <button id="refine-outline" class="button-secondary-small mt-2">✍️ Refine Outline</button>
                    </div>

                    <div class="flex justify-end mt-6">
                        <button id="restart-outline" class="button-secondary mr-2">Start Over</button>
                        <button id="approve-outline" class="button-primary">Looks Good, Ask Me More</button>
                    </div>
                `;
                break;
            
            case 'question_answering':
                content = `
                    <h3 class="text-xl font-bold text-white mb-2">Step 3: Answer a Few Questions</h3>
                    <p class="text-gray-400 mb-4">To make your script sound authentic, please answer these specific questions. Your answers will be woven directly into the final script.</p>
                    <div class="space-y-4 max-h-96 overflow-y-auto pr-2">
                        ${state.locationQuestions.map((q, index) => `
                            <div class="bg-gray-800 p-3 rounded-lg">
                                <label class="block text-md font-semibold text-amber-400 mb-2">${q.question}</label>
                                <textarea class="form-textarea w-full" data-question-index="${index}" rows="3" placeholder="Your detailed answer...">${state.questionAnswers[index] || ''}</textarea>
                            </div>
                        `).join('')}
                    </div>
                    <button id="answers-submit" class="button-primary mt-6">Generate Full Script</button>
                `;
                break;

            case 'full_script_review':
                content = `
                    <h3 class="text-xl font-bold text-white mb-2">Step 4: Final Script Review</h3>
                    <p class="text-gray-400 mb-4">Here is the complete, ready-to-record script. Read it through. You can edit it directly or use the refinement box to ask the AI for changes.</p>
                    <textarea class="form-textarea w-full h-80" id="final-script-textarea">${state.finalScript}</textarea>

                    <div class="mt-6">
                        <h4 class="text-md font-semibold text-amber-400 mb-2">Refinement Instructions</h4>
                        <p class="text-gray-400 text-sm mb-2">E.g., "Make the conclusion more powerful," or "Rewrite the intro to be funnier."</p>
                        <textarea id="script-refinement-input" class="form-textarea w-full" rows="2" placeholder="Your refinement instructions...">${state.scriptRefinementText}</textarea>
                        <button id="refine-script" class="button-secondary-small mt-2">✍️ Refine Script</button>
                    </div>
                    
                    <div class="flex justify-between items-center mt-6">
                         <button id="teleprompter-btn" class="button-secondary">🎬 Go to Teleprompter</button>
                         <button id="save-close" class="button-primary">Save and Close</button>
                    </div>
                `;
                break;
        }

        modal.innerHTML = `
            <div class="modal-content-container">
                <div class="modal-content bg-gray-900 text-white rounded-lg shadow-xl p-6 relative max-w-4xl w-full">
                    <button class="modal-close-button">&times;</button>
                    ${loadingIndicator}
                    ${errorMessage}
                    ${content}
                </div>
            </div>
        `;

        // Event Listeners
        modal.querySelector('.modal-close-button')?.addEventListener('click', () => {
            modal.close();
            modal.remove();
        });

        // Stage-specific listeners
        if (state.currentStage === 'initial_thoughts') {
            modal.querySelector('textarea').addEventListener('input', (e) => setState({ initialThoughts: e.target.value }));
            modal.querySelector('#braindump-submit').addEventListener('click', handleInitialThoughtsSubmit);
        } else if (state.currentStage === 'draft_outline_review') {
            modal.querySelector('textarea').addEventListener('input', (e) => setState({ draftOutline: e.target.value }));
            modal.querySelector('#outline-refinement-input').addEventListener('input', (e) => setState({ outlineRefinementText: e.target.value }));
            modal.querySelector('#refine-outline').addEventListener('click', handleOutlineRefinement);
            modal.querySelector('#approve-outline').addEventListener('click', handleOutlineApproval);
            modal.querySelector('#restart-outline').addEventListener('click', () => setState({ currentStage: 'initial_thoughts' }));
        } else if (state.currentStage === 'question_answering') {
            modal.querySelectorAll('textarea').forEach(textarea => {
                textarea.addEventListener('input', (e) => {
                    const index = e.target.dataset.questionIndex;
                    const newAnswers = { ...state.questionAnswers, [index]: e.target.value };
                    setState({ questionAnswers: newAnswers });
                });
            });
            modal.querySelector('#answers-submit').addEventListener('click', handleAnswersSubmit);
        } else if (state.currentStage === 'full_script_review') {
            modal.querySelector('#final-script-textarea').addEventListener('input', (e) => setState({ finalScript: e.target.value }));
            modal.querySelector('#script-refinement-input').addEventListener('input', (e) => setState({ scriptRefinementText: e.target.value }));
            modal.querySelector('#refine-script').addEventListener('click', handleScriptRefinement);
            modal.querySelector('#teleprompter-btn').addEventListener('click', openTeleprompter);
            modal.querySelector('#save-close').addEventListener('click', handleSaveAndClose);
        }
    };

    modal.showModal = () => modal.style.display = 'flex';
    modal.close = () => modal.style.display = 'none';

    // Initial render
    render();

    return modal;
};
