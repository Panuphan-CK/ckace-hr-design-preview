# CKACE HR — M8.8 Final Go / No-Go Evidence Package

Date: 2026-10-06 Asia/Bangkok

## Executive Decision

**M8 Production Preparation / Rehearsal: PASS / READY TO CLOSE.**

**M9 DEV/TEST engineering: GO.**

**Production provisioning: HOLD — requires a separate explicit Owner approval.**

**Production module authority switch / source-of-truth cutover: NO-GO today.**

This is not a contradiction. M8 successfully proved the preparation, rollback, recovery and backend UAT contracts needed to enter M9. M9 still has implementation work that must be completed before any Production authority can move away from Legacy.

## What M8 proved

- Production topology and isolation requirements were inventoried.
- Production runtime config fails closed and requires dedicated Production DB/R2 resources.
- All five Prisma migrations were rehearsed and database snapshot/recovery equality was proven.
- Immutable M8.4 API/Web image digests were built and registry-verified.
- API/Web Cloud Run rollback was rehearsed on isolated TEST services.
- Database recovery and R2 copy/mutate/restore recovery were proven in non-Production.
- Seven observability/abort contracts were defined.
- DNS / LINE / GAS / source-of-truth sequencing and rollback boundaries were written.
- Production-like backend/API UAT passed across the HR modules.
- Canonical TEST remained unchanged and Project B M8 performed no Production cutover mutation.

## Current live legacy Production baseline

Refreshed at M8.8:

- service: `ckrr-line-gateway`;
- live revision: `ckrr-line-gateway-ownerui-20261006a`;
- traffic: 100%;
- image digest: `sha256:272fc4db43213b50b90387477d7f0e864f8c2d9cd0a4354c2b1608effea87d7f`;
- immediate rollback: `ckrr-line-gateway-readretry-20261006a`;
- GAS: v38;
- historical GAS rollback: v37;
- Production LIFF ID remains `2011403971-rHQJIrOx`;
- source of truth remains Legacy GAS / Sheets / Drive.

Project A records transient read-only 502/timeouts on secondary APIs after the owner-ui deploy. This does not block M9 DEV/TEST engineering, but a fresh quiet-window health/log readback is mandatory immediately before any future Production cutover.

## Project B Production state

Live readback still shows:

- no `ckace-hr-api-prod`;
- no `ckace-hr-web-prod`;
- `hr.ckaceaccount.com` = NXDOMAIN.

The readiness contract also still marks the dedicated Production Neon database, private Production R2 bucket and Production Firebase site as not provisioned. Production alert policies and independent R2 backup are not provisioned.

This is expected at M8 close. It is why the Production decision remains NO-GO.

## Release authority and source drift

M8.4 immutable release authority remains:

- API digest: `sha256:bef4064b47a4a1dfc6437522248243a60805299582b70e18087891e4c0aaee2b`;
- Web digest: `sha256:aced93f23bc778bb33ff7c825b36763e450312c5ad143c7cd0ba19e184a1da49`;
- frozen M8.4 source fingerprint: `e7c189bc9a60030cc69167a090ccfafc8e190316d452cb2103fb582bfd5cb619`.

Current source-tree fingerprint is:

`c76bbeb56f77c21ea434ae4601c5a179ca4e2b148b209af980d01591decf7b2f`

with the same 208 artifact-input files.

The mismatch is intentionally preserved. Post-release UAT harness/test work occurred after M8.4. M8.8 must not rewrite the historical M8.4 fingerprint.

The M8.4 immutable images remain the evidence authority for the M8.7 rehearsal. Once M9 changes runtime code, a fresh immutable release candidate and provenance manifest are mandatory before any Production deploy.

## Web / LIFF scope

By Owner decision, functional Project B Web/LIFF HR UI is a later dedicated project.

For M8.7/M8.8:

- Web root reachability — PASS;
- `/liff` foundation reachability — PASS;
- functional HR UI/mobile journeys — deferred;
- deferred UI is not an M8 blocker;
- do not claim functional Web/LIFF UI has been UAT-tested.

## Why Production cutover is NO-GO today

The following remain blocking before the first Production authority switch:

1. server-side per-module routing plane;
2. complete routing coverage for every M7 Production surface;
3. bounded per-module write-freeze control;
4. dedicated Production landing zone;
5. Production alert policies;
6. Production DB backup/recovery proof;
7. independent Production R2 backup proof;
8. a fresh immutable release candidate after M9 runtime changes;
9. refreshed live legacy baseline at the execution window;
10. named-module reconciliation PASS;
11. explicit Owner approval for that exact Production module switch.

## M9 entry decision

### GO — M9 engineering in DEV/TEST

The next bounded workstream is:

**M9.1 — Server-side Module Routing + Write-Freeze Foundation**

Required work:

- expand the routing contract to every M7 surface;
- implement server-only routing authority resolution;
- never accept client-provided role/employee/routing authority;
- implement bounded module write-freeze;
- fail closed on missing/unknown routes;
- preserve `LEGACY` as the safe default;
- test paired READ+WRITE authority switching;
- test post-write rollback/reconciliation boundaries;
- keep all work DEV/TEST until a later explicit Owner Production gate.

### NO-GO — Production authority switch

M8.8 does not authorize:

- Production resource creation;
- Production data migration/import/write;
- Production Cloud Run/Firebase deployment;
- DNS/custom-domain change;
- LINE/LIFF/Rich Menu change;
- GAS/source-of-truth change;
- module routing from LEGACY to NEW;
- Production rollback mutation.

## Final M8 disposition

M8 is complete when this evidence package verifies successfully and repository QA remains PASS.

The next phase may begin as engineering work, but no Production authority changes are implied by closing M8.
