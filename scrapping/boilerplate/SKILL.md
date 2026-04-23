# Skill: SeleniumBase Cloudflare-Bypass Scraper

## Purpose

This skill teaches you how to adapt the scraper boilerplate in this folder into a complete, working scraper for any specific target website. The boilerplate performs a single complete scrape of one or more URLs and saves results to a CSV file. Follow the instructions below precisely and you will produce a production-ready scraper with minimal iteration.

---

## Context: What the Boilerplate Does

The boilerplate is a single-pass web scraper built on **SeleniumBase UC mode** (undetected Chrome). It:

- Drives a real Chrome browser that is patched to remove automation fingerprints.
- Keeps a **persistent Chrome profile** (`.sb_profile/`) so Cloudflare clearance cookies survive restarts.
- Supports three run modes: GUI (visible browser), headless, and Xvfb virtual display (Linux VPS).
- Scrapes one or more URLs in a single pass, extracts rows from the DOM via JavaScript, deduplicates by row ID within that pass, and writes results to a single CSV file (`output.csv`).
- Has a commented-out background dispatcher pattern for forwarding newly discovered rows to downstream HTTP services (uncomment if needed).

The two main files are:

| File            | Role                                                                         |
| --------------- | ---------------------------------------------------------------------------- |
| `scraper.py`    | The main scraper. All `# TODO:` markers must be filled in.                   |
| `fetch_html.py` | Diagnostic tool. Use it first to verify CF bypass works and to dump the DOM. |

---

## Your Task When Adapting This Boilerplate

You will be given:

1. A **target URL** (or multiple URLs) to scrape.
2. A description of the **data to extract** from each page (fields, table columns, card attributes, etc.).

You must:

1. Edit `scraper.py` to fill in all six `# TODO:` sections.
2. Update `fetch_html.py` with the correct `DEFAULT_URL`.
3. Do NOT change anything outside the `# TODO:` sections unless there is a specific structural reason (e.g. the site uses iframes instead of a direct table).

---

## The Six TODO Sections in `scraper.py`

### TODO 1 — `URLS` dict

Replace the placeholder with the real target URL(s).

```python
URLS: Dict[str, str] = {
    "main_feed":   "https://target-site.com/feed",
    "second_feed": "https://target-site.com/feed2",   # add only if needed
}
```

- Use short, descriptive logical names as keys. These become the `source` field value in every CSV row.
- If there is only one page to scrape, keep a single entry.

### TODO 2 — `ROW_SELECTORS` dict

Provide a CSS selector that matches the repeating row/card/item elements on each page. Keys must match the keys in `URLS`.

```python
ROW_SELECTORS: Dict[str, str] = {
    "main_feed":   "div.item-card",
    "second_feed": "tr.data-row",
}
```

**How to find the right selector:**

1. Run `fetch_html.py --url <target>` (or `--xvfb` on Linux VPS).
2. Open the saved `page_dump.html` in a browser DevTools or text editor.
3. Find the repeating element that wraps each item/row. Note its tag and key CSS class.
4. Use `tag.class` format (e.g. `a.product-item`, `div.result-row`, `tr.table-row`).

Also update `FALLBACK_SELECTOR` to a broader selector that will still match if the primary class name changes slightly:

```python
FALLBACK_SELECTOR = "div.item"  # broader fallback
```

### TODO 3 — `RowRecord` dataclass

Define fields that match what you want to capture. Only keep fields relevant to your use case.

```python
@dataclass
class RowRecord:
    source: str        # do not remove
    row_id: str        # do not remove — used for deduplication
    row_url: str       # do not remove — full URL for this item

    name: str = ""
    price: str = ""
    category: str = ""
    rating: str = ""
    # ... add as many fields as needed

    scraped_at: str = ""   # do not remove — timestamp when this row was scraped
```

Rules:

- `source`, `row_id`, `row_url`, `scraped_at` must always be present.
- All custom fields should default to `""`.
- Use descriptive snake_case names.

