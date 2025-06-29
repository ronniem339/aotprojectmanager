import { h } from 'preact';
import { useState, useCallback } from 'preact/hooks';
import { useAppState } from '../hooks/useAppState';
import { collection, writeBatch, doc } from 'firebase/firestore';
import LoadingSpinner from './ui/LoadingSpinner';

/**
 * WordPressImportTool component
 * * A tool for performing a one-time import of all posts from a WordPress blog
 * into the application's Firestore database.
 */
const WordPressImportTool = () => {
  const { db, user, wordpressSettings } = useAppState();
  const [isLoading, setIsLoading] = useState(false);
  const [progressMessage, setProgressMessage] = useState('');
  const [error, setError] = useState('');
  const [importCompleted, setImportCompleted] = useState(false);

  /**
   * Handles the entire import process.
   * Fetches posts page-by-page from the WordPress REST API and saves them
   * in batches to Firestore.
   */
  const handleImport = useCallback(async () => {
    // Check for required WordPress settings first
    if (!wordpressSettings?.url || !wordpressSettings?.username || !wordpressSettings?.applicationPassword) {
      setError('WordPress settings are not complete. Please configure them in the settings menu.');
      return;
    }
    
    // Reset state for a new import
    setIsLoading(true);
    setError('');
    setImportCompleted(false);
    setProgressMessage('Starting import...');

    // Get reference to the user's blogPosts collection in Firestore
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const blogPostsCollectionRef = collection(db, 'artifacts', appId, 'users', user.uid, 'blogPosts');

    try {
      let page = 1;
      let totalPostsImported = 0;
      let hasMorePosts = true;

      // Loop through paginated results from WordPress API
      while (hasMorePosts) {
        setProgressMessage(`Fetching page ${page} of posts...`);
        const response = await fetch(`${wordpressSettings.url}/wp-json/wp/v2/posts?per_page=50&page=${page}&_fields=id,date_gmt,link,title,content,status,categories`, {
          headers: {
            'Authorization': 'Basic ' + btoa(`${wordpressSettings.username}:${wordpressSettings.applicationPassword}`)
          }
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Failed to fetch posts. Status: ${response.status}. Message: ${errorData.message}`);
        }

        const posts = await response.json();

        // Stop when there are no more posts
        if (posts.length === 0) {
          hasMorePosts = false;
          continue;
        }

        // Use a Firestore batch for efficient writing
        const batch = writeBatch(db);
        posts.forEach(post => {
          const postRef = doc(blogPostsCollectionRef, post.id.toString());
          const postData = {
            title: post.title.rendered,
            content: post.content.rendered,
            status: post.status,
            location: '', // WordPress API for posts doesn't have a standard location field. Can be added later.
            postType: 'wordpress-import',
            wordPressId: post.id,
            url: post.link,
            createdAt: post.date_gmt + 'Z', // Ensure it's a valid ISO string
            userId: user.uid
          };
          batch.set(postRef, postData);
        });

        await batch.commit();
        totalPostsImported += posts.length;
        setProgressMessage(`${totalPostsImported} posts imported successfully.`);
        page++;
      }
      
      setProgressMessage(`Import complete! A total of ${totalPostsImported} posts were imported.`);
      setImportCompleted(true);
    } catch (err) {
      console.error("WordPress import failed:", err);
      setError(`Import failed: ${err.message}. Check your WordPress settings and network connection.`);
    } finally {
      setIsLoading(false);
    }
  }, [wordpressSettings, db, user]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mt-8">
      <h2 className="text-xl font-bold mb-4">WordPress Content Importer</h2>
      <p className="mb-4 text-gray-600">
        Import all existing posts from your WordPress blog into the Creator's Hub. This is a one-time operation to get your content library up to date. This process may take several minutes depending on the number of posts you have.
      </p>
      
      {!isLoading && !importCompleted && (
        <button 
          onClick={handleImport} 
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300 ease-in-out shadow-sm disabled:bg-gray-400"
          disabled={isLoading}
        >
          Start WordPress Import
        </button>
      )}

      {isLoading && (
        <div className="flex items-center space-x-2">
          <LoadingSpinner />
          <p className="text-gray-700 font-medium">{progressMessage}</p>
        </div>
      )}

      {!isLoading && error && (
        <p className="text-red-500 mt-4 font-semibold">{error}</p>
      )}

      {!isLoading && importCompleted && (
        <p className="text-green-600 font-semibold mt-4">{progressMessage}</p>
      )}
    </div>
  );
};

export default WordPressImportTool;
