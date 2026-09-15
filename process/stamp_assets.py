"""Version every local script and stylesheet by its content, at deploy time.

GitHub Pages serves assets with a ten-minute cache, and browsers hold them
longer. A reader with the site open keeps running yesterday's JavaScript against
today's data -- silently, and with no way to tell that is what they are seeing.
Half of this site's bugs would look exactly like that.

So each local `js/*.js` and `css/*.css` reference gains `?v=<hash of the file>`.
By CONTENT, not by date or by a counter: the URL changes when and only when the
code changes, so a deploy that touches nothing invalidates nothing, and one that
fixes something invalidates precisely that.

This runs in the deploy workflow against the runner's checkout, so the committed
HTML stays clean and nobody has to remember to run it. Running it by hand does
no harm -- it is idempotent, stripping any existing stamp before rewriting.

    python -m process.stamp_assets [--dir docs] [--check]
"""

from __future__ import annotations

import argparse
import hashlib
import re
from pathlib import Path

# src="js/main.js", href="css/styles.css", with or without an existing ?v=
REFERENCE = re.compile(r'(?P<attr>\b(?:src|href)=")(?P<path>(?:js|css)/[^"?#]+\.(?:js|css))'
                       r'(?:\?v=[^"#]*)?(?P<rest>[^"]*)"')


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()[:10]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", default="docs", help="the site root (default: %(default)s)")
    ap.add_argument("--check", action="store_true",
                    help="report what would change; write nothing")
    args = ap.parse_args()

    root = Path(args.dir)
    if not root.is_dir():
        raise SystemExit(f"{root} is not a directory")

    hashes: dict = {}
    stamped = missing = 0
    pages = 0

    for page in sorted(root.glob("*.html")):
        text = page.read_text(encoding="utf-8")

        def stamp(match: re.Match) -> str:
            nonlocal stamped, missing
            asset = root / match.group("path")
            if not asset.exists():
                # A reference to a file that is not there is a broken page, not
                # a caching question, and silently leaving it unstamped would
                # hide it. Say so and move on.
                missing += 1
                print(f"  ! {page.name} references {match.group('path')}, "
                      f"which does not exist")
                return match.group(0)
            if asset not in hashes:
                hashes[asset] = digest(asset)
            stamped += 1
            return (f'{match.group("attr")}{match.group("path")}'
                    f'?v={hashes[asset]}{match.group("rest")}"')

        rewritten = REFERENCE.sub(stamp, text)
        if rewritten != text:
            pages += 1
            if not args.check:
                page.write_text(rewritten, encoding="utf-8")

    print(f"--- {stamped} reference(s) stamped across {pages} page(s), "
          f"{len(hashes)} distinct asset(s) ---")
    if missing:
        print(f"--- {missing} reference(s) point at files that do not exist ---")
    if args.check:
        print("(check only -- nothing written)")


if __name__ == "__main__":
    main()
