# Scraper Boilerplate

A ready-to-copy template for building web scrapers using **SeleniumBase** with undetected-Chrome (UC mode), persistent session profiles, and multi-strategy Cloudflare bypass.

---

## Folder Structure

```
boilerplate/
├── scraper.py            ← Main scraper template (adapt this for your target site)
├── fetch_html.py         ← Diagnostic tool: test CF bypass & dump raw page HTML
├── requirements.txt      ← Python dependencies
├── .sb_profile/          ← Persistent Chrome profile for scraper.py (auto-managed, shared across all scrapers)
└── .sb_profile_debug/    ← Persistent Chrome profile for fetch_html.py (auto-managed, shared across all scrapers)
```

---

## How to Create a New Scraper

### Step 1 — Copy this folder

```bash
cp -r boilerplate/ my_new_scraper/
cd my_new_scraper/
```

### Step 2 — Create and activate a virtual environment

```bash
python3 -m venv .venv
source .venv/bin/activate          # Linux/macOS
.\.venv\Scripts\activate           # Windows
```

### Step 3 — Install dependencies

```bash
pip install -r requirements.txt
```

Linux VPS only — install Xvfb system package for virtual display mode:

```bash
sudo apt install -y xvfb
```

### Step 4 — Test reachability with the debug tool

Before writing any scraper code, run `fetch_html.py` to verify you can reach the target site and that Cloudflare is bypassed successfully:

```bash
python fetch_html.py --url https://your-target-site.com
```

On a Linux VPS, use `--xvfb` instead:

```bash
python fetch_html.py --url https://your-target-site.com --xvfb
```

The script will try 5 different bypass strategies in sequence and report which one works. If all fail, your IP is likely blocked — consider using a residential proxy or a different server.

After a successful run, `page_dump.html` will contain the full DOM. Open it in a browser or text editor to find the CSS selectors you need for your scraper.

### Step 5 — Adapt `scraper.py`

Search the file for every `# TODO:` comment. There are six places to update:

| #   | Location                       | What to change                                   |
| --- | ------------------------------ | ------------------------------------------------ |
| 1   | `URLS` dict                    | Your target URL(s)                               |
| 2   | `ROW_SELECTORS` dict           | CSS selector for the row elements on each page   |
| 3   | `RowRecord` dataclass          | The data fields you want to capture              |
| 4   | `CSV_FIELDS` list              | Column names matching `RowRecord` fields         |
| 5   | JavaScript in `extract_rows()` | DOM queries that pull field values from each row |
| 6   | Row filter in the monitor loop | Any conditions to skip rows (optional)           |

### Step 6 — Run the scraper

**GUI mode** (visible browser — best for development & debugging):

```bash
python scraper.py
```

**Headless mode** (may be blocked by Cloudflare on fresh IPs):

```bash
python scraper.py --headless
```

**Xvfb mode** (Linux VPS — invisible but bypasses CF headless detection):

```bash
python scraper.py --xvfb
```

**Full options:**

```
--output-dir <dir>    Directory for output CSV file (default: <repo_root>/downloaded_files)
--headless            Headless mode
--xvfb                Xvfb virtual display (Linux VPS)
--profile-dir <dir>   Chrome profile directory (default: <repo_root>/.sb_profile)
```

---

## Output Files

| File         | Description                          |
| ------------ | ------------------------------------ |
| `output.csv` | All unique rows scraped in this run. |

---

## How the CF Bypass Works

The scraper uses **SeleniumBase UC (Undetected Chrome) mode** combined with these techniques:

1. **Persistent Chrome profile** — `.sb_profile/` stores the `cf_clearance` cookie across restarts. Once Cloudflare issues this cookie after a successful challenge, it is reused for all subsequent requests, dramatically reducing how often challenges appear.

2. **UC mode (undetected-chromedriver)** — SeleniumBase patches Chrome to remove automation fingerprints that Cloudflare detects.

3. **`uc_open_with_reconnect`** — Opens the page, briefly disconnects from the driver (making Chrome appear headless-free), then reconnects.

4. **GUI bypass methods** — `uc_gui_handle_cf()` and `uc_gui_click_cf()` simulate a real mouse click on the Cloudflare CAPTCHA checkbox. These methods work with both a real display **and** a virtual Xvfb display.

5. **Xvfb virtual display** — On a Linux VPS with no physical display, Xvfb creates an in-memory screen. Chrome runs in "windowed" mode inside this virtual screen, which is much harder for Cloudflare to detect as headless compared to Chrome's native `--headless` flag.

**Rule of thumb:**

- Local development: GUI mode (no flags) is easiest.
- Linux VPS: always use `--xvfb`. Never use `--headless` on a VPS.

---

## The Profile Directories

- `.sb_profile/` — used by `scraper.py`. Contains the production session cookies. **Do not delete** while the scraper is running.
- `.sb_profile_debug/` — used by `fetch_html.py`. Isolated so debug runs never affect the production session.

To force a completely fresh browser session (e.g. to test a new site without old cookies), delete the relevant profile folder before running. You'll face a Cloudflare challenge again on the next launch.

---

## Adding Downstream Notifications

If you want to POST newly discovered rows to an HTTP service, the scraper has a commented-out background dispatcher pattern at the bottom of `scraper.py`. Uncomment it, add your endpoints to `DOWNSTREAM_ENDPOINTS`, and call `enqueue_for_dispatch(newly_discovered)` inside the monitor loop. The dispatcher runs in a background thread so it never blocks the scrape cycle.

---

## Common Issues

| Symptom                                      | Fix                                                                                                              |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `extract_rows` always returns 0 items        | Run `fetch_html.py` and inspect the saved HTML to find the correct CSS selectors.                                |
| Stuck on Cloudflare "Just a moment…" forever | Your VPS IP may be blocked. Try `--xvfb`, delete `.sb_profile/` for a fresh session, or use a residential proxy. |
| `pyvirtualdisplay` import error              | Run `pip install pyvirtualdisplay` and `sudo apt install xvfb`.                                                  |
| `--headless` gets blocked immediately        | Switch to `--xvfb` on Linux or use GUI mode locally.                                                             |
| Chrome version mismatch warning              | SeleniumBase auto-manages chromedriver; the user-agent is auto-detected. Usually safe to ignore.                 |
