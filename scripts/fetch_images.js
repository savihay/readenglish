const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');
const https = require('https'); // תיקנתי גם את זה, לא צריך 'httpshttps'

// ==============================================================
// !! הדבק את המפתח שקיבלת מ-Unsplash כאן !!
// ==============================================================
const UNSPLASH_ACCESS_KEY = 'QzlaYCJVksSOs94CA1JpFhjPrfUGgllewn7AShFrIso';
// ==============================================================

if (UNSPLASH_ACCESS_KEY.includes('PASTE_YOUR')) {
  console.error('\n!!! ERROR: Please paste your Unsplash Access Key into fetch_images.js first.\n');
  process.exit(1);
}

// --- Configuration ---
const baseDir = path.resolve(__dirname, '..');
const categoriesIndexFile = path.join(baseDir, 'categories.json');

// --- Helper Functions ---

/**
 * Ensures that a directory exists, creating it if necessary.
 */
async function ensureDirectoryExists(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (err) {
    console.error(`Error creating directory ${dirPath}:`, err);
  }
}

/**
 * Fetches the direct image URL from the Unsplash API.
 * (FIXED: Now handles 301/302 redirects from the API itself)
 * @param {string} word - The search term.
 * @param {string} apiKey - Your Unsplash Access Key.
 * @param {string} [requestUrl] - Used internally for redirects.
 * @returns {Promise<string|null>} The URL of the image or null.
 */
function fetchImageUrl(word, apiKey, requestUrl = null) {
  return new Promise((resolve, reject) => {
    
    // Use the provided requestUrl or build the initial one
    const apiUrl = requestUrl || `https://api.unsplash.com/search/photos?page=1&per_page=1&query=${encodeURIComponent(word)}`;
    const parsedUrl = new URL(apiUrl);

    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'Authorization': `Client-ID ${apiKey}`,
        'User-Agent': 'FlashcardApp/1.0'
      }
    };

    https.get(options, (res) => {
      // --- THIS IS THE FIX ---
      // Check if the API is redirecting us
      if (res.statusCode > 300 && res.statusCode < 400 && res.headers.location) {
        console.log(`[API] Redirected. Following location...`);
        // Recursively call this function with the new URL
        const redirectUrl = new URL(res.headers.location, apiUrl).href;
        return fetchImageUrl(word, apiKey, redirectUrl).then(resolve).catch(reject);
      }
      // --- END FIX ---

      if (res.statusCode === 401) {
        return reject(new Error('Invalid Unsplash Access Key. Check the key in the script.'));
      }
      if (res.statusCode === 403) {
        return reject(new Error('Unsplash API rate limit exceeded or permission issue.'));
      }
      if (res.statusCode !== 200) {
        // Now we know it's a real error, not a redirect
        return reject(new Error(`API Error: Failed to fetch JSON (${res.statusCode})`));
      }

      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.results && json.results.length > 0) {
            const imageUrl = json.results[0].urls.small; // Get the 'small' image URL
            resolve(imageUrl);
          } else {
            console.warn(`[API] No image found on Unsplash for '${word}'.`);
            resolve(null); // No result
          }
        } catch (e) {
          reject(new Error(`Failed to parse JSON response: ${e.message}`));
        }
      });
    }).on('error', (err) => {
      reject(new Error(`HTTPS Request failed: ${err.message}`));
    });
  });
}


/**
 * Fetches an image from a URL and saves it to a file.
 * (This function already handles redirects for the image download)
 */
function downloadImage(url, filePath) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      // Handle redirects
      if (response.statusCode > 300 && response.statusCode < 400 && response.headers.location) {
        const redirectUrl = new URL(response.headers.location, url).href;
        return downloadImage(redirectUrl, filePath).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        return reject(new Error(`Failed to get image '${url}' (${response.statusCode})`));
      }

      const fileStream = fsSync.createWriteStream(filePath);
      response.pipe(fileStream);
      fileStream.on('finish', () => fileStream.close(resolve));
      fileStream.on('error', (err) => {
        fs.unlink(filePath);
        // --- התיקון כאן ---
        reject(err); // הסרתי את ה-'S' המיותרת
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Main script logic
 */
async function processImages() {
  console.log('--- Starting Image Fetch Script (API Version 3.1) ---');
  
  try {
    const categoriesContent = await fs.readFile(categoriesIndexFile, 'utf8');
    const categories = JSON.parse(categoriesContent);

    for (const category of categories) {
      if (!category?.file) continue;

      const categoryPath = path.join(baseDir, category.file);
      let words;
      try {
        const fileContent = await fs.readFile(categoryPath, 'utf8');
        words = JSON.parse(fileContent);
      } catch (err) {
        console.error(`[ERROR] Failed to read category file '${category.file}':`, err.message);
        continue;
      }

      console.log(`Processing category '${category.name || category.id}' with ${words.length} words.`);

      for (const wordData of words) {
        const { word, image: imagePath } = wordData;
        if (!word || !imagePath) continue;

        const localImagePath = path.join(baseDir, imagePath);
        const imageDir = path.dirname(localImagePath);
        await ensureDirectoryExists(imageDir);

        try {
          await fs.access(localImagePath);
          console.log(`[SKIP] Image for '${word}' already exists: ${imagePath}`);
          continue;
        } catch (e) {
          // File doesn't exist, proceed.
        }

        try {
          // 1. Get the direct image URL from the API
          console.log(`[API] Searching for '${word}'...`);
          const imageUrl = await fetchImageUrl(word, UNSPLASH_ACCESS_KEY);

          if (!imageUrl) continue; // Skip if no image was found

          // 2. Download the image from that direct URL
          console.log(`[FETCH] Downloading image for '${word}' from ${imageUrl}...`);
          await downloadImage(imageUrl, localImagePath);
          console.log(`[SUCCESS] Saved image for '${word}' to ${imagePath}`);
          
        } catch (err) {
          console.error(`[ERROR] Failed during process for '${word}':`, err.message);
          continue;
        }

        // Add a delay to be nice to the API
        await new Promise(resolve => setTimeout(resolve, 1100)); // ~50 reqs/hour limit
      }
    }
  } catch (err) {
    console.error('A critical error occurred:', err);
  }

  console.log('--- Image Fetch Script Finished ---');
}

// --- Run the Script ---
processImages();