# Relationship and applicability architecture

Updated October 14, 2026. This document describes the public evidence graph and the structured conditions added for multi-family expansion.

## Canonical graph

`catalog_entities` stores one identity for each model, family, certificate, regulation, component, engine, service document, configuration, operating limit, or certification project. `relationships` connects two identities to one immutable source version and requires a cited page or section, excerpt, review state, and publication state.

The public `model_graph` view follows row-level security and exposes only published, reviewed paths backed by published evidence. Model-to-certificate scope is derived from reviewed `covered_by` relationships, so related AD/STC paths no longer depend on a hardcoded TCDS number. This lets 2A13 and A16WE use the same API and node-link component.

| Layer | Purpose | Integrity boundary |
| --- | --- | --- |
| `documents` / `document_versions` | Canonical source and immutable snapshots | One current version; SHA-256 and archive path validation |
| `catalog_entities` | Shared real-world identity | Authority, entity type, and natural key are unique |
| `relationships` | Directed evidence path | Foreign keys, exact evidence version, reviewed/public gate |
| `aircraft_variant_profiles` | FAA status and family membership | Entity, family, TCDS, evidence, approval-state checks |
| `aircraft_variant_facts` | Page-cited technical or operating fact | Controlled fact type, one value shape, nonnegative numeric checks, unique fact per evidence version |
| `applicability_rule_sets` | Outcome attached to one reviewed relationship | One rule set per relationship and matching evidence version |
| `applicability_rule_groups` | Alternative branch | Ordered `ALL` or `ANY` groups with cascading ownership |
| `applicability_predicates` | Exact model, serial, component, STC, software, drawing, or action test | Controlled subject/comparison types, JSON expected value, page citation |

All new tables deny client writes. Anonymous/authenticated reads require the parent entity, source version, and relationship to remain published. Service-role transactions are the only publication path.

## Compound logic

AD 2022-03-15 is the first structured example. Its rule set has two alternative groups:

```text
(G3X Touch present
 AND STC SA01899WI present
 AND MDL 005-01320-00 revision <= 9
 AND GEA 24 resistive-fuel interface present)

OR

(GI 275 MFD present
 AND STC SA02658SE present
 AND MDL 005-01280-00 revision <= 9
 AND GEA 24 resistive-fuel interface present)
```

The existing browser profile only records the reviewed combined configuration at a high level, so the UI displays these branches as details requiring record review. It does not claim a positive match until future profile fields can represent each predicate.

## Scaling path

Adding an aircraft family now follows one repeatable flow:

1. query one exact FAA TCDS number and reconcile all revisions;
2. archive immutable PDF and metadata objects;
3. create reviewed model-to-certificate, family, engine, and regulation paths from cited pages;
4. store technical facts with their own page and conditions;
5. represent planned products separately from approved FAA models;
6. discover AD/STC candidates by exact current model identities;
7. publish only reviewed candidate paths with explicit serial, configuration, and component rules; and
8. watch the TCDS and related-source checkpoints for changes.

New user aircraft remain small profile overlays. They reference canonical model/component keys and never duplicate regulatory documents or turn user-entered facts into publisher data.
