# Phase 5: Ecosystem (v6.0)

> Goal: ContentDeck as the hub of your information diet.

Final stage content integrations 

## 5.1 PDF & Document Support
- Upload PDFs to Supabase Storage (1GB free)
- Extract text via edge function (pdf-parse library)
- Inline PDF viewer in reader mode
- Highlight and annotate PDFs
- Source type: `document`

## 5.2 Research Paper Support (PARTLY DONE)
- Detect arXiv, Semantic Scholar, Google Scholar URLs
- Auto-fetch: title, authors, abstract, citation count
- BibTeX export for academic users
- Related papers via Semantic Scholar API (free, 100 req/sec)

## 5.3 GitHub Stars Import
- Import your GitHub starred repos as bookmarks
- Auto-tagged with repo language and topics
- Keep in sync: new stars auto-imported via webhook
- Great for developer audience

## 5.4 Hacker News / Reddit Save
- Browser extension detects HN/Reddit comment pages
- "Save with discussion" — saves URL + top comments as notes
- Captures the context around *why* something was interesting
