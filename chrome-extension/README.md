# ResumeForge Chrome Extension

## Load the unpacked extension
1. Open `chrome://extensions` in Google Chrome.
2. Toggle **Developer mode** (top-right).
3. Click **Load unpacked** and select this `chrome-extension/` folder.
4. Pin the ResumeForge icon to your toolbar.
5. Click the icon — sign in with your ResumeForge web account
   (or click "Create one on the web" to register first).

## Usage
- Visit a job post on **LinkedIn / Indeed / Naukri / Glassdoor / Wellfound / YC Jobs**
  (or any page with a JD) and click the extension.
- Hit **Scan this page for JD** to auto-extract the job description, title and company.
  If auto-detection misses, just paste the JD into the textarea.
- Press **Analyze & save** to run Gemini-based ATS keyword extraction.
- On the result screen, download a tailored **resume** or **cover letter** as PDF — they
  are also saved to the web dashboard under **Jobs**.

## Configuration
The backend URL defaults to the production preview URL. To point at a different
backend, open the browser console on the extension popup and run:

```js
chrome.storage.local.set({
  rf_backend: "https://your-backend.example.com",
  rf_dashboard: "https://your-dashboard.example.com"
});
```
