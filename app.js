document.addEventListener('DOMContentLoaded', init);

// --- DOM Elements ---
const categorySelect = document.getElementById('category-select');
const cardContainer = document.getElementById('card-container');
const card = document.getElementById('card');
const wordDisplay = document.getElementById('word-display');
const cardImage = document.getElementById('card-image');
const cardHebrewText = document.getElementById('card-hebrew-text');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const speakBtn = document.getElementById('speak-btn');
const toggleCaseBtn = document.getElementById('toggle-case-btn');

// --- State Variables ---
let categories = [];
let currentWords = [];
let currentIndex = 0;
let isUppercase = false;

/**
 * Main initialization function
 */
async function init() {
    // Load categories and populate the dropdown
    await loadCategories();
    
    // Add event listeners
    categorySelect.addEventListener('change', handleCategoryChange);
    cardContainer.addEventListener('click', flipCard);
    nextBtn.addEventListener('click', nextCard);
    prevBtn.addEventListener('click', prevCard);
    speakBtn.addEventListener('click', speakWord);
    toggleCaseBtn.addEventListener('click', toggleWordCase);

    updateCaseToggleLabel();
}

/**
 * Fetches the list of categories from categories.json
 */
async function loadCategories() {
    try {
        const res = await fetch('categories.json');
        categories = await res.json();
        
        // Populate the select dropdown
        categories.forEach((cat, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = cat.name;
            categorySelect.appendChild(option);
        });
        
        // Load the first category by default
        if (categories.length > 0) {
            await loadCategory(categories[0].file);
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

/**
 * Fetches words for a specific category from its file path
 * @param {string} filePath - The path to the category's JSON file
 */
async function loadCategory(filePath) {
    try {
        const res = await fetch(filePath);
        const data = await res.json();
        
        // Shuffle the words for a different order each time
        currentWords = shuffleArray(data);
        currentIndex = 0;
        resetCardFlip();
        displayCard(currentIndex);
    } catch (error) {
        console.error('Error loading category data:', error);
    }
}

/**
 * Handles the change event of the category dropdown
 */
function handleCategoryChange() {
    const selectedCategoryIndex = categorySelect.value;
    const categoryFile = categories[selectedCategoryIndex].file;
    loadCategory(categoryFile);
}

/**
 * Displays the current card (word and image)
 * @param {number} index - The index of the word to display
 */
function displayCard(index) {
    if (currentWords.length === 0) return;

    const wordData = currentWords[index];
    
    // --- Front of the card ---
    wordDisplay.textContent = isUppercase ? wordData.word.toUpperCase() : wordData.word;
    
    // --- Back of the card (with image fallback logic) ---
    cardImage.src = wordData.image;
    cardHebrewText.textContent = wordData.hebrew;
    
    // Reset styles
    cardImage.style.display = 'block';
    cardHebrewText.style.fontSize = '1.5rem';
    cardHebrewText.style.marginTop = '10px';

    cardImage.onerror = () => {
        // If image fails to load, hide it
        cardImage.style.display = 'none';
        
        // Make the Hebrew text bigger to fill the space
        cardHebrewText.style.fontSize = '3rem';
        cardHebrewText.style.marginTop = '0';
    };
    
    // Reset card flip
    // Keep the current card orientation; navigation functions handle resets.
}

// --- Card Actions ---

function flipCard() {
    card.classList.toggle('is-flipped');
}

function nextCard() {
    currentIndex = (currentIndex + 1) % currentWords.length;
    resetCardFlip();
    displayCard(currentIndex);
}

function prevCard() {
    currentIndex = (currentIndex - 1 + currentWords.length) % currentWords.length;
    resetCardFlip();
    displayCard(currentIndex);
}

function speakWord() {
    if (currentWords.length === 0) return;
    
    const wordToSpeak = currentWords[currentIndex].word;
    const utterance = new SpeechSynthesisUtterance(wordToSpeak);
    utterance.lang = 'en-US'; // Set language to English
    window.speechSynthesis.speak(utterance);
}

function toggleWordCase() {
    isUppercase = !isUppercase;
    updateCaseToggleLabel();

    if (currentWords.length === 0) {
        return;
    }

    displayCard(currentIndex);
}

function updateCaseToggleLabel() {
    toggleCaseBtn.textContent = isUppercase ? 'Show Lowercase' : 'Show Uppercase';
}

function resetCardFlip() {
    card.classList.remove('is-flipped');
}

/**
 * Shuffles an array in place (Fisher-Yates shuffle)
 * @param {Array} array - The array to shuffle
 * @returns {Array} The shuffled array
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}