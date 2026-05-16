"# jzv-ui

A modern single-page React application for Jamia Zaytoonah Vellore with a subtle Islamic-inspired Pine and Olive theme.

## Setup

1. Install dependencies

```bash
npm install
```

2. Start the development server

```bash
npm run dev
```

3. Open the URL shown in the terminal (usually `http://localhost:5173`).

## Project structure

- `index.html` — application shell
- `src/main.jsx` — React entry point
- `src/App.jsx` — main single-page app with public landing, login, and role dashboards
- `src/index.css` — Tailwind imports and base styling
- `tailwind.config.js` — Tailwind configuration
- `vite.config.js` — Vite configuration

## Notes

- This app uses Tailwind CSS for a polished Pine/Olive palette and clean geometric layout.
- The public page highlights the 4Ts pedagogy, Aalimiyat and Hifz program details, and mission messaging.
- Role-based portal views are implemented using React state.
  "
## google app script api
### seach payload
```json
  {
  "action": "search",
  "uuid": "complaint",
  "criteria": {
    "Department": "Engineering",
    "Status": "Active"
  }
}
```
### update payload
```json
{
  "action": "update",
  "uuid": "career",
  "uniqueId": 12,
  "data": {
    "Status": "Terminated",
    "Notes": "Moved to another division"
  }
}
```
