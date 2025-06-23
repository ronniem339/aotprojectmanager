// creators-hub/js/components/BlogTool.js
window.BlogTool = ({ settings, onBack, onGeneratePost, onPublishPosts, taskQueue, onViewPost, userId, db }) => {
    const { useState, useEffect, useMemo } = React;
    const [ideas, setIdeas] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedIdeas, setSelectedIdeas] = useState([]);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

    const { APP_ID } = window.CREATOR_HUB_CONFIG;
    const ideasCollectionRef = useMemo(() => db.collection(`artifacts/${APP_ID}/users/${userId}/blogIdeas`), [db, APP_ID, userId]);

    useEffect(() => {
        const unsubscribe = ideasCollectionRef.onSnapshot(
            snapshot => {
                const fetchedIdeas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                fetchedIdeas.sort((a, b) => (a.createdAt?.seconds || 0) < (b.createdAt?.seconds || 0) ? 1 : -1);
                setIdeas(fetchedIdeas);
                setIsLoading(false);
            },
            err => {
                console.error("Error fetching blog ideas:", err);
                setIsLoading(false);
            }
        );
        return () => unsubscribe();
    }, [ideasCollectionRef]);

    const handleGenerateIdeas = async (e) => {
        e.preventDefault();
        const destination = e.target.elements.destination.value;
        if (!destination) { alert("Please provide a destination or topic."); return; }
        
        const generateBtn = e.target.querySelector('button[type="submit"]');
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Generating...';

        try {
            const newIdeas = await window.aiUtils.generateBlogPostIdeasAI({
                destination, settings,
                coreSeoEngine: settings.knowledgeBases.blog.coreSeoEngine,
                monetizationGoals: settings.knowledgeBases.blog.monetizationGoals,
                ideaGenerationKb: settings.knowledgeBases.blog.ideaGeneration
            });
            
            const batch = db.batch();
            newIdeas.forEach(idea => {
                const docRef = ideasCollectionRef.doc();
                batch.set(docRef, { ...idea, status: 'new', createdAt: firebase.firestore.FieldValue.serverTimestamp() });
            });
            await batch.commit();
        } catch (err) {
            alert(`Failed to generate ideas: ${err.message}`);
        } finally {
            generateBtn.disabled = false;
            generateBtn.textContent = 'Generate Ideas';
        }
    };

    const handleIdeaAction = async (ideaId, action) => {
        const ideaRef = ideasCollectionRef.doc(ideaId);
        if (action === 'approve') await ideaRef.update({ status: 'approved' });
        else if (action === 'delete') {
            await ideaRef.delete();
            setSelectedIdeas(prev => prev.filter(id => id !== ideaId));
        }
    };
    
    const handleCheckboxChange = (e, ideaId) => {
        setSelectedIdeas(p => e.target.checked ? [...p, ideaId] : p.filter(id => id !== ideaId));
    };

    const handleSelectAllApproved = () => {
        const approvedIds = ideas.filter(idea => ['approved', 'generated'].includes(idea.status)).map(idea => idea.id);
        setSelectedIdeas(approvedIds);
    };
    
    const handleUnselectAll = () => {
        setSelectedIdeas([]);
    };

    const handlePublishClick = () => {
        const ideasToPublish = ideas.filter(idea => selectedIdeas.includes(idea.id));
        onPublishPosts(ideasToPublish);
        setSelectedIdeas([]);
    };

    const renderIdeaCard = (idea) => {
        const task = taskQueue.find(t => t.id === `generate-${idea.id}` || t.id === `publish-${idea.id}`);
        const currentStatus = task ? task.status : idea.status;
        const statusMap = { new: 'New', approved: 'Approved', generating: 'Generating...', 'in-progress': 'In Progress...', generated: 'Generated', publishing: 'Publishing...', published: 'Published', failed: 'Failed' };
        const colorMap = { new: 'bg-yellow-200 text-yellow-800', approved: 'bg-blue-200 text-blue-800', generating: 'bg-indigo-200 text-indigo-800 animate-pulse', 'in-progress': 'bg-indigo-200 text-indigo-800 animate-pulse', generated: 'bg-green-200 text-green-800', publishing: 'bg-purple-200 text-purple-800 animate-pulse', published: 'bg-teal-200 text-teal-800', failed: 'bg-red-300 text-red-900' };
        
        return (
            <div key={idea.id} className="bg-gray-800 p-4 rounded-lg shadow-md border border-gray-700 flex flex-col">
                <h4 className="font-bold text-base mb-2">{idea.title}</h4>
                <p className="text-xs text-gray-400 italic mb-4" title={idea.description}>{idea.description}</p>
                <div className="mt-auto pt-3 border-t border-gray-700">
                    <div className="flex justify-between items-center mb-3">
                         <span className={`text-xs font-semibold px-2 py-1 rounded-full ${colorMap[currentStatus] || 'bg-gray-200 text-gray-800'}`}>{statusMap[currentStatus] || currentStatus}</span>
                         <div>
                            {idea.status === 'new' && <button onClick={() => handleIdeaAction(idea.id, 'approve')} className="text-green-400 hover:text-green-300 mr-3" title="Approve"><i className="fas fa-check-circle fa-lg"></i></button>}
                            <button onClick={() => handleIdeaAction(idea.id, 'delete')} className="text-red-400 hover:text-red-300" title="Delete"><i className="fas fa-trash-alt fa-lg"></i></button>
                         </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <input type="checkbox" className="form-checkbox h-5 w-5 bg-gray-800 border-gray-600 rounded text-blue-500 focus:ring-blue-500" disabled={!['approved', 'generated'].includes(idea.status)} checked={selectedIdeas.includes(idea.id)} onChange={(e) => handleCheckboxChange(e, idea.id)} />
                        <div className="flex items-center space-x-2">
                             {idea.status === 'approved' && <button onClick={() => onGeneratePost(idea)} className="text-xs bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-md">Generate Content</button>}
                             {idea.status === 'generated' && <button onClick={() => onViewPost(`generate-${idea.id}`)} className="text-xs bg-green-600 hover:bg-green-700 px-3 py-1 rounded-md">View Content</button>}
                             {idea.status === 'published' && idea.wordpressLink && <a href={idea.wordpressLink} target="_blank" rel="noopener noreferrer" className="text-xs bg-teal-600 hover:bg-teal-700 px-3 py-1 rounded-md">View on WP</a>}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderIdeaRow = (idea) => {
        const task = taskQueue.find(t => t.id === `generate-${idea.id}` || t.id === `publish-${idea.id}`);
        const currentStatus = task ? task.status : idea.status;
        const statusMap = { new: 'New', approved: 'Approved', generating: 'Generating...', 'in-progress': 'In Progress...', generated: 'Generated', publishing: 'Publishing...', published: 'Published', failed: 'Failed' };
        
        return (
            <tr key={idea.id} className="hover:bg-gray-800/50">
                <td className="p-3 w-1/12 text-center">
                    <input type="checkbox" className="form-checkbox h-5 w-5 bg-gray-800 border-gray-600 rounded text-blue-500 focus:ring-blue-500" disabled={!['approved', 'generated'].includes(idea.status)} checked={selectedIdeas.includes(idea.id)} onChange={(e) => handleCheckboxChange(e, idea.id)} />
                </td>
                <td className="p-3 w-4/12 font-semibold text-primary-accent">{idea.title}</td>
                <td className="p-3 w-2/12"><span className="px-2 py-1 text-xs bg-teal-800 text-teal-200 rounded-full">{idea.postType}</span></td>
                <td className="p-3 w-2/12 text-sm text-gray-300">{idea.primaryKeyword}</td>
                <td className="p-3 w-2/12">
                    <span className={`px-2 py-1 text-xs rounded-full capitalize
                        ${currentStatus === 'new' ? 'bg-yellow-200 text-yellow-800' : ''}
                        ${currentStatus === 'approved' ? 'bg-blue-200 text-blue-800' : ''}
                        ${currentStatus === 'generating' || currentStatus === 'in-progress' || currentStatus === 'publishing' ? 'bg-indigo-200 text-indigo-800 animate-pulse' : ''}
                        ${currentStatus === 'generated' ? 'bg-green-200 text-green-800' : ''}
                        ${currentStatus === 'published' ? 'bg-teal-200 text-teal-800' : ''}
                        ${currentStatus === 'failed' ? 'bg-red-300 text-red-900' : ''}
                    `}>
                        {statusMap[currentStatus] || currentStatus}
                    </span>
                </td>
                <td className="p-3 w-1/12 text-right space-x-2">
                    {idea.status === 'new' && <button onClick={() => handleIdeaAction(idea.id, 'approve')} className="text-green-400 hover:text-green-300" title="Approve"><i className="fas fa-check-circle"></i></button>}
                    {idea.status === 'approved' && <button onClick={() => onGeneratePost(idea)} className="text-blue-400 hover:text-blue-300" title="Generate Content"><i className="fas fa-magic"></i></button>}
                    {idea.status === 'generated' && <button onClick={() => onViewPost(`generate-${idea.id}`)} className="text-green-400 hover:text-green-300" title="View Content"><i className="fas fa-eye"></i></button>}
                    {idea.status === 'published' && idea.wordpressLink && <a href={idea.wordpressLink} target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:text-teal-300" title="View on WordPress"><i className="fab fa-wordpress"></i></a>}
                    <button onClick={() => handleIdeaAction(idea.id, 'delete')} className="text-red-400 hover:text-red-300" title="Delete"><i className="fas fa-trash-alt"></i></button>
                </td>
            </tr>
        );
    }

    return (
        <div className="p-4 sm:p-6">
            <header className="flex flex-col sm:flex-row justify-between items-center mb-6 sm:mb-8 gap-4">
                <h1 className="text-3xl sm:text-4xl font-bold text-white text-center sm:text-left">✍️ Blog Post Factory</h1>
                <button onClick={onBack} className="flex items-center gap-2 glass-card px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors w-full sm:w-auto justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to Tools
                </button>
            </header>

            <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-8 border border-gray-700">
                <form onSubmit={handleGenerateIdeas}>
                    <div className="flex gap-4"><input type="text" id="destination" name="destination" className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" placeholder="Enter a destination or topic..." /><button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md">Generate Ideas</button></div>
                </form>
            </div>
            
            <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                <div className="flex items-center gap-4">
                    <h3 className="text-xl font-bold">Content Pipeline</h3>
                    <div className="hidden sm:flex items-center bg-gray-700 p-1 rounded-lg">
                        <button onClick={() => setViewMode('grid')} className={`px-3 py-1 text-sm rounded-md ${viewMode === 'grid' ? 'bg-blue-600' : 'hover:bg-gray-600'}`}><i className="fas fa-th-large"></i></button>
                        <button onClick={() => setViewMode('list')} className={`px-3 py-1 text-sm rounded-md ${viewMode === 'list' ? 'bg-blue-600' : 'hover:bg-gray-600'}`}><i className="fas fa-bars"></i></button>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleSelectAllApproved} className="text-xs bg-gray-600 hover:bg-gray-500 px-3 py-1 rounded-md">Select All Approved</button>
                    <button onClick={handleUnselectAll} className="text-xs bg-gray-600 hover:bg-gray-500 px-3 py-1 rounded-md">Unselect All</button>
                    <button onClick={handlePublishClick} disabled={selectedIdeas.length === 0} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-md disabled:opacity-50">Publish ({selectedIdeas.length}) to WordPress</button>
                </div>
            </div>

            {isLoading ? <window.LoadingSpinner text="Loading pipeline..."/> : ideas.length > 0 ? (
                viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">{ideas.map(renderIdeaCard)}</div>
                ) : (
                    <div className="overflow-x-auto bg-gray-800 rounded-lg border border-gray-700">
                        <table className="w-full text-left table-auto">
                            <thead className="bg-gray-900/50">
                                <tr>
                                    <th className="p-3 text-sm font-semibold w-1/12 text-center">Select</th>
                                    <th className="p-3 text-sm font-semibold w-4/12">Title</th>
                                    <th className="p-3 text-sm font-semibold w-2/12">Type</th>
                                    <th className="p-3 text-sm font-semibold w-2/12">Keyword</th>
                                    <th className="p-3 text-sm font-semibold w-2/12">Status</th>
                                    <th className="p-3 text-sm font-semibold w-1/12 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {ideas.map(renderIdeaRow)}
                            </tbody>
                        </table>
                    </div>
                )
            ) : <p className="text-gray-400 p-4 bg-gray-800 rounded-lg">No ideas yet. Use the generator above!</p>}
        </div>
    );
};
