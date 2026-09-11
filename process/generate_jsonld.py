#!/usr/bin/env python3
"""
Generate JSON-LD entity files for ladings, cargos, and glossary terms.

Reads pipeline output from docs/data/ and writes individual JSON-LD files
into docs/api/ for serving via GitHub Pages.

Entity types and URI patterns:
  - Ladings:    mlca:{lading_id}           → docs/api/{lading_id}.json
  - Cargos:     mlca:{lading_id}-{seq}     → node within parent lading file
  - Glossary:   mlca:glossary/{term}       → docs/api/glossary/{term}.json

Files use .json extension so GitHub Pages serves application/json (it
serves .jsonld as application/octet-stream).  The w3id.org 303 redirect
conveys the JSON-LD semantics; JSON-LD processors accept application/json.

Usage:
  python -m process.generate_jsonld              # generate all
  python -m process.generate_jsonld --ladings    # ladings only
  python -m process.generate_jsonld --glossary   # glossary only
  python -m process.generate_jsonld --dry-run    # count without writing
"""

import argparse
import json
import logging
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)

ROOT = Path(__file__).resolve().parents[1]
LADINGS_DIR = ROOT / "docs" / "data" / "ladings"
API_DIR = ROOT / "docs" / "api"
_GLOSSARY_JSON = ROOT / "docs" / "data" / "glossary_data.json"
_QUALIFIERS_JSON = ROOT / "docs" / "data" / "qualifiers.json"


def _load_qual_store():
    """Canonical qualifier store (docs/data/qualifiers.json); {} if absent."""
    try:
        with open(_QUALIFIERS_JSON, encoding="utf-8") as fh:
            return (json.load(fh) or {}).get("canonicals", {}) or {}
    except FileNotFoundError:
        return {}


_QUAL_STORE = _load_qual_store()


def _aat_uri(aat_id):
    return f"http://vocab.getty.edu/aat/{aat_id}"


def _ld_qualifier(q, store):
    """Resolve one entry.q item to a JSON-LD qualifier object, handling the
    migrated ``ref``/``tokens``/``raw`` references as well as legacy ``t``.
    Identifiers set once on a canonical inherit here."""
    # carry through item-level free fields (description, memo, ...), drop noise
    ld = {k: v for k, v in q.items()
          if k not in ("v", "s", "a", "promote", "ref", "tokens", "raw", "t", "ann", "p")}

    def _apply_canonical(c):
        if not c:
            return
        ld.setdefault("label", c.get("label"))
        if c.get("gloss") and not ld.get("d"):
            ld["d"] = c["gloss"]
        aat = c.get("aat") or {}
        if aat.get("semantic"):
            ld["qualifierType"] = _aat_uri(aat["semantic"])
        if aat.get("specific"):
            ld["qualifierAAT"] = _aat_uri(aat["specific"])
        geo = c.get("geo") or {}
        if geo.get("id") or geo.get("wikidata"):
            ld["provenance"] = {
                "identifier": geo.get("wikidata") or geo.get("id"),
                "label": geo.get("label"),
            }

    if q.get("ref"):
        ld["label"] = q["ref"]
        _apply_canonical(store.get(q["ref"]))
    elif isinstance(q.get("tokens"), list):
        labels, parts = [], []
        for tk in q["tokens"]:
            if tk.get("lit") is not None:
                labels.append(tk["lit"]); parts.append(tk["lit"])
            else:
                c = store.get(tk.get("ref"))
                labels.append((c or {}).get("label", tk.get("ref", "")))
                parts.append(f"{BASE_URI}/qualifier/{tk['ref']}" if c else (c or {}).get("label", tk.get("ref", "")))
        ld["label"] = " ".join(labels)
        ld["tokens"] = parts
    elif q.get("raw") is not None:
        ld["label"] = q["raw"]
    else:
        # legacy {t}: keep prior behaviour, but enrich from the store if matched
        if q.get("s"):
            ld["qualifierType"] = _aat_uri(q["s"])
        if q.get("a"):
            ld["qualifierAAT"] = _aat_uri(q["a"])
        first = (q.get("t") or "").split("|")[0]
        _apply_canonical(store.get(first))
    return ld

