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

```bash
# Linting and formatting
npm run lint          # Lint code using cod-scripts (ESLint)
npm run format        # Format code using cod-scripts (Prettier)
npm run lint:commit   # Lint commit messages (commitlint)

# Testing
npm test              # Run tests using cod-scripts

# Docker operations (for local testing)
docker build -t semantic-release-action .
docker run --rm semantic-release-action

# Node.js version management
# Use Node.js v22.18.0 (specified in .nvmrc)
```

See [.cursor/rules/02-development-commands.mdc](.cursor/rules/02-development-commands.mdc) for more
information on development commands.

## Architecture

See [.cursor/rules/03-architecture.mdc](.cursor/rules/03-architecture.mdc) for more information on
architecture overview.

### Core Components

- **entrypoint.js** (197 lines): Main application logic that orchestrates the semantic-release
  process

  - `parseInput()`: Handles JSON5 parsing of GitHub Action inputs
  - `installPackages()`: Dynamically installs additional semantic-release plugins
  - `setGitConfigSafeDirectory()`: Configures git for GitHub Actions environment
  - `run()`: Main execution function

- **action.yml**: GitHub Action metadata defining 9 input parameters and 11 outputs
- **Dockerfile**: Node.js v22.18.0-slim container with minimal dependencies

### Key Features

- **Input Processing**: Uses JSON5 to parse complex inputs (arrays, objects) from GitHub Actions
- **Dynamic Plugin Installation**: Installs additional semantic-release plugins via
  `additional-packages` input
- **Dual Output System**: Sets both GitHub Action outputs and environment variables
- **Multi-platform Support**: Docker images built for AMD64 and ARM64

## Development Workflow

### Code Quality

- Uses `cod-scripts` for linting, formatting, and testing
- Follows conventional commits (enforced by commitlint)
- Husky pre-commit hooks ensure code quality

See [.cursor/rules/05-quality-and-commits.mdc](.cursor/rules/05-quality-and-commits.mdc) for more
information on code quality and conventions.

### CI/CD Pipelines

- **Release workflow** (.github/workflows/release.yml): Dogfoods the action itself, builds
  multi-platform Docker images
- **Validation workflow** (.github/workflows/validate.yml): Runs on PRs, performs dry-run testing

See [.cursor/rules/07-ci-cd.mdc](.cursor/rules/07-ci-cd.mdc) for more information on CI/CD
pipelines.

### Key Inputs (all optional)

- `branches`: Semantic-release branch configuration (JSON5 array/string/object)
- `plugins`: Plugin list for semantic-release execution
- `additional-packages`: Dynamic plugin installation (JSON5 array/string)
- `dry-run`: Preview mode without actual release
- `working-directory`: Working directory for semantic-release

See [.cursor/rules/04-inputs-outputs.mdc](.cursor/rules/04-inputs-outputs.mdc) for more information
on inputs and outputs.

### Outputs Available

Both as Action outputs and environment variables:

- Version components: `release-version`, `release-major`, `release-minor`, `release-patch`
- Release metadata: `new-release-published`, `release-notes`, `type`, `channel`
- Git information: `git-head`, `git-tag`, `name`

## Testing Strategy

- Minimal unit tests in `entrypoint.spec.js`
- Extensive integration testing via dogfooding in CI workflows
- Dry-run mode testing with various configurations in validation workflow

See [.cursor/rules/06-testing-strategy.mdc](.cursor/rules/06-testing-strategy.mdc) for more
information on testing strategy.

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

### Dynamic Package Installation

Packages specified in `additional-packages` are installed at runtime:

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

See [.cursor/rules/09-dynamic-installation.mdc](.cursor/rules/09-dynamic-installation.mdc) for more
information on dynamic installation.

## Important Notes

- Uses ES modules (`"type": "module"` in package.json)
- Follows semantic-release configuration precedence: Action inputs > Config files > Defaults
- Requires `GITHUB_TOKEN` environment variable for GitHub releases
- Container runs as single process: `node /action/entrypoint.js`

See [.cursor/rules/10-important-notes.mdc](.cursor/rules/10-important-notes.mdc) for more
information on important notes.
