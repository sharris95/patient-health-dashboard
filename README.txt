# Coalition Technologies Skills Test — Patient Dashboard (Single Page)

This submission converts the Adobe XD template into a single‑page site and fetches patient data from the Coalition Patient Data API.
It displays **only Jessica Taylor** as requested and draws a blood pressure by year line chart using **Chart.js**.

## How to run
Open `index.html` in any modern browser with internet access. No build step required.

## Notes
- The API requires **Basic Auth** with username `coalition` and password `skills-test`. The app encodes the credentials at runtime (`btoa`), rather than hard‑coding the encoded token.
- The chart averages systolic/diastolic values per **year** using `diagnosis_history` entries from the API.
- Only core UI from the mock is implemented (no extra interactions), per instructions.
- Source files are unminified.
