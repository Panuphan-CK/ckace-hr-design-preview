const root = process.cwd().replaceAll("\\", "/");

module.exports = {
  resolve: {
    alias: {
      "@ckace/auth": root + "/packages/auth/src/index.ts",
      "@ckace/contracts": root + "/packages/contracts/src/index.ts",
      "@ckace/business-rules":
        root + "/packages/business-rules/src/index.ts",
      "@ckace/database": root + "/packages/database/src/index.ts",
      "@ckace/migration": root + "/packages/migration/src/index.ts",
      "@ckace/storage": root + "/packages/storage/src/index.ts",
      "@ckace/validation": root + "/packages/validation/src/index.ts",
    },
  },
  test: {
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/coverage/**",
    ],
  },
};
