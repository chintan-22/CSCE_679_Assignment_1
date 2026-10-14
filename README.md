# Hong Kong Temperature Visualization

**CSCE 679 — Data Visualization Assignment 1**  
**Technology:** HTML, CSS, JavaScript, D3.js v7

## Overview

This project visualizes daily maximum and minimum temperatures from the supplied `temperature_daily.csv` dataset. The assignment identifies the location as Hong Kong; the CSV itself does not contain a location column.

Two interactive visualizations are available:

### Level 1 — Year/Month Heatmap

- Displays available years (1997–2017) as columns and months as rows.
- Colors represent either the **highest daily maximum** or **lowest daily minimum** recorded within each month.
- Use the **Monthly maximum / Monthly minimum** controls to change the displayed metric.
- Hover over a cell to see the month, extreme temperature, date of that extreme, and number of recorded days.
- A color legend maps temperature values to colors.

### Level 2 — Daily Temperature Trends

- Focuses on the last 10 years of data (2008–2017), with years in columns and months in rows.
- Each month cell contains two mini line charts: **daily maximum** and **daily minimum** temperatures.
- Horizontal position represents the day of the month (1–31); vertical position represents temperature on a shared 0–40°C scale.
- Background color represents the month's mean temperature; legends explain the background and line colors.
- Hover over a mini chart to inspect the nearest recorded date and its two temperatures.
- Months with no observations appear as missing-data cells.

## Project Files

```text
index.html             Level 1 page
styles.css             Level 1 styles
script.js              Level 1 visualization logic
level2.html            Level 2 page
level2.css             Level 2 styles
level2.js              Level 2 visualization logic
temperature_daily.csv  Dataset
README.md              Project instructions
```

## How to Run

1. Keep all project files in the **same folder**.
2. Open that folder in Visual Studio Code.
3. Start **Live Server** and open `index.html` for Level 1 or `level2.html` for Level 2.

Alternatively, from the project folder run:

```bash
python3 -m http.server 8000
```

Then visit:

- Level 1: http://localhost:8000/index.html
- Level 2: http://localhost:8000/level2.html

**Note:** Opening the HTML via `file://` may prevent the browser from loading the CSV. Use a local server. An internet connection is needed to load D3.js from the CDN. If the CSV is not loaded automatically, use **Load CSV from device** on the page.

## Data and Handling

The CSV contains the fields `date`, `max_temperature`, and `min_temperature`. Dates are parsed and formatted in UTC to avoid timezone-related month shifts. Monthly extrema in Level 1 are calculated from valid daily records. Level 2 uses the daily readings directly and does not generate values for missing dates. The supplied file ends in October 2017, so November and December 2017 have no recorded values.

## Data Source

Provided assignment dataset: [temperature_daily.csv](https://github.com/xiameng552180/CSCE-679-Data-Visualization-Assignment1/blob/main/temperature_daily.csv).

## Implementation Notes

- D3.js v7 powers data parsing, grouping, scales, SVG shapes, and interaction.
- Visualization settings (dimensions, colors, ranges) are grouped in `CONFIG` in each JavaScript file.
- Functions are separated by responsibility to keep the implementation readable and easy to update.
# CSCE_679_Assignment_1