### TODO 4 — `CSV_FIELDS` list

Must exactly match the field names in `RowRecord`, in the order you want CSV columns to appear.

```python
CSV_FIELDS: List[str] = [
    "source",
    "row_id",
    "row_url",
    "name",
    "price",
    "category",
    "rating",
    "scraped_at",
]
```

### TODO 5 — JavaScript inside `extract_rows()`

This is the most important part. The JavaScript snippet runs inside the live browser page and extracts data from each row element.

**Template to fill in:**

```javascript
const selector = arguments[0];
const text = (root, sel) => {
  const el = root.querySelector(sel);
  return el ? el.textContent.trim().replace(/\s+/g, " ") : "";
};
const attr = (root, sel, attrName) => {
  const el = root.querySelector(sel);
  return el ? el.getAttribute(attrName) || "" : "";
};

const rows = Array.from(document.querySelectorAll(selector));
return rows.map((row) => {
  // Build the row_id: use a unique attribute (data-id, href slug, etc.)
  const href =
    row.getAttribute("href") ||
    row.querySelector("a")?.getAttribute("href") ||
    "";
  const fullUrl = href.startsWith("http")
    ? href
    : `https://target-site.com${href}`;
  const parts = href.split("/").filter(Boolean);
  const rowId = parts[parts.length - 1] || "";

  return {
    row_id: rowId,
    row_url: fullUrl,
    name: text(row, ".item-name"), // replace with real selector
    price: text(row, ".item-price"), // replace with real selector
    category: text(row, ".item-category"), // replace with real selector
    rating: attr(row, ".stars-icon", "title"), // example of attribute extraction
  };
});
```

**Key rules:**

- The function uses `arguments[0]` as the CSS selector — do not change this.
- The return value must be an array of plain objects (JSON-serialisable).
- Keys in the returned objects must match the fields in `RowRecord` (excluding `source`, `first_discovered_at`, `last_seen_at`).
- For `row_id`: choose the most stable unique identifier available — a URL slug, a `data-id` attribute, or an internal ID from the page. Never use positional index.
- Use `text(row, selector)` to get `.textContent` of a child element.
- Use `attr(row, selector, attrName)` to get an HTML attribute value.

**Finding the right child selectors:**

- Inspect `page_dump.html` in a browser.
- Open DevTools → Elements tab.
- For each field, right-click the element → "Copy selector" or note its class manually.
- Prefer class-based selectors over position-based ones (e.g. prefer `.price` over `div:nth-child(3)`).

### TODO 6 — Row filter in the monitor loop (optional)

If you want to skip rows that don't meet certain criteria, add conditions after the comment in the main loop:

```python
# TODO: If you need to filter rows, add conditions here.
if item.get("price") == "":
    continue   # skip rows with no price
if item.get("category") not in {"Electronics", "Computers"}:
    continue   # only keep specific categories
