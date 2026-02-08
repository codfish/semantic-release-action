# AGENT.md

This file provides guidance to AI agents when working with code in this repository.

## Project Overview

This is a Docker-based GitHub Action that wraps `semantic-release` to provide automated semantic
versioning and releasing. The action exports version information as both GitHub Action outputs and
environment variables for use in subsequent workflow steps.

- Prefer solutions that keep the action minimal and reliable inside a Docker container.
- Maintain compatibility with both AMD64 and ARM64 where relevant.
- Ensure changes preserve the dual output system (GitHub outputs and environment variables).
- Keep the entry point a single process: `node /action/entrypoint.js`.

## Development Commands

Use these commands for local development and validation:

```bash
# Linting and formatting
npm run lint          # Lint code using ESLint
npm run format        # Format code using Prettier

# Testing
npm test              # Run tests using Vitest

# Docker operations (for local testing)
docker build -t semantic-release-action .
docker run --rm semantic-release-action

# Node.js version management
# Use Node.js v24.13.0 (specified in .nvmrc)
```

## Architecture

### Core Components

- **entrypoint.js** (197 lines): Main application logic that orchestrates the semantic-release
  process

  - `parseInput()`: Handles JSON5 parsing of GitHub Action inputs
  - `installPackages()`: Dynamically installs additional semantic-release plugins
  - `setGitConfigSafeDirectory()`: Configures git for GitHub Actions environment
  - `run()`: Main execution function

- **action.yml**: GitHub Action metadata defining 9 input parameters and 11 outputs
- **Dockerfile**: Node.js v24.13.0-slim container with minimal dependencies

### Key Features to Preserve

- **Input Processing**: Uses JSON5 to parse complex inputs (arrays, objects) from GitHub Actions
- **Dynamic Plugin Installation**: Installs additional semantic-release plugins via
  `additional-packages` input
- **Dual Output System**: Sets both GitHub Action outputs and environment variables
- **Multi-platform Support**: Docker images built for AMD64 and ARM64

## Inputs & Outputs

### Inputs (all optional)

- `branches`: Semantic-release branch configuration (JSON5 array/string/object)
- `plugins`: Plugin list for semantic-release execution
- `additional-packages`: Extra packages/plugins to install at runtime (JSON5 array/string)
- `dry-run`: Preview mode without actual release
- `working-directory`: Working directory for semantic-release
- `repository-url`: The git repository URL
- `tag-format`: The Git tag format used by semantic-release to identify releases
- `extends`: List of modules or file paths containing a shareable configuration

### Outputs Available

Both as Action outputs and environment variables:

- Version components: `release-version`, `release-major`, `release-minor`, `release-patch`
- Release metadata: `new-release-published`, `release-notes`, `type`, `channel`
- Git information: `git-head`, `git-tag`, `name`

**Guidance**: When modifying behavior, ensure both GitHub Action outputs and environment variables
remain accurate and in sync.

## Development Workflow

### Code Quality

- Uses ESLint for linting, Prettier for formatting, and Vitest for testing
- Follows Conventional Commits (enforced by commitlint)
- Husky pre-commit hooks ensure code quality

**Guidance**: Keep changes minimal, readable, and aligned with existing style. Avoid introducing
unnecessary dependencies.

### CI/CD Pipelines

- **Release workflow** (`.github/workflows/release.yml`): Dogfoods the action itself, builds
  multi-platform Docker images
- **Validation workflow** (`.github/workflows/validate.yml`): Runs on PRs, performs dry-run testing

**Guidance**:

- Ensure changes remain compatible with both AMD64 and ARM64 build matrix
- Keep validation fast and reliable; prefer dry-run checks over full releases in PRs

## Testing Strategy

- Minimal unit tests in `entrypoint.spec.js`
- Extensive integration testing via dogfooding in CI workflows
- Dry-run mode testing with various configurations in validation workflow

## Dynamic Package Installation

Packages specified in the `additional-packages` input are installed at runtime with `npm` using
flags that avoid modifying lockfiles or running audits.

```javascript
const spawn = childProcess.spawnSync('npm', [
  'install',
  '--no-save',
  '--no-audit',
  '--no-fund',
  '--force',
  ...packages,
]);
```

**Flag Explanations**:

- `--no-save`: Prevents writing to `package.json` or `package-lock.json`
- `--no-audit`: Skips security audit (faster installs)
- `--no-fund`: Suppresses funding messages
- `--force`: Forces installation even if there are conflicts

**Guidance**:

- Keep the install minimal and non-persistent; do not write to `package.json` or
  `package-lock.json`
- Prefer deterministic installs and avoid adding global state

## Common Patterns

### JSON5 Input Parsing

The action uses JSON5 to handle complex GitHub Action inputs that need to be arrays or objects:

```javascript
const parseInput = (input, defaultValue = '') => {
  try {
    return JSON5.parse(input);
  } catch (err) {
    return defaultValue || input;
  }
};
```

## Important Notes & Constraints

- **Uses ES modules** (`"type": "module"` in `package.json`)
- **Configuration precedence**: Action inputs > Config files > Defaults
- **Requires `GITHUB_TOKEN`** environment variable for GitHub releases
- **Container runs as single process**: `node /action/entrypoint.js`
- **Target Node.js version**: v24.13.0 (per `.nvmrc`)

**Guidance**:

- Maintain ESM imports/exports; avoid CommonJS regressions
- Do not break precedence or dual-output guarantees when changing configuration handling
