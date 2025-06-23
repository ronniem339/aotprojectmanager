// creators-hub/js/components/WordpressPublisher.js

function WordpressPublisher(ideas, onPublish, onCancel) {
    let categories = [];
    let selectedCategoryId = '';
    let isLoading = true;
    let error = null;

    const fetchCategories = async () => {
        try {
            const app = window.app;
            const wordpressSettings = app.getWordpressSettings();
            if (wordpressSettings && wordpressSettings.url && wordpressSettings.username && wordpressSettings.applicationPassword) {
                 categories = await window.wordpressUtils.getWordPressCategories(wordpressSettings);
                 if (categories.length === 0) {
                    error = "No categories found. Check permissions or create categories in WordPress."
                 }
            } else {
                 error = "WordPress settings are not fully configured.";
                 console.log(error);
            }
        } catch (e) {
            console.error('Failed to fetch WordPress categories:', e);
            error = "Failed to fetch categories. See console for details.";
        } finally {
            isLoading = false;
            // This is a crude way to re-render.
            const modal = document.getElementById('wordpress-publisher-modal');
            if (modal) {
                 const select = modal.querySelector('#wp-category-select');
                 const loadingIndicator = modal.querySelector('.loading-indicator');
                 const errorContainer = modal.querySelector('.error-container');
                 
                 if(select) {
                    select.innerHTML = generateCategoryOptions();
                    select.disabled = false;
                 }
                 if(loadingIndicator) loadingIndicator.classList.add('hidden');
                 if(errorContainer && error) {
                    errorContainer.textContent = error;
                    errorContainer.classList.remove('hidden');
                 }
            }
        }
    };

    const generateCategoryOptions = () => {
        if (isLoading) {
            return '<option disabled>Loading categories...</option>';
        }
        if (categories.length === 0) {
            return '<option value="">No categories found</option>';
        }
        return [
            '<option value="">Uncategorized</option>',
            ...categories.map(cat => `<option value="${cat.id}" ${cat.id == selectedCategoryId ? 'selected' : ''}>${cat.name}</option>`)
        ].join('');
    };

    // Asynchronously fetch categories right after the initial render.
    setTimeout(fetchCategories, 0);

    return `
        <div id="wordpress-publisher-modal" class="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-40">
            <div class="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
                <h3 class="text-xl font-bold mb-4">Publish to WordPress</h3>
                <p class="mb-4">You are about to publish ${ideas.length} blog post(s) to WordPress as drafts.</p>
                
                <div class="error-container text-red-400 text-sm mb-4 hidden"></div>

                <div class="mb-4">
                    <label for="wp-category-select" class="block text-sm font-medium text-gray-300 mb-2">Select Category</label>
                    <div class="relative">
                       <select id="wp-category-select" class="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" ${isLoading ? 'disabled' : ''}>
                          ${generateCategoryOptions()}
                       </select>
                       <div class="loading-indicator absolute right-2 top-2.5 ${!isLoading ? 'hidden' : ''}"><i class="fas fa-spinner fa-spin"></i></div>
                    </div>
                </div>

                <div class="flex justify-end space-x-4">
                    <button id="cancel-wp-publish" class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded">Cancel</button>
                    <button id="confirm-wp-publish" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">Publish</button>
                </div>
            </div>
        </div>
    `;
}
