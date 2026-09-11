# Contributing to the documentation

The documentation lives in the
[`documentation/`](https://github.com/docuracy/London_Customs_Accounts/tree/main/documentation)
directory of the main repository. Every push to `main` that touches anything
under that directory triggers the GitHub Pages workflow, which rebuilds the
site and republishes it at
<https://ihr-digital.github.io/london-customs-accounts-1380-1560/documentation/> within
a couple of minutes.

You don't need to install anything to contribute — every step described
on this page is done in your web browser on github.com.

## Previewing your edits

The GitHub editor has a **Preview** tab right next to the text-editing
view. It shows the rendered Markdown live as you type, so you can see
how headings, lists, tables, links, and images will look before you
commit anything. Switching between the **Edit** and **Preview** tabs is
the normal way to check your work.

The Preview tab shows the **Markdown rendering** only — the colours,
fonts, and navigation of the published site are added later by the
build. To see the fully styled page exactly as visitors will, commit
your change and wait a couple of minutes for the site to rebuild.

## Editing an existing page

1. Open the file you want to edit on
   [github.com](https://github.com/docuracy/London_Customs_Accounts/tree/main/documentation/content).
2. Click the **pencil icon** in the top-right of the file view.
3. Make your changes, switching between the **Edit** and **Preview**
   tabs to check how the output looks.
4. Scroll down, type a short commit message, and click **Commit changes**.

That's it — within a couple of minutes the site rebuilds and your edit
goes live.

## Adding a new page

1. Open the
   [`documentation/content/`](https://github.com/docuracy/London_Customs_Accounts/tree/main/documentation/content)
   folder on github.com.
2. Click **Add file → Create new file**.
3. Type a filename ending in `.md` (e.g. `customs-officers.md`) and
   write your page. Use the **Preview** tab to check formatting as you
   go.
4. Click **Commit changes**.
5. Open
   [`documentation/index.rst`](https://github.com/docuracy/London_Customs_Accounts/blob/main/documentation/index.rst)
   and click the pencil icon. Add a line for your new file under the
   `toctree` directive, for example:

   ```
   My New Page <content/my-new-page.md>
   ```

   Without this entry the page is built but won't appear in the
   sidebar.
6. Commit. The site rebuilds and the new page is live within a couple
   of minutes.

## Uploading Word documents

If you have an existing draft as a Microsoft Word document, you can
**upload it through the GitHub web UI and the site will convert it
automatically**.

### How to upload

1. Open the
   [`documentation/_drafts/`](https://github.com/docuracy/London_Customs_Accounts/tree/main/documentation/_drafts)
   folder on github.com.
2. Click **Add file → Upload files** and drop your `.docx` (or `.doc`)
   into the page.
3. Add a one-line commit message ("Add draft on …") and click
   **Commit changes**.

The GitHub Pages workflow then:

1. Runs **pandoc** over each Word document.
2. Writes the converted Markdown to
   `documentation/content/<filename>.md` (lower-cased, hyphenated).
3. Extracts any embedded images into
   `documentation/_static/media/<filename>/`.
4. Deletes the original `.docx` from `_drafts/`.
5. Commits the result back to `main`.
6. Rebuilds and republishes the site, so the new page is live.

For legacy `.doc` files (pre-Word-2007), LibreOffice in the workflow
first promotes them to `.docx` before pandoc runs.

### What you need to do afterwards

Pandoc handles the bulk of the conversion reliably — body text,
paragraphs, headings, lists, simple tables, footnotes, hyperlinks, and
embedded images all come through.

You will usually still want to follow up with some manual editing,
which you can do directly in the GitHub web editor using the same
pencil-icon workflow described above:

- **Add the new page to the navigation.** Open
  [`documentation/index.rst`](https://github.com/docuracy/London_Customs_Accounts/blob/main/documentation/index.rst)
  and add a line for your converted file under the `toctree` directive.
  Without this, the page is built but won't appear in the sidebar.
- **Tidy any awkward formatting.** Word-specific styling (text boxes,
  multi-column layouts, equation editor output, smart-art diagrams)
  rarely survives. Open the converted `.md` and clean it up in the web
  editor, using the **Preview** tab to check the result.
- **Review image placement.** Pandoc emits images inline at the same
  point they appeared in Word, but very large images may need resizing
  or moving to an admonition.
- **Promote tables if needed.** Complex Word tables can come through as
  HTML blocks. They render fine, but a hand-edited Markdown table is
  cleaner.

### Things to know

- The folder name `_drafts` is significant — the workflow only looks
  there. Uploading a `.docx` anywhere else has no effect.
- If you upload `pipeline.docx` and a `pipeline.md` already exists, the
  existing file is **overwritten**. Rename your upload first if that
  isn't what you want.
- The conversion commit is authored by `github-actions[bot]`, so the
  history clearly shows what was generated and what was hand-edited
  afterwards.
- If the conversion fails (a corrupt file, an unknown format), the
  workflow log will show the pandoc error. The `.docx` stays in
  `_drafts/` so you can fix the source and try again.
