// creators-hub/js/components/BlogTool.js

const BlogTool = {
    selectedIdeas: [],

    init: function() {
        const container = document.getElementById('blog-tool-container');
        if (!container) return;

        this.render();
        this.postRender();
    },
    
    postRender: function() {
        const container = document.getElementById('blog-tool-container');
        if (!container) return;

        const ideaForm = document.getElementById('blog-idea-form');
        if (ideaForm) {
            ideaForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleGenerateIdeas();
            });
        }
        
        container.addEventListener('click', (e) => {
            const approveBtn = e.target.closest('.approve-idea-btn');
            const deleteBtn = e.target.closest('.delete-idea-btn');
            const generateBtn = e.target.closest('.generate-post-btn');
            const viewBtn = e.target.closest('.view-post-btn');
            const publishBtn = e.target.closest('#publish-to-wp-btn');
            const confirmPublishBtn = e.target.closest('#confirm-wp-publish');
            const cancelPublishBtn = e.target.closest('#cancel-wp-publish');

            if (approveBtn) this.handleApproveIdea(approveBtn.dataset.ideaId);
            else if (deleteBtn) this.handleDeleteIdea(deleteBtn.dataset.ideaId);
            else if (generateBtn) this.handleGenerateSinglePost(generateBtn.dataset.ideaId);
            else if (viewBtn) this.handleViewPost(viewBtn.dataset.ideaId);
            else if (publishBtn) this.handlePublishClick();
            else if (confirmPublishBtn) {
                const selectedCategoryId = document.getElementById('wp-category-select').value;
                this.confirmPublish(selectedCategoryId);
            }
            else if (cancelPublishBtn) this.cancelPublish();
        });

        container.addEventListener('change', (e) => {
            if (e.target.classList.contains('blog-idea-checkbox')) {
                this.handleCheckboxChange(e.target);
            }
        });
    },

    handleGenerateIdeas: async function() {
        const topic = document.getElementById('idea-topic').value;
        const tone = document.getElementById('idea-tone').value;
        const generateBtn = document.getElementById('generate-ideas-btn');
        if (!topic) {
            alert("Please enter a topic.");
            return;
        }

        generateBtn.disabled = true;
        generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';

        try {
            const ideas = await window.aiUtils.generateBlogIdeas(topic, tone);
            const newIdeas = ideas.map(idea => ({
                id: `idea-${Date.now()}-${Math.random()}`,
                title: idea.title,
                keywords: idea.keywords,
                tone: tone,
                status: 'New',
                content: ''
            }));
            window.app.blogIdeas = [...newIdeas, ...window.app.blogIdeas];
            window.app.saveBlogIdeas();
            this.init(); // Re-initialize to render changes
        } catch (error) {
            console.error("Failed to generate blog ideas:", error);
            alert("There was an error generating ideas. Please check the console.");
        } finally {
            generateBtn.disabled = false;
            generateBtn.textContent = 'Generate Ideas';
        }
    },
    
    handleGenerateSinglePost: function(ideaId) {
        const idea = window.app.blogIdeas.find(i => i.id === ideaId);
        if (!idea) return;

        const task = {
            id: `generate-${ideaId}`,
            name: `Generating post: "${idea.title}"`,
            type: 'generateBlogContent',
            status: 'pending',
            data: { ideaId: ideaId }
        };
        
        window.app.addTask(task);
    },
    
    handleViewPost: function(ideaId) {
        const idea = window.app.blogIdeas.find(i => i.id === ideaId);
        if (idea && idea.content) {
            window.app.showGeneratedPostModal(idea.content);
        }
    },
    
    handleApproveIdea: function(ideaId) {
        const idea = window.app.blogIdeas.find(i => i.id === ideaId);
        if (idea) {
            idea.status = 'Approved';
            window.app.saveBlogIdeas();
            this.init();
        }
    },
    
    handleDeleteIdea: function(ideaId) {
        window.app.blogIdeas = window.app.blogIdeas.filter(i => i.id !== ideaId);
        window.app.saveBlogIdeas();
        this.init();
    },

    handleCheckboxChange: function(checkbox) {
        const ideaId = checkbox.dataset.ideaId;
        if (checkbox.checked) {
            if (!this.selectedIdeas.includes(ideaId)) {
                this.selectedIdeas.push(ideaId);
            }
        } else {
            this.selectedIdeas = this.selectedIdeas.filter(id => id !== ideaId);
        }
        
        const publishBtn = document.getElementById('publish-to-wp-btn');
        if(publishBtn) {
            publishBtn.disabled = this.selectedIdeas.length === 0;
        }
    },
    
    handlePublishClick: function() {
        const ideasToPublish = window.app.blogIdeas.filter(idea => this.selectedIdeas.includes(idea.id));
        
        const publisherContainer = document.getElementById('wordpress-publisher-container');
        publisherContainer.innerHTML = WordpressPublisher(
            ideasToPublish,
            (categoryId) => this.confirmPublish(categoryId),
            () => this.cancelPublish()
        );
    },
    
    confirmPublish: function(categoryId) {
         this.selectedIdeas.forEach(ideaId => {
            const idea = window.app.blogIdeas.find(i => i.id === ideaId);
            if(idea && ['Approved', 'Generated'].includes(idea.status)) {
                const task = {
                    id: `publish-${ideaId}`,
                    name: `Publishing: "${idea.title}"`,
                    type: 'publishToWordPress',
                    status: 'pending',
                    data: { ideaId: ideaId, categoryId: categoryId }
                };
                window.app.addTask(task);
            }
        });
        
        this.selectedIdeas = [];
        this.cancelPublish();
        this.init();
    },

    cancelPublish: function() {
        const publisherContainer = document.getElementById('wordpress-publisher-container');
        if (publisherContainer) {
            publisherContainer.innerHTML = '';
        }
    },

    render: function() {
        const container = document.getElementById('blog-tool-container');
        if (!container) return;

        const { blogIdeas } = window.app;
        const newIdeas = blogIdeas.filter(i => i.status === 'New');
        const processedIdeas = blogIdeas.filter(i => ['Approved', 'Generated', 'Published'].includes(i.status));

        const renderIdea = (idea, isNewList) => {
            const isChecked = this.selectedIdeas.includes(idea.id);
            const canBeSelected = ['Approved', 'Generated'].includes(idea.status);
            
            return `
            <div class="flex items-center p-3 border-b border-gray-700 last:border-b-0">
                ${!isNewList ? `<div class="flex-shrink-0 w-8 text-center">
                     <input type="checkbox" class="blog-idea-checkbox form-checkbox h-5 w-5 bg-gray-800 border-gray-600 rounded text-blue-500 focus:ring-blue-500" data-idea-id="${idea.id}" ${isChecked ? 'checked' : ''} ${!canBeSelected ? 'disabled' : ''}>
                </div>` : '<div class="w-8"></div>'}
                <div class="flex-grow ml-2">
                    <h4 class="font-bold">${idea.title}</h4>
                    <p class="text-sm text-gray-400">${idea.keywords}</p>
                </div>
                <div class="flex-shrink-0 flex items-center space-x-2">
                     <span class="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full ${
                        {'New': 'text-yellow-600 bg-yellow-200', 'Approved': 'text-blue-600 bg-blue-200', 'Generated': 'text-green-600 bg-green-200', 'Published': 'text-purple-600 bg-purple-200'}[idea.status]
                     }">${idea.status}</span>
    
                    ${idea.status === 'Approved' ? `<button class="generate-post-btn bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-2 rounded text-xs" data-idea-id="${idea.id}">Generate</button>`: ''}
                    ${idea.status === 'Generated' ? `<button class="view-post-btn bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-2 rounded text-xs" data-idea-id="${idea.id}" data-task-id="generate-${idea.id}">View</button>`: ''}
                    ${idea.status === 'Published' ? `<a href="${idea.wordpressLink}" target="_blank" class="bg-purple-500 hover:bg-purple-600 text-white font-bold py-1 px-2 rounded text-xs">View on WP</a>`: ''}
                    ${isNewList ? `<button class="approve-idea-btn text-green-400 hover:text-green-300" data-idea-id="${idea.id}"><i class="fas fa-check"></i></button>` : ''}
                     <button class="delete-idea-btn text-red-400 hover:text-red-300" data-idea-id="${idea.id}"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `};
        
        container.innerHTML = `
        <div id="blog-ideas-dashboard" class="p-4 sm:p-6">
            <h2 class="text-2xl font-bold mb-6">Blog Post Idea Manager</h2>
    
            <div class="bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
                <form id="blog-idea-form">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label for="idea-topic" class="block text-sm font-medium text-gray-300 mb-2">Topic / Keyword</label>
                            <input type="text" id="idea-topic" class="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" placeholder="e.g., Best beaches in Thailand">
                        </div>
                        <div>
                            <label for="idea-tone" class="block text-sm font-medium text-gray-300 mb-2">Tone of Voice</label>
                            <select id="idea-tone" class="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5">
                                <option>Adventurous</option>
                                <option>Luxury</option>
                                <option>Budget-conscious</option>
                                <option>Funny</option>
                                <option>Informative</option>
                            </select>
                        </div>
                    </div>
                    <div class="mt-6 text-right">
                        <button type="submit" id="generate-ideas-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded">Generate Ideas</button>
                    </div>
                </form>
            </div>
    
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <h3 class="text-xl font-bold mb-4">New Ideas</h3>
                    <div class="bg-gray-800 rounded-lg shadow-lg max-h-[40rem] overflow-y-auto">
                        ${newIdeas.length > 0 ? newIdeas.map(idea => renderIdea(idea, true)).join('') : '<p class="p-4 text-gray-400">No new ideas yet.</p>'}
                    </div>
                </div>
    
                <div>
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold">Approved & Published</h3>
                         <button id="publish-to-wp-btn" class="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed" ${this.selectedIdeas.length === 0 ? 'disabled' : ''}>Publish to WordPress</button>
                    </div>
                    <div class="bg-gray-800 rounded-lg shadow-lg max-h-[40rem] overflow-y-auto">
                        ${processedIdeas.length > 0 ? processedIdeas.map(idea => renderIdea(idea, false)).join('') : '<p class="p-4 text-gray-400">No approved ideas yet.</p>'}
                    </div>
                </div>
            </div>
        </div>
        <div id="wordpress-publisher-container"></div>
        `;
    }
};
