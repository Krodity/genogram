# Genogram Builder

A family-tree diagram tool for **genograms**, the charts therapists, social
workers and genealogists use to map a family over several generations,
including relationships, emotional ties, medical conditions and ethnicity.

It's a **single HTML file**. Double-click `dist/Genogram.html` and it opens in
any browser (Safari, Chrome, Firefox, Edge) on Mac, Windows or Linux. No
install, no account, no internet, and **nothing leaves your computer**.

---

## Features

- **People**: male, female, or unknown sex. Name, birth and death years, age,
  deceased marker, an *index person* (client) highlight, conditions and
  ethnicity
- **One-click relatives**: add a partner, ex-partner, child, adopted child,
  parents or sibling, and it's placed and connected for you
- **Couple relationships**: married, engaged, dating, living together,
  separated, divorced, widowed, annulled, affair / casual, with years
- **Child links**: biological, adopted, foster, step-child, legal
  guardianship, donor / surrogate, godparent, caregiver
- **Emotional / connection lines**: close, love, harmony, friendship, fused,
  focused on, distant, indifferent, never met, cut off (and cut off,
  repaired), conflict, hostile, distrust, controlling, manipulative, abuse,
  neglect, violence. Several lines between the same two people are drawn side
  by side, and arrowed lines can be reversed
- **Conditions** (e.g. depression, diabetes, heart disease, substance use)
  shown as coloured fills. Add your own with any colour
- **Ethnicity** under each name, from a list or typed in, more than one per
  person
- **Your own line types**, background colour and pattern in **Key & types**
- **Export PDF** with any mix of: the chart (with or without a key), a
  written **relationship summary** (who is whose mother, cousin, in-law…, plus
  each person's details, couples, children, lines, ethnicity and conditions),
  and a guide to every symbol. The summary can also be saved as a `.txt`
- **SVG export**, **Save / Open** as `.genogram.json`, undo/redo, auto-save in
  the browser

## Using it

1. Open `dist/Genogram.html`. A sample family loads so you can see how it
   works. Click **New** to start a blank chart.
2. **+ Person** adds someone. Click a shape to select it and edit their
   details in the right-hand panel.
3. Under **Add new relative**, click *Partner*, *Child*, *Parents*, … to grow
   the tree.
4. To join two people who are already on the chart: pick a line type next to
   **Link**, click **Link**, then click the two people.
5. Drag shapes to arrange them. Scroll to zoom, drag empty space to pan, and
   **Fit** frames everything.
6. Select a person to see their **Connections**. Change a relationship type
   from the drop-down, type years, **Reverse** an arrow, or × to remove it.
7. **Save** downloads a `.genogram.json` file. **Open…** loads one back.
8. **Export PDF…** lets you pick the paper size and what to include.

A plain-language guide for non-technical users is in
[`dist/How to use.txt`](dist/How%20to%20use.txt).

### Keyboard shortcuts

| Keys | Action |
|---|---|
| Ctrl/⌘ + Z | Undo |
| Ctrl/⌘ + Y, Ctrl/⌘ + Shift + Z | Redo |
| Ctrl/⌘ + S | Save |
| Delete / Backspace | Delete the selected person, couple or line |
| Esc | Cancel the current mode, deselect, or close a dialog |
| A | Add a person |
| L | Start a link |
| 0 | Fit the chart to the window |

With a person selected:

| Key | Action |
|---|---|
| M / F / U | Set sex: male / female / unknown |
| P | Add a partner |
| X | Add an ex-partner (divorced) |
| C | Add a child |
| R | Add parents |
| S | Add a sibling |

### Where your data lives

The chart auto-saves to the browser's `localStorage` for that file, so
clearing browser data or opening the file in another browser starts fresh.
Use **Save** to keep a real copy. Nothing is ever uploaded.

## Development

```
index.html   page shell (loads style.css, app.js and vendor/*)
style.css
app.js       the whole app: model, layout, SVG rendering, panels, export
vendor/      jsPDF + svg2pdf.js (bundled, so PDF export works offline)
build.py     inlines everything into dist/Genogram.html
dist/        the shippable single file + a how-to for end users
```

While developing, open `index.html` directly (it loads Google Fonts if it's
online). To ship, rebuild the single file:

```bash
python3 build.py        # → dist/Genogram.html (no external requests at all)
```

`build.py` removes the web-font links and inlines the CSS, the app and both
PDF libraries, so the output works fully offline.

## License

MIT. See [LICENSE](LICENSE). Bundles [jsPDF](https://github.com/parallax/jsPDF)
and [svg2pdf.js](https://github.com/yWorks/svg2pdf.js) (both MIT).

This is a drawing tool, not clinical software. Keep any real family or client
data in files you control.
