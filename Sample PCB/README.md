# Data Insights Dashboard — Starter Project

You will turn two Kaggle datasets into a live dashboard with **2 charts**, using **Gemini** (AI assistant), **Google Stitch** (AI UI designer), **Chart.js** (charts) and **GitHub Pages** (free hosting).

## What is in this folder

| File | What it is | Who writes it |
|---|---|---|
| `raw-data/` | The CSV files you download from Kaggle | You (Step 1) |
| `data/supermarket.js`, `data/videogames.js` | The CSV text, wrapped so the browser can read it | You paste (Step 2) |
| `js/config.js` | **Predefined variables:** which columns to chart, labels, colors | Gemini suggests, you check (Step 2) |
| `index.html` | The page design | Stitch designs it (Step 3), Gemini connects it (Step 4) |
| `js/app.js` | **Function descriptions:** the logic that reads the data and draws charts | Gemini fills it in (Step 4), you verify |
| `css/style.css` | Extra styles (optional) | — |

## The steps

1. **Get the data:** download both datasets from Kaggle and put the `.csv` files in `raw-data/`.
2. **Prepare the data:** paste each CSV into its `data/*.js` file. Use **Prompt A** to fill in `js/config.js`.
3. **Design the page:** use **Prompt B** in Stitch, export the HTML, and save it as `index.html`.
4. **Put it together:** use **Prompt C** in Gemini to complete `app.js` and connect `index.html`.
5. **Verify:** go through the 6-point human check (see the checklist handout).
6. **Switch and publish:** change `ACTIVE_DATASET` in `js/config.js` to test the other dataset, then upload everything to GitHub and turn on Pages.

## How to open the page

Double-click `index.html` (or drag it into Chrome). After every change: **save in Sublime (Ctrl+S / Cmd+S), then refresh Chrome (Ctrl+R / Cmd+R).**

## Golden rules

- Change **one thing at a time**, then save and refresh.
- **Never** paste passwords or API keys into any AI tool.
- If you can't explain a line of AI code, ask Gemini to explain it (Prompt D) *before* you keep it.