BASE_URI = "https://w3id.org/mlca"
CONTEXT_URI = f"{BASE_URI}/context"  # w3id.org redirects to .../api/context.json


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _parse_field(value):
    """Parse a JSON-string field or return it if already parsed."""
    if isinstance(value, str):
        return json.loads(value)
    return value


def _find_annotations(annotations, *types):
    """Return annotations matching any of the given types, in order."""
    return [a for a in annotations if a.get("type") in types]


def _first_text(annotations, ann_type):
    """Return the text of the first annotation of the given type, or None."""
    for a in annotations:
        if a.get("type") == ann_type:
            return a.get("text")
    return None


# ---------------------------------------------------------------------------
# Lading → JSON-LD
# ---------------------------------------------------------------------------

def _build_vessel(label_annotations):
    """Extract vessel info from lading label annotations."""
    vessel = {}
    ship_type = _first_text(label_annotations, "ship-type")
    if ship_type:
        vessel["shipType"] = ship_type
    ship_name = _first_text(label_annotations, "ship-name")
    if ship_name:
        vessel["shipName"] = ship_name
    master_gn = _first_text(label_annotations, "master-forename")
    master_sn = _first_text(label_annotations, "master-surname")
    if master_gn or master_sn:
        master = {}
        if master_gn:
            master["givenName"] = master_gn
        if master_sn:
            master["familyName"] = master_sn
        vessel["master"] = master
    return vessel or None


def _build_cargo_commodities(annotations):
    """Extract commodity references from cargo annotations."""
    commodities = []
    for ann in annotations:
        if ann.get("type") not in ("commodity", "commodity-unit"):
            continue
        matches = ann.get("matches", [])
        if not matches:
            commodities.append({"text": ann["text"]})
            continue
        # Use first match for the primary headword
        best = matches[0]
        key = best.get("key", best.get("headword", ann["text"]))
        hw = best.get("headword", ann["text"])
        entry = {
            "text": ann["text"],
            "headword": hw,
            "commodity": f"{BASE_URI}/glossary/{key}",
        }
        # Subject groupings are carried on the linked commodity entity, not
        # denormalised onto each cargo reference.
        quals = ann.get("qualifiers")
        if quals:
            entry["qualifiers"] = [q.get("canonical") or q.get("text") for q in quals]
        commodities.append(entry)
    return commodities or None


def _build_cargo(cargo, lading_id, seq):
    """Build a JSON-LD cargo node."""
    cargo_id = f"{BASE_URI}/{lading_id}-{seq:04d}"
    annotations = cargo.get("annotations", [])

    node = {
        "@id": cargo_id,
        "@type": "Cargo",
        "text": cargo["text"],
    }

    # Merchant
    merchant_gn = _first_text(annotations, "forename")
    merchant_sn = _first_text(annotations, "surname")
    if merchant_gn or merchant_sn:
        merchant = {}
        if merchant_gn:
            merchant["givenName"] = merchant_gn
        if merchant_sn:
            merchant["familyName"] = merchant_sn
        status = _first_text(annotations, "status")
        if status:
            merchant["status"] = status
        node["merchant"] = merchant

    # Commodities
    comms = _build_cargo_commodities(annotations)
    if comms:
        node["commodities"] = comms

    return node


def build_lading_jsonld(lading):
    """Convert a pipeline lading dict to a JSON-LD document."""
    lading_id = lading["lading_id"]
    label = _parse_field(lading.get("label", {}))
    cargos_raw = _parse_field(lading.get("cargos", []))

    doc = {
        "@context": CONTEXT_URI,
        "@id": f"{BASE_URI}/{lading_id}",
        "@type": "Lading",
        "ladingId": lading_id,
    }

    # Date
    date_info = lading.get("date", {})
    dates = date_info.get("dates", [])
    if dates:
        doc["date"] = dates[0] if len(dates) == 1 else dates

    # Customs type
    ct = lading.get("customs_type")
    if ct:
        doc["customsType"] = ct

    # Direction
    if "export" in lading:
        doc["direction"] = "export" if lading["export"] else "import"

    # Page
    page_info = lading.get("page", {})
    if page_info.get("number"):
        doc["page"] = page_info["number"]

    # Label text
    if label.get("text"):
        doc["text"] = label["text"]

    # Vessel
    vessel = _build_vessel(label.get("annotations", []))
    if vessel:
        doc["vessel"] = vessel

    # Cargos
    if cargos_raw:
        doc["cargo"] = [
            _build_cargo(c, lading_id, i + 1)
            for i, c in enumerate(cargos_raw)
        ]

    return doc


