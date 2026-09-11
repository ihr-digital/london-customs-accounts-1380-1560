# London Customs Accounts — Documentation

Sphinx source for the documentation sidecar served at
<https://docuracy.github.io/London_Customs_Accounts/documentation/>.

The site is built and deployed automatically by
`.github/workflows/deploy-pages.yml` on every push to `main` that touches
`documentation/**`. There is nothing to commit by hand under
`docs/documentation/` — the workflow generates that directory on each run.

## Editing online

Open any Markdown file under `content/` on github.com, click the pencil
icon, and commit your changes to `main`. The editor's **Preview** tab
shows the rendered Markdown live. The Pages workflow rebuilds the site
within a couple of minutes of each push.

Word documents can be uploaded to
[`_drafts/`](https://github.com/docuracy/London_Customs_Accounts/tree/main/documentation/_drafts);
the workflow auto-converts them to Markdown. See the
[Contributing](https://docuracy.github.io/London_Customs_Accounts/documentation/content/contributing.html)
page for details.

## Editing locally

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
make html
# Open _build/html/index.html in your browser
```

For a live-reloading preview:

```bash
pip install sphinx-autobuild
sphinx-autobuild . _build/html
```

## Layout

| Path | Purpose |
|---|---|
| `conf.py` | Sphinx configuration (Furo theme, MyST parser) |
| `index.rst` | Top-level toctree |
| `content/*.md` | Documentation pages (Markdown via MyST) |
| `_drafts/` | Inbox for Word documents (auto-converted by CI) |
| `_static/` | Static assets (CSS, images) |
| `_templates/` | Sphinx template overrides |
| `requirements.txt` | Python build dependencies |
| `Makefile` | Standard Sphinx make targets |
