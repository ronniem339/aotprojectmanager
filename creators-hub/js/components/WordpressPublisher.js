// creators-hub/js/components/WordpressPublisher.js
window.WordpressPublisher = ({ ideas, settings, onPublish, onCancel }) => {
    const { useState, useEffect } = React;
    const [categories, setCategories] = useState([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchCategories = async () => {
            const wordpressConfig = settings.wordpress;
            if (!wordpressConfig?.url || !wordpressConfig?.username || !wordpressConfig?.applicationPassword) {
                setError("WordPress settings are not fully configured. Please check the 'WordPress Settings' section within the Technical Settings.");
                setIsLoading(false);
                return;
            }
            try {
                const fetchedCategories = await window.wordpressUtils.getWordPressCategories(wordpressConfig);
                setCategories(fetchedCategories);
                if (fetchedCategories.length === 0) {
                   setError("No categories found. Please create categories in WordPress or check API permissions.");
                }
            } catch (e) {
                console.error("Failed to fetch WordPress categories:", e);
                setError("Failed to fetch categories. Check console for details.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchCategories();
    }, [settings.wordpress]);

    const handlePublish = () => {
        // Pass the ideas array and the selected category ID to the handler in app.js
        onPublish(ideas, selectedCategoryId);
    };

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-40 animate-fade-in">
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md border border-gray-700">
                <h3 className="text-xl font-bold mb-4">Publish to WordPress</h3>
                <p className="mb-4">You are about to publish {ideas.length} post(s) as drafts. Please select a category below.</p>

                {error && <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-2 rounded-md text-sm mb-4">{error}</div>}

                <div className="mb-6">
                    <label htmlFor="wp-category-select" className="block text-sm font-medium text-gray-300 mb-2">WordPress Category</label>
                    <div className="relative">
                       <select 
                           id="wp-category-select" 
                           value={selectedCategoryId}
                           onChange={(e) => setSelectedCategoryId(e.target.value)}
                           className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" 
                           disabled={isLoading}
                       >
                          <option value="">Uncategorized</option>
                          {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                       </select>
                       {isLoading && <div className="absolute right-3 top-1/2 -translate-y-1/2"><i className="fas fa-spinner fa-spin"></i></div>}
                    </div>
                </div>

                <div className="flex justify-end space-x-4">
                    <button onClick={onCancel} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md font-semibold">Cancel</button>
                    <button onClick={handlePublish} disabled={isLoading} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md font-semibold disabled:opacity-50">Confirm & Publish</button>
                </div>
            </div>
        </div>
    );
};
