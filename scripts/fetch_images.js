const fs = require('fs/promises'); // Node.js File System module (Promise version)
const fsSync = require('fs'); // Sync FS functions (for createWriteStream)
const path = require('path'); // Node.js Path module
const https = require('https'); // Node.js HTTPS module

// --- Configuration ---
// אנחנו בתיקיית 'scripts', אז אנחנו צריכים לעלות רמה אחת ('..')
// כדי למצוא את הקבצים הראשיים.
const baseDir = path.resolve(__dirname, '..'); 
const categoriesIndexFile = path.join(baseDir, 'categories.json');

// --- Helper Functions ---

/**
 * Ensures that a directory exists, creating it if necessary.
 * @param {string} dirPath - The path to the directory.
 */
async function ensureDirectoryExists(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
    // console.log(`Directory ensured: ${dirPath}`);
  } catch (err) {
    console.error(`Error creating directory ${dirPath}:`, err);
  }
}

/**
 * Fetches an image from a URL and saves it to a file.
 * (MODIFIED to include User-Agent)
 */
function downloadImage(url, filePath) {
    return new Promise((resolve, reject) => {
      
      // NEW: Parse the URL to get hostname and path
      const parsedUrl = new URL(url);
  
      // NEW: Define request options, including a fake browser header
      const options = {
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      };
  
      // Make the request using the options object
      https.get(options, (response) => {
        // Handle redirects
        if (response.statusCode > 300 && response.statusCode < 400 && response.headers.location) {
          // Build the new URL (handling relative redirects)
          const redirectUrl = new URL(response.headers.location, url).href;
          return downloadImage(redirectUrl, filePath).then(resolve).catch(reject);
        }
  
        // Handle non-successful status codes
        if (response.statusCode !== 200) {
          return reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
        }
  
        // Create a file stream to save the image
        const fileStream = fsSync.createWriteStream(filePath);
        response.pipe(fileStream);
  
        fileStream.on('finish', () => {
          fileStream.close(resolve);
        });
  
        fileStream.on('error', (err) => {
          fs.unlink(filePath); // Delete the partial file
          reject(err);
        });
      }).on('error', (err) => {
        reject(err);
      });
    });
  }

/**
 * Reads all categories and triggers image downloads per category.
 */
async function processImages() {
  console.log('--- Starting Image Fetch Script ---');
  console.log(`Base directory: ${baseDir}`);
  console.log(`Loading categories from: ${categoriesIndexFile}`);

  try {
    const categoriesContent = await fs.readFile(categoriesIndexFile, 'utf8');
    const categories = JSON.parse(categoriesContent);

    if (!Array.isArray(categories) || categories.length === 0) {
      console.warn('No categories found. Check categories.json.');
      return;
    }

    for (const category of categories) {
      if (!category?.file) {
        console.warn(`Skipping category without file reference: ${JSON.stringify(category)}`);
        continue;
      }

      // הנתיב לקובץ הקטגוריה הוא יחסי ל-baseDir
      const categoryPath = path.join(baseDir, category.file);

      let words;
      try {
        const fileContent = await fs.readFile(categoryPath, 'utf8');
        words = JSON.parse(fileContent);
      } catch (err) {
        console.error(`[ERROR] Failed to read category file '${category.file}':`, err.message);
        continue;
      }

      if (!Array.isArray(words) || words.length === 0) {
        console.warn(`[INFO] No words found in '${category.file}'.`);
        continue;
      }

      console.log(`Processing category '${category.name || category.id}' with ${words.length} words.`);

      for (const wordData of words) {
        const { word, image: imagePath } = wordData;

        if (!word || !imagePath) {
          console.warn(`[SKIP] Missing word or image path in entry: ${JSON.stringify(wordData)}`);
          continue;
        }

        // הנתיב לתמונה הוא יחסי ל-baseDir
        const localImagePath = path.join(baseDir, imagePath);
        const imageDir = path.dirname(localImagePath);
        await ensureDirectoryExists(imageDir);

        // Check if image already exists
        try {
          await fs.access(localImagePath);
          console.log(`[SKIP] Image for '${word}' already exists: ${imagePath}`);
          continue; // Skip to the next word
        } catch (e) {
          // File doesn't exist, so we download it
        }

        // This is the image source.
        // Using unsplash.com, which gives a random photo.
        const imageUrl = `https://source.unsplash.com/400x400/?${encodeURIComponent(word)}`;

        console.log(`[FETCH] Downloading image for '${word}' from ${imageUrl}...`);

        try {
          await downloadImage(imageUrl, localImagePath);
          console.log(`[SUCCESS] Saved image for '${word}' to ${imagePath}`);
        } catch (err) {
          console.error(`[ERROR] Failed to download image for '${word}':`, err.message);
          continue;
        }

        // Add a small delay to avoid spamming the server
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
  } catch (err) {
    console.error('An error occurred during the process:', err);
  }

  console.log('--- Image Fetch Script Finished ---');
}

// --- Run the Script ---
processImages();