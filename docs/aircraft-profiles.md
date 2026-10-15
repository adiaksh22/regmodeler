# Aircraft configuration profiles

The user selected browser storage first. Accounts are deferred: later they can provide private cross-device profiles, shared watchlists and notification preferences. This version needs no sign-in and sends no profile fields to Supabase or the FAA. Clearing browser storage removes the saved profiles.

## Supported workflow

Open TCDS 2A13, select PA-28-140 or PA-28-181 and expand **Aircraft configuration**. Enter a profile name, optional complete serial number, STC entries and reviewed equipment entries. Each STC/equipment entry has an explicit installation status (installed, not installed or unknown) and an optional aircraft-record reference. Equipment choices come only from reviewed root conditions for the selected model. Missing serials, unlisted STCs and unrecorded equipment remain unknown. Entries are user reported, not verified maintenance records.

**Save and use profile** applies the saved configuration to the graph and related-record list. Draft edits have no effect until saved. Multiple named profiles can be kept for each model, selected independently, exported as JSON or deleted. Browsing without a profile restores the general model view. JSON import and automatic profile migration are not implemented yet.

## Relevance boundaries

Relevance uses current published, reviewed graph connections. Candidate metadata is never converted into an applicability rule. Historical discovery snapshots without corresponding current reviewed evidence remain “needs review.”

For reviewed AD connections containing structured serial ranges, comparison includes both endpoints and requires the same prefix and serial width. Missing serials, unsupported formats, ambiguous ranges or unsafe numeric values remain unknown. “Within reviewed serial range” describes only that source condition; it does not verify compliance, previously performed work, exemptions or alternative methods. “Outside reviewed serial ranges” does not clear other ADs. The first reviewed example is AD 2020-24-05, FAA original page 5, with the source evidence already stored in the graph.

For reviewed STC approval connections, an exact certificate-number match can display **Installed — user reported**, **Not installed — user reported** or **Installation unknown**. Model approval scope does not establish installation, compatibility or access to approved design data.

For reviewed component-dependent AD connections, a canonical equipment-key match can report affected equipment as installed, not installed or unknown. Even an installed match leaves part number, software, component serial/configuration, completed action and compliance to be reviewed. A supporting engine-family graph node is not offered as a profile shortcut when the reviewed root rule requires a more specific affected component.

The optional graph/list filters hide only records or connections classified outside reviewed serial or user-reported equipment scope. Unknowns remain visible. Source excerpts, applicability conditions, cited pages and original-PDF viewing remain available. Other PA-28 models can still be browsed but have no profile editor in this phase.

## Browser storage

The separate `regmodeler_aircraft_profiles_v1` key contains a versioned envelope with profiles and active IDs by model. The reader validates field types, supported models, IDs, timestamps, canonical equipment keys, installation statuses and limits. It remains backward compatible with profiles saved before equipment entries were introduced, copies supported fields and rejects an invalid envelope as a whole. Unreadable, future-version or oversized data is preserved and saving is disabled until the user explicitly resets or reloads it. Other source notes, links and history keys are untouched.

Save failures retain the current draft and never claim success. Before an update, the editor compares the latest saved values with its loaded state; observed changes from another tab require reloading rather than being overwritten. This is a local safeguard, not a transactional multi-user database. Reset and deletion require user confirmation. Limits are 100 profiles, 50 entries per profile and a one-million-character envelope.

## Verification

Offline tests cover inclusive serial boundaries, adjacent serials, unknown/padded/prefix formats, model isolation, reported STC/equipment installation, backward-compatible profile reads, duplicate entries, corrupted/future browser data, blocked/full storage and value comparisons independent of JSON property order.

An optional isolated Chrome check is available after `npm.cmd run build` and starting the preview on port 4173:

```powershell
node --env-file=.env.production.local scripts/profile-smoke.cjs
```

It checks draft/save separation, persistence, relevance filters that retain unknowns, two-model profile preservation, mobile layout, stale-edit rejection, corruption preservation and absence of profile fields in network requests. It uses a temporary Chrome profile, not the user's browser data. The existing `scripts/smoke.cjs --database` flow checks source exploration and catalog outage behavior.

The website remains unpublished. No account system, profile uploads or automated notifications are introduced in this phase. See [installed-equipment review](pa28-installed-equipment-review.md) for the reviewed source set and graph behavior.
