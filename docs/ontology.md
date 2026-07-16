---
node_type: reference
title: Botoraptor Documentation Ontology
status: active
updated: 2026-07-16
tags: [meta, ontology]
---

# Botoraptor Documentation Ontology

This document defines the documentation ontology for the Botoraptor project.
It is a local extension of the global code-docs ontology.

## Node Types

| `node_type` | What it is | Lives in |
|-------------|-----------|----------|
| `overview` | Product identity, purpose, users, non-goals | `/docs/overview/` |
| `architecture` | Implementation structure description | `/docs/core/` |
| `reference` | Cross-cutting reference (SDK docs, glossary, conventions) | `/docs/nsdks/`, `/docs/reference/` |
| `index` | Folder table of contents | Any `INDEX.md` |
| `story` | Dated engineering narrative | `/docs/stories/` |

## Status Values

| Status | Meaning |
|--------|---------|
| `active` | Current, authoritative |
| `draft` | Work in progress, not yet authoritative |
| `deprecated` | No longer current, kept for history |
| `archived` | Historical record only — moved to archive |

## Link Types

| Link type | Meaning |
|-----------|---------|
| `depends_on` | Read that first to understand this |
| `documents` | This doc describes that code/service |
| `implemented_by` | Where this behavior lives in code |
| `supersedes` | Replaces a stale document |
| `relates_to` | Adjacent topic |
| `part_of` | Belongs to a larger index |

## Tags

Tags used across Botoraptor docs:

- **Domain:** `server`, `web-ui`, `sdk`, `nsdk`
- **Language:** `typescript`, `python`, `go`, `php`
- **Quality:** `security`, `performance`
- **Status:** `legacy`, `meta`
