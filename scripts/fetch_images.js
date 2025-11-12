const fs = require('fs/promises'); // Node.js File System module (Promise version)
const fsSync = require('fs'); // Sync FS functions (for createWriteStream)
const path = require('path'); // Node.js Path module
const https = require('https'); // Node.js HTTPS module

// --- Configuration ---
const categoriesIndexFile = path.join('..', 'categories.json');

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
 * We use the 'https' module because 'node-fetch' isn't standard
 * and 'source.unsplash.com' might redirect, which 'https.get' handles.
 * @param {string} url - The image URL to fetch.
 * @param {string} filePath - The local path to save the image.
 */
function downloadImage(url, filePath) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      // Handle redirects
      if (response.statusCode > 300 && response.statusCode < 400 && response.headers.location) {
        // Recursively call with the new URL
        return downloadImage(response.headers.location, filePath).then(resolve).catch(reject);
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

  try {
    const categoriesPath = path.resolve(__dirname, categoriesIndexFile);
    const categoriesContent = await fs.readFile(categoriesPath, 'utf8');
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

      const categoryPath = path.resolve(__dirname, '..', category.file);

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

        const localImagePath = path.resolve(__dirname, '..', imagePath);
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
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
  } catch (err) {
    console.error('An error occurred during the process:', err);
  }

  console.log('--- Image Fetch Script Finished ---');
}

// --- Run the Script ---
processImages();