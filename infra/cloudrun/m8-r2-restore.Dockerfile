FROM asia-southeast1-docker.pkg.dev/ckrr-leave-system-2026/cloud-run-source-deploy/ckace-hr-api-release@sha256:bef4064b47a4a1dfc6437522248243a60805299582b70e18087891e4c0aaee2b
WORKDIR /app
COPY infra/production/m8-r2-restore-rehearsal.mjs ./infra/production/m8-r2-restore-rehearsal.mjs
CMD ["node", "infra/production/m8-r2-restore-rehearsal.mjs"]