```

Also update the `RowRecord` constructor call right below to use your actual field names:

```python
row = RowRecord(
    source=source,
    row_id=item.get("row_id", ""),
    row_url=item.get("row_url", ""),
    name=item.get("name", ""),
    price=item.get("price", ""),
    category=item.get("category", ""),
    rating=item.get("rating", ""),
    scraped_at=now_iso,
)
```

---

## Updating `fetch_html.py`

Only one change is needed:

```python
DEFAULT_URL = "https://your-actual-target-site.com/page"
```

Everything else stays the same. The script tries 5 progressively stronger CF bypass strategies and reports which one worked.

---

## Special Situations

### Site has multiple pages with different structures

Keep multiple entries in `URLS` and `ROW_SELECTORS`. The scraper already loops over all sources. The JavaScript in `extract_rows()` uses the selector for each source, so as long as your JS template uses `arguments[0]` as the selector, the same JS can work for both pages (or you can branch on the `source` argument passed to `extract_rows`).

### Site requires login / authentication

1. Run `scraper.py` in GUI mode (no flags).
2. The browser window opens. Log in manually.
3. Stop the scraper with Ctrl+C.
4. The session cookies are now stored in `.sb_profile/`.
5. On subsequent runs, the scraper will reuse the logged-in session.

### Site uses infinite scroll instead of pagination

In the JavaScript, scroll the container first, then query rows:

```javascript
window.scrollTo(0, document.body.scrollHeight);
await new Promise((r) => setTimeout(r, 2000)); // wait for load
// ... then querySelectorAll
```

Or trigger a scroll from Python before calling `execute_script`:

```python
driver.execute_script("window.scrollTo(0, document.body.scrollHeight)")
time.sleep(2)
raw_rows = extract_rows(driver, source)
```

### Site uses iframes

Navigate into the frame before extracting:

```python
driver.switch_to.frame(driver.find_element("css selector", "iframe#content"))
raw_rows = extract_rows(driver, source)
driver.switch_to.default_content()
```

### Site returns data via XHR / API (not DOM)

Instead of DOM extraction, intercept network requests or call the API directly via `driver.execute_async_script`:

```python
result = driver.execute_async_script("""
    const done = arguments[arguments.length - 1];
    fetch('/api/items')
        .then(r => r.json())
        .then(data => done(data))
        .catch(e => done({__error: String(e)}));
""")
```

This uses the browser's existing authenticated session to make the API call.

### Downstream HTTP notifications

Uncomment the dispatcher block at the bottom of `scraper.py`. Update `DOWNSTREAM_ENDPOINTS` with your service URLs, then call `enqueue_for_dispatch(newly_discovered)` inside the monitor loop. Each batch of newly discovered rows will be POSTed as a JSON array.

---

## Selector Discovery Workflow (Step-by-Step)

1. Run `fetch_html.py --url <target>`. On Linux VPS: add `--xvfb`.
2. Confirm "[SUCCESS]" in the output.
3. Open `page_dump.html` in a browser.
4. Right-click on one row/card element → "Inspect".
5. In DevTools, find the repeating element. Note its tag + class for `ROW_SELECTORS`.
6. Inside that element, for each data field: note the child element's class name.
7. Put those class names into the JavaScript `text()` / `attr()` calls in `extract_rows()`.
8. Run `scraper.py` in GUI mode and watch the console output. If `extract_rows returned 0 items` appears, re-inspect the HTML.

---

## Output Format Reference

`output.csv` — all unique rows found in this run:

```
source, row_id, row_url, [your fields...], scraped_at
```

Timestamps (`scraped_at`) are in UTC ISO 8601 format: `2026-04-03T14:22:01.123456+00:00`

Rows are deduplicated by `source:row_id` within a single run. If the same `row_id` appears multiple times while scraping, only the first instance is kept.

---

## What Not to Change

- The `RowStore` class (deduplication logic)
- `write_snapshot()` function
- `_get_chrome_version()`, `_is_cf()`, `_wait_for_cf_cleared()`, `soft_activity()`
- The `Driver(uc=True, ...)` constructor call
- The Cloudflare bypass flow in the initial load section
- The `finally:` block (driver/vdisplay cleanup)
- The `parse_args()` function (unless you need site-specific CLI flags)

---

## Quick Checklist Before Running

- [ ] `URLS` has the real target URL(s)
- [ ] `ROW_SELECTORS` matches the repeating element on the page
- [ ] `RowRecord` fields match the data you want (including `scraped_at`)
- [ ] `CSV_FIELDS` matches `RowRecord` field names exactly
- [ ] JavaScript in `extract_rows()` uses the real child selectors
- [ ] `RowRecord` constructor call uses all your new field names and `scraped_at`
- [ ] `fetch_html.py` `DEFAULT_URL` updated
- [ ] `pip install -r requirements.txt` done
- [ ] On Linux VPS: `sudo apt install xvfb` done
