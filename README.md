# London Customs Accounts, 1380–1560

Machine-readable data and browser-based research tools for the particular customs
accounts of the port of London, produced by the project
**[Unlocking Upcycled Medieval Data: North Sea Networks, People, and Commodities in
the London Customs Accounts 1380–1560](https://www.history.ac.uk/research/centre-history-people-place-community/unlocking-upcycled-medieval-data)**.

The London particular customs accounts are the single largest surviving serial
collection of medieval trade documents in Europe. This project "upcycles" existing
scholarly transcripts of those accounts — semi-structured text prepared over decades
for human readers — into structured, linkable data, and develops reusable methods for
doing so in a way that respects the historian's relationship with the source.

## What is in this repository

This repository hosts the project's public web outputs: a static site of interactive
tools and visualisations built over the structured data, together with the
documentation describing how that data was produced.

The site can be found at https://w3id.org/mlca.

Planned contents:

| Component | Description |
|---|---|
| Accounts explorer | Browse and filter ladings by date, commodity, person, ship and place |
| Commodity glossary | Curated glossary of traded goods, aligned to Getty AAT and Wikidata |
| Name indexes | Reconciled merchant, shipmaster and official identities |
| Visualisations | Trade networks, commodity distributions and geographic provenance |
| Documentation | Method notes on parsing, annotation, name matching and vocabulary alignment |

### Scale of the dataset

Measured from the data published here on 22 September 2026:

- **33,548** ladings across **46** account-book files (Volumes I–IV), holding **212,196** cargos
- **324,907** commodity rows in the cargo records, every one carrying a Getty AAT or Wikidata identifier
- **2,452** glossary concepts, attested by **19,414** spellings, in **35** subject groupings derived from Getty AAT
- **248,475** person mentions grouped into **111,964** groups for identity matching
- **36,118** distinct surname spellings and **5,474** distinct forename spellings in the published annotations

## Project team

| Name | Role | Institution | ORCiD |
|---|---|---|---|
| Dr Justin Colson | Principal Investigator (AHRC) | Institute of Historical Research, University of London | [0000-0002-4352-2154](https://orcid.org/0000-0002-4352-2154) |
| Prof. Dr Werner Scheltjens | Principal Investigator (DFG) | Otto-Friedrich-Universität Bamberg | [0000-0002-5209-9052](https://orcid.org/0000-0002-5209-9052) |
| Dr Eliot Benbow | Research Associate | Institute of Historical Research, University of London | [0000-0003-2795-4210](https://orcid.org/0000-0003-2795-4210) |
| Dr Stephen Gadd | Research Associate | Institute of Historical Research, University of London | [0000-0003-3060-0181](https://orcid.org/0000-0003-3060-0181) |
| Dr María Grove-Gordillo | Research Associate | Otto-Friedrich-Universität Bamberg | [0000-0001-7840-1611](https://orcid.org/0000-0001-7840-1611) |
| Isabel Rösner | Project assistance | Otto-Friedrich-Universität Bamberg | — |
| Lea Sofia Grießbach | Project assistance | Otto-Friedrich-Universität Bamberg | — |

Isabel Rösner provides project assistance in Bamberg, taking over the role from
Lea Sofia Grießbach.

**Project partner:** [European Hansemuseum / Europäisches Hansemuseum](https://www.hansemuseum.eu/), Lübeck.

## Funding

Funded by the Arts and Humanities Research Council (AHRC) and the Deutsche
Forschungsgemeinschaft (DFG) under the AHRC–DFG bilateral scheme, as a collaboration
between the Institute of Historical Research, School of Advanced Study, University of
London, and Otto-Friedrich-Universität Bamberg.

**UK side (AHRC)**

- **Grant reference:** [AH/Z507179/1](https://gtr.ukri.org/projects?ref=AH%2FZ507179%2F1)
- **Lead research organisation:** University of London
- **Period:** 4 February 2025 – 3 February 2027

**German side (DFG)**

- **Project number:** [547507634](https://gepris.dfg.de/project/547507634) (application APP19735)
- **Applicant:** Prof. Dr Werner Scheltjens, Otto-Friedrich-Universität Bamberg
- **Funding period:** since 2024 · DFG procedure: aid in kind
- **DFG subject classification:** 1.12-01 Medieval History · 1.24-07 Economic and Social History

## Related work

- **[HECTOR](https://w3id.org/hector/)** — Historical Economic Commodities: Terminologies,
  Ontologies, & Rates. A Linked Data commodity and unit taxonomy, aligned to Linked Art
  and CIDOC-CRM, developed alongside this project.
- Linked Data identifiers for project entities are minted under the namespace
  [`https://w3id.org/mlca/`](https://w3id.org/mlca/).

## Sources and acknowledgements

The structured data derives from transcripts and editions prepared by earlier
scholarship, and from reference works consulted under their own terms of use. Full
source acknowledgements and rights statements accompany the data as it is released.

## Citation

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.22709785.svg)](https://doi.org/10.5281/zenodo.22709785)

Every release is archived on Zenodo. The DOI above is the *concept* DOI: it always
resolves to the most recent version, and it is the one to cite unless you need to
pin a specific release.

> Colson, J., Scheltjens, W., Benbow, E., Gadd, S., & Grove-Gordillo, M.
> *London Customs Accounts, 1380–1560: machine-readable data and research tools*
> [Data set]. Zenodo. https://doi.org/10.5281/zenodo.22709785

`CITATION.cff` carries the same metadata in machine-readable form; GitHub's
**Cite this repository** button reads it.

## Data licensing

Every data file must have its rights position settled before it is published here.
That clearance is tracked source by source as the data is prepared, and each file
arrives with its rights position stated.

## Status and licence

This repository is under active development ahead of first release.

- **Site code** (JavaScript, HTML, CSS under `docs/`) — MIT: [`LICENSE-MIT`](LICENSE-MIT).
- **Project-authored data** — CC BY 4.0: [`LICENSE`](LICENSE). Attribute as
  *Unlocking Upcycled Medieval Data (IHR / Universität Bamberg)*, citing the DOI of
  the release used.
- **Everything else** — not yet cleared. Until a file is published here with its
  rights position stated, no permission to reuse it is granted or implied.

`LICENSE` at the root is the licence for the project's own data, which is what
GitHub and Zenodo will report for the repository as a whole. It does not override
either of the other two positions above: the code is MIT, and material deriving from
earlier editions and reference works carries no permission until one is stated.

## Contact

Enquiries about the project should be directed to the Institute of Historical Research
via the [project page](https://www.history.ac.uk/research/centre-history-people-place-community/unlocking-upcycled-medieval-data).