# ---------------------------------------------------------------------------
# Glossary → JSON-LD
# ---------------------------------------------------------------------------

def build_glossary_jsonld(term_key, entry):
    """Convert a glossary entry to a JSON-LD document.

    Omits the ``v`` (volume occurrence) fields from forms.
    """
    doc = {
        "@context": CONTEXT_URI,
        "@id": f"{BASE_URI}/glossary/{term_key}",
        "@type": "Commodity",
        "label": term_key.replace("_", " "),
    }

    desc = entry.get("d")
    if desc:
        doc["description"] = desc

    groups = entry.get("groups")
    if groups:
        doc["groups"] = groups

    # Entry-level geographic provenance (supports single object or array)
    geo = entry.get("geo")
    if geo:
        geo_list = geo if isinstance(geo, list) else [geo]
        provenance_items = []
        for g in geo_list:
            if g and g.get("id"):
                prov = {
                    "label": g.get("label", ""),
                    "identifier": g["id"],
                }
                if g.get("dataset"):
                    prov["dataset"] = g["dataset"]
                provenance_items.append(prov)
        if len(provenance_items) == 1:
            doc["provenance"] = provenance_items[0]
        elif len(provenance_items) > 1:
            doc["provenance"] = provenance_items

    # Materials (AAT material concepts)
    materials = entry.get("materials", [])
    if materials:
        doc["materials"] = [
            {
                "@id": f"http://vocab.getty.edu/aat/{m['id']}",
                "label": m.get("label", ""),
            }
            for m in materials
            if m.get("id")
        ]

    # Forms — include spelling only, omit v (volume occurrences), sorted alphabetically
    forms = entry.get("f", [])
    if forms:
        doc["forms"] = sorted(
            [{"spelling": f["t"]} for f in forms if f.get("t")],
            key=lambda x: x["spelling"],
        )

    # Cross-references as glossary URIs
    xrefs = entry.get("x", [])
    if xrefs:
        doc["crossReferences"] = [
            f"{BASE_URI}/glossary/{x}" for x in xrefs
        ]

    # Qualifiers
    quals = entry.get("q", [])
    if quals:
        doc["qualifiers"] = [_ld_qualifier(q, _QUAL_STORE) for q in quals]

    # Compound-of links (hector:compoundOf)
    compound_of = entry.get("compoundOf", [])
    if compound_of:
        doc["compoundOf"] = [
            f"{BASE_URI}/glossary/{k}" for k in compound_of
        ]

    # Related terms (skos:related)
    related = entry.get("related", [])
    if related:
        doc["related"] = [
            f"{BASE_URI}/glossary/{k}" for k in related
        ]

    return doc


# ---------------------------------------------------------------------------
# File writing
# ---------------------------------------------------------------------------

