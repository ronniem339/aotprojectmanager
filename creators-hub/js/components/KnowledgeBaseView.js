// js/components/KnowledgeBaseView.js

window.KnowledgeBaseView = ({ settings, onSave, onBack }) => {
    const [activeCategory, setActiveCategory] = useState('youtube'); // 'youtube' or 'blog'
    // Local state for all knowledge bases, reflecting the nested structure
    const [localKnowledgeBases, setLocalKnowledgeBases] = useState(settings.knowledgeBases || {
        youtube: {
            whoAmI: '', videoTitles: '', videoDescriptions: '', thumbnailIdeas: '',
            firstPinnedCommentExpert: '', shortsIdeaGeneration: '', youtubeSeoKnowledgeBase: ''
        },
        blog: {
            postIdeaGeneration: '', postDetailedWriter: '', postSeoWriter: '', postAffiliateWriter: ''
        }
    });

    // Sync local state with props when settings change
    useEffect(() => {
        setLocalKnowledgeBases(settings.knowledgeBases || {
            youtube: {
                whoAmI: '', videoTitles: '', videoDescriptions: '', thumbnailIdeas: '',
                firstPinnedCommentExpert: '', shortsIdeaGeneration: '', youtubeSeoKnowledgeBase: ''
            },
            blog: {
                postIdeaGeneration: '', postDetailedWriter: '', postSeoWriter: '', postAffiliateWriter: ''
            }
        });
    }, [settings.knowledgeBases]);

    // Handles changes for any nested knowledge base field
    const handleChange = (category, key, value) => {
        setLocalKnowledgeBases(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                [key]: value
            }
        }));
    };

    const handleSave = () => {
        // Pass the updated nested knowledgeBases object back to the parent (App.js)
        onSave({ ...settings, knowledgeBases: localKnowledgeBases });
    };

    // Define the structure and display for each knowledge base
    const youtubeKbs = [
        { id: 'whoAmI', title: 'Who Am I', description: 'Describe your persona, brand voice, and unique perspective.', placeholder: 'e.g., "I am an adventurous travel vlogger focusing on hidden gems and authentic experiences, with a friendly and informative tone."'},
        { id: 'videoTitles', title: 'YouTube Video Titles', description: 'Best practices and specific rules for crafting engaging video titles.', placeholder: 'e.g., "Titles should be under 70 characters. Use strong verbs. Include numbers where applicable."'},
        { id: 'videoDescriptions', title: 'YouTube Video Descriptions', description: 'Guidelines for writing SEO-rich descriptions.', placeholder: 'e.g., "Always include a strong hook in the first 3 lines. Utilize keywords naturally throughout the description."'},
        { id: 'thumbnailIdeas', title: 'YouTube Thumbnail Ideas', description: 'Principles for creating high-CTR thumbnails.', placeholder: 'e.g., "High contrast colors, clear subject, minimal text, strong emotions."'},
        { id: 'firstPinnedCommentExpert', title: 'First Pinned Comment Expert', description: 'Advice for crafting engaging first comments to boost interaction.', placeholder: 'e.g., "Ask an open-ended question. Include a call to action to subscribe."'},
        { id: 'shortsIdeaGeneration', title: 'YouTube Shorts Ideas', description: 'Strategies for viral short-form video concepts.', placeholder: 'e.g., "Focus on quick hooks. Use trending sounds and challenges."'},
        { id: 'youtubeSeoKnowledgeBase', title: 'General YouTube SEO', description: 'Overall YouTube SEO best practices.', placeholder: 'e.g., "Always use relevant tags. Optimize for watch time. Engage with comments."'},
    ];

    const blogKbs = [
        { id: 'postIdeaGeneration', title: 'Blog Post Idea Generation', description: 'Strategies for coming up with engaging blog post concepts from video content.', placeholder: 'e.g., "Transform video chapters into distinct blog topics. Brainstorm related keywords."'},
        { id: 'postDetailedWriter', title: 'Blog Post Detailed Writer', description: 'Guidelines for converting video scripts into long-form blog posts (2000+ words).', placeholder: 'e.g., "Expand on script points with additional research. Ensure smooth transitions between sections."'},
        { id: 'postSeoWriter', title: 'Blog Post SEO Writer', description: 'Tips for crafting SEO-friendly shorter blog content like listicles.', placeholder: 'e.g., "Focus on clear headings (H1, H2, H3). Use bullet points for readability."'},
        { id: 'postAffiliateWriter', title: 'Blog Post Affiliate Writer', description: 'Best practices for writing blog posts recommending hotels/experiences with affiliate links.', placeholder: 'e.g., "Provide honest reviews. Clearly disclose affiliate partnerships. Integrate links naturally."'},
    ];

    const currentKbs = activeCategory === 'youtube' ? youtubeKbs : blogKbs;

    return (
        <div className="p-8">
            <button onClick={onBack} className="flex items-center gap-2 text-secondary-accent hover:text-secondary-accent-light mb-6">
                ⬅️ Back to Settings Menu
            </button>
            <h1 className="text-4xl font-bold mb-4">📚 Knowledge Bases</h1>
            <p className="text-gray-400 mb-8">Define specific knowledge bases to guide the AI's content generation for different tasks.</p>

            <div className="mb-6 border-b border-gray-700">
                <nav className="flex space-x-4">
                    <button 
                        onClick={() => setActiveCategory('youtube')}
                        className={`py-2 px-4 text-lg font-medium transition-colors ${activeCategory === 'youtube' ? 'text-primary-accent border-b-2 border-primary-accent' : 'text-gray-400 hover:text-white'}`}
                    >
                        YouTube Knowledge Bases
                    </button>
                    <button 
                        onClick={() => setActiveCategory('blog')}
                        className={`py-2 px-4 text-lg font-medium transition-colors ${activeCategory === 'blog' ? 'text-primary-accent border-b-2 border-primary-accent' : 'text-gray-400 hover:text-white'}`}
                    >
                        Blog Knowledge Bases
                    </button>
                </nav>
            </div>

            <div className="space-y-8">
                {currentKbs.map(kb => (
                    <div key={kb.id} className="glass-card p-6 rounded-lg">
                        <h2 className="text-2xl font-semibold text-white mb-2">{kb.title}</h2>
                        <p className="text-gray-400 text-sm mb-4">{kb.description}</p>
                        <textarea
                            name={kb.id}
                            value={localKnowledgeBases[activeCategory][kb.id] || ''}
                            onChange={(e) => handleChange(activeCategory, kb.id, e.target.value)}
                            rows="8"
                            className="w-full form-textarea leading-relaxed"
                            placeholder={kb.placeholder}
                        />
                    </div>
                ))}
            </div>

            <div className="mt-8 text-right">
                <button onClick={handleSave} className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors">
                    Save Knowledge Bases
                </button>
            </div>
        </div>
    );
};
