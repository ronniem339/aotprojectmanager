// js/components/KnowledgeBaseView.js

window.KnowledgeBaseView = ({ settings, onSave, onBack }) => {
    const { useState, useEffect } = React;
    const [activeCategory, setActiveCategory] = useState('blog'); // Default to 'blog' as we are working on it
    
    const defaultKnowledgeBases = {
        youtube: {
            whoAmI: '', videoTitles: '', videoDescriptions: '', thumbnailIdeas: '', videoTags: '',
            firstPinnedCommentExpert: '', shortsIdeaGeneration: '',
        },
        blog: {
            coreSeoEngine: '',
            ideaGeneration: '',
            destinationGuideBlueprint: '',
            listiclePostFramework: '',
            monetizationGoals: '',
            // --- NEW KEYS ADDED FOR NEW POST TYPES ---
            videoCompanionPostBlueprint: '',
            roadTripItineraryBlueprint: '',
            toursAndActivitiesBlueprint: '',
            hotelListicleBlueprint: '',
        },
        storytelling: {
            videoStorytellingPrinciples: '',
        }
    };

    const [localKnowledgeBases, setLocalKnowledgeBases] = useState(() => {
        const savedKbs = settings.knowledgeBases || {};
        return {
            youtube: { ...defaultKnowledgeBases.youtube, ...savedKbs.youtube },
            blog: { ...defaultKnowledgeBases.blog, ...savedKbs.blog },
            storytelling: { ...defaultKnowledgeBases.storytelling, ...savedKbs.storytelling }
        };
    });

    useEffect(() => {
        const savedKbs = settings.knowledgeBases || {};
        setLocalKnowledgeBases({
            youtube: { ...defaultKnowledgeBases.youtube, ...savedKbs.youtube },
            blog: { ...defaultKnowledgeBases.blog, ...savedKbs.blog },
            storytelling: { ...defaultKnowledgeBases.storytelling, ...savedKbs.storytelling }
        });
    }, [settings.knowledgeBases]);

    const handleChange = (category, key, value) => {
        setLocalKnowledgeBases(prev => ({
            ...prev,
            [category]: {
                ...(prev[category] || {}),
                [key]: value
            }
        }));
    };

    const handleSave = () => {
        onSave({ ...settings, knowledgeBases: localKnowledgeBases });
    };

    const youtubeKbs = [
        { id: 'whoAmI', title: 'Who Am I', description: 'Describe your persona, brand voice, and unique perspective.', placeholder: 'e.g., "I am an adventurous travel vlogger focusing on hidden gems and authentic experiences, with a friendly and informative tone."'},
        { id: 'videoTitles', title: 'YouTube Video Titles', description: 'Best practices for crafting engaging video titles.', placeholder: 'e.g., "Titles should be under 70 characters. Use strong verbs. Include numbers where applicable."'},
        { id: 'videoDescriptions', title: 'YouTube Video Descriptions', description: 'Guidelines for writing SEO-rich descriptions.', placeholder: 'e.g., "Always include a strong hook in the first 3 lines. Utilize keywords naturally throughout the description."'},
        { id: 'videoTags', title: 'YouTube Tags', description: 'Best practices for creating a comprehensive list of SEO tags.', placeholder: 'e.g., "Include a mix of broad and specific long-tail keywords. The first tag should be the main target keyword."'},
        { id: 'thumbnailIdeas', title: 'YouTube Thumbnail Ideas', description: 'Principles for creating high-CTR thumbnails.', placeholder: 'e.g., "High contrast colors, clear subject, minimal text, strong emotions."'},
        { id: 'firstPinnedCommentExpert', title: 'First Pinned Comment Expert', description: 'Advice for crafting engaging first comments to boost interaction.', placeholder: 'e.g., "Ask an open-ended question. Include a call to action to subscribe."'},
        { id: 'shortsIdeaGeneration', title: 'YouTube Shorts Ideas', description: 'Strategies for viral short-form video concepts.', placeholder: 'e.g., "Focus on quick hooks. Use trending sounds and challenges."'},
    ];
    
    const blogKbs = [
        { id: 'coreSeoEngine', title: 'Core SEO & Content Engine', description: 'Foundational principles for all blog content to ensure high performance in organic search.', placeholder: 'e.g., "Always target a primary keyword. Use LSI keywords. Ensure content answers user intent. Internal link to relevant posts..."'},
        { id: 'monetizationGoals', title: 'Monetization & Content Goals', description: 'Define the primary business goals for your blog content.', placeholder: 'e.g., "Primary Goal: Drive traffic to my YouTube channel. Secondary Goal: Generate revenue through affiliate links for hotels, tours, and car rentals. All relevant posts should include these types of links."'},
        { id: 'ideaGeneration', title: 'Blog Post Idea Generation', description: 'How to generate a diverse list of SEO-friendly blog post ideas for a given travel destination.', placeholder: 'e.g., "Generate ideas based on question keywords, comparisons (X vs Y), seasonal topics, and different user intents (informational, commercial)..."'},
        { id: 'destinationGuideBlueprint', title: 'Destination Guide Blueprint (Pillar Page)', description: 'The structure for comprehensive, long-form destination guides that act as pillar pages.', placeholder: 'e.g., "Structure: Intro, Why Visit, Top Attractions, Getting Around, Where to Stay, Best Time to Visit, Sample Itinerary, Conclusion..."'},
        { id: 'listiclePostFramework', title: 'Generic Listicle Post Framework', description: 'A general framework for list-based articles. Use the more specific blueprints below for monetized content.', placeholder: 'e.g., "Structure: Engaging intro, each list item with a clear heading (H3), detailed description, pros/cons, and a clear call-to-action..."'},
        // --- NEW DEFINITIONS ADDED FOR UI ---
        { 
            id: 'videoCompanionPostBlueprint', 
            title: 'Video Companion Post Blueprint', 
            description: 'Instructions for rewriting a video script into a detailed, SEO-friendly blog post.',
            placeholder: 'e.g., "Expand on key points from the video. Add more detail and context. Structure with clear headings and subheadings. Embed the original YouTube video prominently. End with a strong call-to-action to watch the video and subscribe."'
        },
        { 
            id: 'hotelListicleBlueprint', 
            title: 'Hotel Listicle Blueprint (Expedia)', 
            description: 'The structure for "Top X Hotels" posts, designed for Expedia affiliate links.',
            placeholder: 'e.g., "Title must be \'Top X [Type] Hotels in [Location] for [Audience]\'. For each hotel, describe its unique selling points and target audience. End each item with the placeholder: [Expedia Affiliate Link Here]."'
        },
        { 
            id: 'roadTripItineraryBlueprint', 
            title: 'Road Trip Itinerary Blueprint (Car Rentals)', 
            description: 'Instructions for creating compelling road trip itineraries that drive car rental affiliate revenue.',
            placeholder: 'e.g., "Structure as a day-by-day guide. Include key stops, driving times, and activity suggestions. Include a clear call-out box for car rentals with the placeholder: [Car Rental Affiliate Link Here]."'
        },
        { 
            id: 'toursAndActivitiesBlueprint', 
            title: 'Tours & Activities Blueprint (Viator)', 
            description: 'The framework for "Best Tours" or "Things to Do" listicles, designed for Viator affiliate links.',
            placeholder: 'e.g., "Title must be \'X Unmissable Tours in [Location]\' or similar. For each tour, explain the experience and what makes it special. End each item with the placeholder: [Viator Affiliate Link Here]."'
        },
    ];

    const storytellingKbs = [
        { 
            id: 'videoStorytellingPrinciples', 
            title: 'Video Storytelling Principles', 
            description: 'The core principles of narrative structure to guide the AI in building compelling video outlines and scripts.', 
            placeholder: 'e.g., "1. The Hook: Grab attention immediately... 2. The Inciting Incident: Kick off the story..."'
        }
    ];

    const getCurrentKbs = () => {
        switch (activeCategory) {
            case 'youtube': return youtubeKbs;
            case 'blog': return blogKbs;
            case 'storytelling': return storytellingKbs;
            default: return [];
        }
    };
    
    const currentKbs = getCurrentKbs();

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
                    <button 
                        onClick={() => setActiveCategory('storytelling')}
                        className={`py-2 px-4 text-lg font-medium transition-colors ${activeCategory === 'storytelling' ? 'text-primary-accent border-b-2 border-primary-accent' : 'text-gray-400 hover:text-white'}`}
                    >
                        Storytelling Knowledge Bases
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
                            value={localKnowledgeBases[activeCategory]?.[kb.id] || ''}
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