def _write_jsonld(path, doc):
    """Write a JSON-LD document to a file."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, separators=(",", ":"))


def _volume_lading_prefix(volume_stem):
    """Map a volume file stem (e.g. 'IV-3') to the lading ID prefix ('4-3-').

    Roman volume numerals are converted to Arabic: I→1, II→2, III→3, IV→4, V→5.
    """
    roman_map = {"I": "1", "II": "2", "III": "3", "IV": "4", "V": "5"}
    parts = volume_stem.split("-", 1)
    arabic = roman_map.get(parts[0], parts[0])
    return f"{arabic}-{parts[1]}-"


def _cleanup_stale_ladings(prefix):
    """Remove existing lading files matching *prefix* from API_DIR."""
    removed = 0
    for f in API_DIR.glob(f"{prefix}*.json"):
        f.unlink()
        removed += 1
    if removed:
        logging.info("Removed %d stale files for prefix %s", removed, prefix)


def generate_ladings(dry_run=False, volumes=None):
    """Generate JSON-LD for ladings.

    Parameters
    ----------
    dry_run : bool
        Count entities without writing files.
    volumes : list[str] | None
        If provided, only process these volume stems (e.g. ['IV-3', 'II-1']).
        Existing files for those volumes are cleaned up before writing so that
        stale ladings from a cached ``docs/api/`` don't persist.
    """
    if not LADINGS_DIR.exists():
        logging.error("Ladings directory not found: %s", LADINGS_DIR)
        return 0, 0

    lading_count = 0
    cargo_count = 0
    volume_files = sorted(LADINGS_DIR.glob("*.json"))

    if volumes:
        volume_set = set(volumes)
        volume_files = [vf for vf in volume_files if vf.stem in volume_set]
        if not volume_files:
            logging.warning("No matching volume files for: %s", volumes)
            return 0, 0

    for vf in volume_files:
        logging.info("Processing volume %s", vf.stem)

        # Clean up stale files for this volume before writing
        if not dry_run and volumes:
            _cleanup_stale_ladings(_volume_lading_prefix(vf.stem))

        with open(vf, "r", encoding="utf-8") as f:
            ladings = json.load(f)

        for lading in ladings:
            doc = build_lading_jsonld(lading)
            lading_id = lading["lading_id"]
            cargo_count += len(doc.get("cargo", []))

            if not dry_run:
                out_path = API_DIR / f"{lading_id}.json"
                _write_jsonld(out_path, doc)

            lading_count += 1

    return lading_count, cargo_count


def generate_glossary(dry_run=False):
    """Generate JSON-LD for all glossary terms."""
    if not _GLOSSARY_JSON.exists():
        logging.error("No glossary file found")
        return 0

    logging.info("Reading glossary from %s", _GLOSSARY_JSON.name)
    with open(_GLOSSARY_JSON, "r", encoding="utf-8") as f:
        glossary = json.load(f)

    if not glossary:
        logging.error("No glossary file found")
        return 0

    entries = glossary.get("entries", {})
    count = 0

    for term_key, entry in entries.items():
        doc = build_glossary_jsonld(term_key, entry)

        if not dry_run:
            # URL-safe filename (replace problematic chars)
            safe_key = term_key.replace("/", "_slash_")
            out_path = API_DIR / "glossary" / f"{safe_key}.json"
            _write_jsonld(out_path, doc)

        count += 1

    return count


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Generate JSON-LD entity files for ladings and glossary terms."
    )
    parser.add_argument(
        "--ladings", action="store_true", help="Generate ladings only"
    )
    parser.add_argument(
        "--glossary", action="store_true", help="Generate glossary only"
    )
    parser.add_argument(
        "--volume", action="append", metavar="STEM",
        help="Limit lading generation to specific volume(s), e.g. --volume IV-3. "
             "Implies --ladings. May be repeated.",
    )
    parser.add_argument(
        "--dry-run", action="store_true", help="Count entities without writing files"
    )
    args = parser.parse_args()

    # --volume implies --ladings
    if args.volume:
        args.ladings = True

    do_all = not args.ladings and not args.glossary

    if do_all or args.ladings:
        nl, nc = generate_ladings(
            dry_run=args.dry_run, volumes=args.volume,
        )
        logging.info(
            "Ladings: %d files, %d cargos%s%s",
            nl, nc,
            f" (volumes: {', '.join(args.volume)})" if args.volume else "",
            " (dry run)" if args.dry_run else "",
        )

    if do_all or args.glossary:
        ng = generate_glossary(dry_run=args.dry_run)
        logging.info(
            "Glossary: %d files%s",
            ng, " (dry run)" if args.dry_run else "",
        )


if __name__ == "__main__":
    main()






