# Lab Gas Cylinder Board

A shared, live board for the lab's gas cylinders. Anyone with the link can view it, and lab members log in with a name and the lab PIN to edit it. No Claude, GitHub or Google account is needed to use it.

- **Website:** `index.html`, hosted free on GitHub Pages
- **Database:** a Google Sheet, connected through the script in `Code.gs`
- **Live updates:** every open page checks for changes every 20 seconds

---

## Part A: Google Sheet and script (about 10 minutes)

1. Go to **sheets.google.com** and create a blank spreadsheet. Name it, for example, *Lab Cylinder Register*.
2. In the sheet, open **Extensions → Apps Script**.
3. Delete everything in the editor, paste in the whole of **`Code.gs`**, and click **Save** (the disk icon).
4. In the toolbar's function menu, choose **`setup`** and click **Run**.
   - Google asks for permission. Click **Review permissions**, pick your account, then **Advanced → Go to (project name) → Allow**. The warning appears because you wrote the script yourself.
   - When it finishes, the sheet has three tabs: **Cylinders** (your 64 cylinders), **Requests** and **Settings**.
5. Open the **Settings** tab and change the **pin** value from `2468` to your own lab PIN.
6. Back in Apps Script, click **Deploy → New deployment**.
   - Click the gear icon next to "Select type" and choose **Web app**.
   - **Execute as:** Me
   - **Who has access:** Anyone
   - Click **Deploy**, then copy the **Web app URL**. It ends in `/exec`.

## Part B: The website on GitHub Pages (about 10 minutes)

1. Open **`index.html`** in a text editor such as Notepad or TextEdit. Find this line:
   ```
   const API_URL = "PASTE_YOUR_WEB_APP_URL_HERE";
   ```
   Replace the placeholder with the URL you copied, keeping the quotes, and save.
2. Sign in at **github.com** (or create a free account).
3. Click **+ → New repository**. Name it, for example, `lab-cylinders`, set it to **Public**, and click **Create repository**.
4. Click **uploading an existing file**, drag in `index.html` (and this README if you like), then click **Commit changes**.
5. Open the repository's **Settings → Pages**. Under **Branch**, choose `main` and `/ (root)`, then click **Save**.
6. Wait a minute and refresh. GitHub shows your link, something like
   `https://YOUR-USERNAME.github.io/lab-cylinders/`

Share that link with the lab, and tell them the PIN in person.

---

## Day to day

- **Log in:** Click **Log in with lab PIN** and enter your name and the PIN. Each browser remembers it until you click **Lock**.
- **Change the PIN:** Edit it in the sheet's **Settings** tab. Everyone is asked to log in again.
- **Rename the board:** Edit **title** in the Settings tab.
- **See or back up the data:** Open the Google Sheet, or use **File → Download → Excel**. Avoid editing the `id` column by hand.
- **Changing `index.html` later:** Upload the new file to the repository. The link stays the same.
- **Changing `Code.gs` later:** Paste in the new code, then go to **Deploy → Manage deployments → edit (pencil) → Version: New version → Deploy**. This keeps the same URL.

## Good to know

- The PIN is checked by Google's server, not in the page, so it can't be read from the website's code.
- The data is only as private as the link. Anyone with the website link can *view* the register, but only people with the PIN can change it.
- Google's free limits easily cover a lab of 10–20 people. Pages stop checking for changes while a tab is in the background.
