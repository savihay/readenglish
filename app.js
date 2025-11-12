document.addEventListener('DOMContentLoaded', init);

// --- DOM Elements ---
const categorySelector = document.getElementById('category-selector');
const cardContainer = document.getElementById('card-container');
const card = document.getElementById('card');
const wordDisplay = document.getElementById('word-display');
const cardImage = document.getElementById('card-image');
const cardHebrewText = document.getElementById('card-hebrew-text');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const speakBtn = document.getElementById('speak-btn');
const uppercaseToggle = document.getElementById('uppercase-toggle');

// --- State Variables ---
let categories = [];
let currentWords = [];
let currentIndex = 0;
let showUppercase = false;
let isTransitioning = false;

/**
 * Main initialization function
 */
async function init() {
    // Load categories and populate the buttons
    await loadCategories();
    
    // Add event listeners
    cardContainer.addEventListener('click', flipCard);
    nextBtn.addEventListener('click', nextCard);
    prevBtn.addEventListener('click', prevCard);
    speakBtn.addEventListener('click', speakWord);
    if (uppercaseToggle) {
        uppercaseToggle.addEventListener('change', handleUppercaseToggle);
        showUppercase = uppercaseToggle.checked;
    }
}

/**
 * Fetches the list of categories from categories.json and creates buttons
 */
async function loadCategories() {
    try {
        const res = await fetch('categories.json');
        categories = await res.json();
        
        categorySelector.innerHTML = ''; // Clear existing buttons
        
        categories.forEach((cat, index) => {
            const button = document.createElement('button');
            button.textContent = cat.name;
            button.classList.add('category-btn');
            button.dataset.index = index;
            button.dataset.file = cat.file;
            
            button.addEventListener('click', handleCategoryClick);
            
            categorySelector.appendChild(button);
        });
        
        // Load the first category by default
        if (categories.length > 0) {
            await handleCategoryClick({ target: categorySelector.children[0] });
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

/**
 * Handles the click event of a category button
 * @param {Event} e - The click event
 */
async function handleCategoryClick(e) {
    const button = e.target;
    const categoryIndex = button.dataset.index;
    const categoryFile = button.dataset.file;
    
    await loadCategory(categoryFile);
    updateActiveButton(categoryIndex);
}

/**
 * Updates the active state of the category buttons
 * @param {string} activeIndex - The index of the category to mark as active
 */
function updateActiveButton(activeIndex) {
    const buttons = categorySelector.querySelectorAll('.category-btn');
    buttons.forEach((button, index) => {
        if (index == activeIndex) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
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
        displayCard(currentIndex);
    } catch (error) {
        console.error('Error loading category data:', error);
    }
}

/**
 * Displays the current card (word and image)
 * @param {number} index - The index of the word to display
 */
function displayCard(index) {
    if (currentWords.length === 0) return;

    const applyContent = () => {
        const wordData = currentWords[index];
        
        const wordToDisplay = showUppercase ? wordData.word.toUpperCase() : wordData.word;
        wordDisplay.textContent = wordToDisplay;
        
        cardImage.style.display = 'block';
        cardHebrewText.style.fontSize = '1.5rem';
        cardHebrewText.style.marginTop = '10px';
        
        cardHebrewText.textContent = wordData.hebrew;
        cardImage.onerror = () => {
            cardImage.style.display = 'none';
            cardHebrewText.style.fontSize = '3rem';
            cardHebrewText.style.marginTop = '0';
        };
        cardImage.src = wordData.image;
        
        isTransitioning = false;
    };

    if (card.classList.contains('is-flipped')) {
        isTransitioning = true;
        const handleTransitionEnd = () => {
            card.removeEventListener('transitionend', handleTransitionEnd);
            applyContent();
        };
        card.addEventListener('transitionend', handleTransitionEnd, { once: true });
        card.classList.remove('is-flipped');
    } else {
        applyContent();
    }
}

// --- Card Actions ---

function flipCard() {
    if (isTransitioning) return;

    isTransitioning = true;
    card.classList.toggle('is-flipped');
    const handleTransitionEnd = () => {
        card.removeEventListener('transitionend', handleTransitionEnd);
        isTransitioning = false;
    };
    card.addEventListener('transitionend', handleTransitionEnd, { once: true });
}

function nextCard() {
    if (isTransitioning || currentWords.length === 0) return;
    currentIndex = (currentIndex + 1) % currentWords.length;
    displayCard(currentIndex);
}

function prevCard() {
    if (isTransitioning || currentWords.length === 0) return;
    currentIndex = (currentIndex - 1 + currentWords.length) % currentWords.length;
    displayCard(currentIndex);
}

function speakWord() {
    if (currentWords.length === 0) return;
    
    const wordToSpeak = currentWords[currentIndex].word;
    const utterance = new SpeechSynthesisUtterance(wordToSpeak);
    utterance.lang = 'en-US'; // Set language to English
    window.speechSynthesis.speak(utterance);
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

function handleUppercaseToggle() {
    showUppercase = uppercaseToggle ? uppercaseToggle.checked : false;
    if (isTransitioning) return;
    displayCard(currentIndex);
}