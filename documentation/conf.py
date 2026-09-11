# Sphinx configuration for the London Customs Accounts documentation sidecar.
#
# Built by .github/workflows/deploy-pages.yml into docs/documentation/ and
# served from https://ihr-digital.github.io/london-customs-accounts-1380-1560/documentation/

from datetime import datetime

project = 'London Customs Accounts'
author = 'Project Team'
start_year = 2025
current_year = datetime.now().year
copyright = f'{start_year}–{current_year}, {author}' if current_year > start_year else f'{current_year}, {author}'

extensions = [
    'myst_parser',
    'notfound.extension',
    'sphinx_copybutton',
    'sphinx.ext.autodoc',
    'sphinx.ext.napoleon',
    'sphinxcontrib.mermaid',
]

myst_enable_extensions = [
    'amsmath',
    'colon_fence',
    'deflist',
    'html_admonition',
    'html_image',
    'replacements',
    'smartquotes',
    'substitution',
    'tasklist',
    'linkify',
]

myst_heading_anchors = 5
numfig = True

templates_path = ['_templates']
exclude_patterns = ['_build', 'Thumbs.db', '.DS_Store', '.venv', 'env', 'README.md', '_drafts']

# -- HTML output -------------------------------------------------------------

html_theme = 'shibuya'
html_theme_options = {
    'accent_color': 'amber',
    'color_mode': 'auto',
    'github_url': 'https://github.com/ihr-digital/london-customs-accounts-1380-1560',
    'globaltoc_expand_depth': 2,
    'nav_links': [
        {
            'title': 'Main site',
            'url': 'https://ihr-digital.github.io/london-customs-accounts-1380-1560/',
            'external': True,
        },
        {
            'title': 'Glossary',
            'url': 'https://ihr-digital.github.io/london-customs-accounts-1380-1560/glossary.html',
            'external': True,
        },
    ],
}

html_context = {
    'source_type': 'github',
    'source_user': 'ihr-digital',
    'source_repo': 'london-customs-accounts-1380-1560',
    'source_version': 'main',
    'source_docs_path': '/documentation/',
}

html_title = 'London Customs Accounts'
html_baseurl = 'https://ihr-digital.github.io/london-customs-accounts-1380-1560/documentation/'
html_static_path = ['_static']
html_favicon = '../docs/favicon.ico'

html_css_files = ['css/custom.css']
html_js_files = []

html_last_updated_fmt = '%d %B %Y'
today_fmt = html_last_updated_fmt

# -- 404 page ----------------------------------------------------------------

notfound_urls_prefix = '/london-customs-accounts-1380-1560/documentation/'
notfound_context = {
    'title': 'Page not found',
    'body': """
    <div style="text-align: center; margin-top: 3em; margin-bottom: 3em;">
        <h1 style="font-size: 2.2em;">404 — Page not found</h1>
        <p style="font-size: 1.1em; max-width: 40em; margin: 1em auto; opacity: 0.85;">
            Sorry, the page you were looking for doesn't exist or may have been moved.
        </p>
        <p style="font-size: 1em; opacity: 0.85;">
            Return to the <a href="/london-customs-accounts-1380-1560/documentation/">documentation home</a>
            or the <a href="/london-customs-accounts-1380-1560/">main site</a>.
        </p>
    </div>
    """,
}
