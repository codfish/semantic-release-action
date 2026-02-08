# v5.0.0 Release Notes Draft

## Breaking Changes

Upgraded to semantic-release v25 with breaking changes in the GitHub plugin.
Any breaking changes from v25 apply to this github action version except for
Node version requirements. Because this is a docker-based github action, the
version of node in use is defined inside of the docker image, not by the
consuming runner or your code.

### What Changed

- **@semantic-release/github v12**: The GitHub plugin no longer uses the GitHub
  Search API (`/search/issues` endpoint). It now uses GraphQL queries exclusively
  for issue retrieval. This architectural change may affect issue management in
  edge cases. See [github plugin v12 release notes](https://github.com/semantic-release/github/releases/tag/v12.0.0).

- **semantic-release v25**: Upgraded from v24.2.7 to v25.0.3
  - @semantic-release/npm upgraded to v13
  - @semantic-release/commit-analyzer and @semantic-release/release-notes-generator moved from beta to stable
  - Dependency updates (yargs v18, hosted-git-info v9)
  - See [semantic-release v25 release notes](https://github.com/semantic-release/semantic-release/releases/tag/v25.0.0)

- **npm OIDC Trusted Publishing Support**: The upgrade to @semantic-release/npm v13 enables
  support for npm's new OIDC-based trusted publishing. This allows publishing to npm without
  long-lived access tokens by using GitHub's OIDC token provider. This is more secure and
  eliminates the need to store `NPM_TOKEN` as a repository secret when publishing from GitHub
  Actions. See [npm documentation](https://docs.npmjs.com/generating-provenance-statements)
  for configuration details.

- **Node.js**: Upgraded to v24.13.0 (bundled in Docker, not a breaking change for users)
- **@actions/core**: Upgraded to v3.0.0 (internal implementation only)

### Migration Steps

1. Test in a separate branch first - the GitHub plugin's architectural change
   could affect issue management behavior
2. Review [semantic-release v25 changes](https://github.com/semantic-release/semantic-release/releases/tag/v25.0.0)
3. Review [@semantic-release/github v12 changes](https://github.com/semantic-release/github/releases/tag/v12.0.0)
4. Update your workflows to use `@v5`
5. **(Optional)** Migrate to npm OIDC Trusted Publishing:
   - Configure your package on [npmjs.com](https://www.npmjs.com/) to enable trusted publishing from GitHub Actions
   - Add `id-token: write` permission to your workflow job
   - Remove the `NPM_TOKEN` secret (you won't need it anymore!)
   - See [npm's trusted publishing guide](https://docs.npmjs.com/generating-provenance-statements)

## Version History

- `v5` uses semantic-release v25 & node v24.13.0
- `v4` uses semantic-release v24 & node v22.18.0
- `v3` uses semantic-release v22 & node v20.9
- `v2` uses semantic-release v20 & node v18.7

## Full Changelog

**Compare**: https://github.com/codfish/semantic-release-action/compare/v4.0.1...v5.0.0

### Features

* upgrade to semantic-release v25, @actions/core v3, Node v24.13.0, and update dev tooling

### Dependencies

- semantic-release: v24.2.7 → v25.0.3
- @semantic-release/github: v11 → v12
- @semantic-release/npm: v12 → v13
- @actions/core: v1.11.1 → v3.0.0
- Node.js: v22.18.0 → v24.13.0
- Dev tooling: Migrated from cod-scripts to eslint + vitest

---

## Improvements

- **npm OIDC Trusted Publishing**: With @semantic-release/npm v13, you can now use npm's OIDC-based
  trusted publishing instead of long-lived `NPM_TOKEN` secrets. This provides better security by
  using GitHub's OIDC token provider to authenticate npm publishes directly from GitHub Actions.
  No more storing sensitive npm tokens in repository secrets!

- **Automated major version tag updates**: The release workflow now automatically updates the major version tag (v5) to point to the latest release. Users binding to `@v5` will automatically receive the latest stable v5.x.x release.

---

**Note**: This release follows the same versioning strategy as v4.0.0: breaking changes from semantic-release and its plugins (except Node version requirements) apply to this action. The GitHub Search API removal in @semantic-release/github v12 is a real architectural breaking change that justifies the v5.0.0 major version bump.
