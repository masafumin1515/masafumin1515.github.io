# masafumin1515.github.io

Personal academic website of Masafumi Hayashi, built with Jekyll on GitHub Pages
(based on the [academicpages](https://github.com/academicpages/academicpages.github.io) template).
Japanese pages are at `/`, English pages at `/en/`; the globe link in the header switches between them.

## Where things are

| What | File |
| --- | --- |
| Site settings (name, e-mail, analytics) | `_config.yml` |
| Bio, menu labels, headings, date formats per language | `_data/i18n.yml` |
| Header menu | `_data/navigation.yml` |
| Top page | `_pages/about.md` (ja), `_pages/en/about.md` (en) |
| Publications / Talks / Awards pages | `_pages/*.html`, `_pages/en/*.html` (thin wrappers) |
| List rendering | `_includes/publication-list.html`, `talk-list.html`, `talk-item.html`, `award-list.html`, `author-list.html` |
| Site-specific CSS | `_sass/_custom.scss` |
| Profile photo | `images/profile.png` |

## Adding a talk

Create `_talks/YYYY-MM-DD-short-name.md`:

```yaml
---
title: "日本語タイトル"
title_en: "English title"              # omit for talks given in English
authors: [林真史, 杉山和靖]
authors_en: [Masafumi Hayashi, Kazuyasu Sugiyama]   # omit for talks given in English
venue: "日本流体力学会 年会2026"
venue_en: "Annual Meeting 2026, Japan Society of Fluid Mechanics"
location: "長野"
location_en: "Nagano, Japan"
format: oral                           # oral | poster | invited
peer_reviewed: false
award: "若手優秀講演表彰を受賞"            # optional
award_en: "Received the ... Award"     # optional
date: 2026-09-24
---
```

The owner's name (`self_names` in `_data/i18n.yml`) is underlined as the presenter.

## Adding a publication or an award

- `_publications/YYYY-MM-DD-key.md`: `title`, `authors`, `pub_status` (`submitted` / `published`), `date`, optional `venue`, `link`.
- `_awards/YYYY-MM-key.md`: `title`, `title_en`, `date`.

## Local preview

```sh
docker compose up        # then open http://localhost:4000
```
