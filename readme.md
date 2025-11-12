# 🎮 English Learning Flashcard Game

This project is a simple browser game designed to help Hebrew-speaking children learn basic English vocabulary. It was built as a personal learning tool for an 8-year-old, focusing on simple words, vowel sounds, and clear Hebrew translation.

## ✨ Key Features

*   **Interactive Flashcards:** Click on a flashcard to flip it and see the Hebrew translation and an image.
*   **Text-to-Speech (TTS):** The "Speak" button uses the browser's built-in TTS engine to pronounce the English word.
*   **Dynamic Categories:** Easily load different word collections (animals, food, etc.) from a selection menu.
*   **Simple Expansion:** Adding new words or entire categories only requires editing JSON files, without needing to change JavaScript code.
*   **Image Fallback:** If an image is missing or its path is broken, the game will hide the image area and display the Hebrew translation in a larger font instead.

## 🚀 How to Play

No installation needed!
Simply open the `index.html` file in any modern browser (like Chrome, Firefox, or Safari).

**Live Demo:** [https://savihay.github.io/readenglish/](https://savihay.github.io/readenglish/)

## 🛠️ How to Add Content (For Developers)

The project is built modularly to allow easy content addition.

### 1. Adding New Words to an Existing Category

1.  Go to the `data/` folder.
2.  Open the JSON file of the relevant category (e.g., `data/animals.json`).
3.  Add a new JSON object to the array, following this format:

    ```json
    {
      "word": "lion",
      "hebrew": "אריה",
      "image": "images/animals/lion.png",
      "vowel": "i"
    }
    ```

4.  Add the image file (e.g., `lion.png`) to the appropriate folder (e.g., `images/animals/`).

### 2. Adding a New Category (e.g., "Food")

This is a 3-step process:

1.  **Create the Data File:**
    *   Create a new JSON file in the `data/` folder (e.g., `data/food.json`).
    *   Fill it with an array of words, in the same format as the example above.

2.  **Update the Main Index:**
    *   Open the `categories.json` file (located in the root folder).
    *   Add a new object to the array, linking to the new file you created:

        ```json
        [
          {
            "name": "Animals",
            "id": "animals",
            "file": "data/animals.json"
          },
          {
            "name": "Food",
            "id": "food",
            "file": "data/food.json"
          }
        ]
        ```

3.  **Add Images:**
    *   Create a new folder for the category's images (e.g., `images/food/`).
    *   Add your image files there.

### 3. Automatic Image Download (Development Tool)

To speed up the image addition process, there is a Node.js script called `fetch_images.js`.

**What does it do?**
The script reads all categories and words from your JSON files, checks which images are missing, and tries to automatically download them from Unsplash (a source for free images).

**How to Run:**

1.  Make sure you have [Node.js](https://nodejs.org/) installed on your computer.
2.  Open your terminal and navigate to the project folder.
3.  If it's your first time, run `npm install` (although the current script has no external dependencies).
4.  Run the script:

    ```bash
    node fetch_images.js
    ```

The script will check all words and skip those that already have an image.

## 📂 Project Structure

```
readenglish/
├── data/
│   ├── animals.json         # Vocabulary: Animals
│   └── ...                  # (more data files)
├── images/
│   ├── animals/
│   │   ├── cat.png
│   │   └── ...              # (more animal images)
│   └── ...                  # (more folders for other categories)
├── app.js                   # Main game logic (JavaScript)
├── categories.json          # Main index file for all categories
├── fetch_images.js          # (Development Tool) Node.js script for downloading images
├── index.html               # Application shell (HTML)
├── README.md                # This file
└── style.css                # Application styling (CSS)
```

## 💻 Technologies

*   **Frontend:** HTML5, CSS3, JavaScript (ES6+)
*   **Audio:** Web Speech API (SpeechSynthesisUtterance)
*   **Development:** Node.js (for the image download script)
