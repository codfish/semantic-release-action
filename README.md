# semantic-release-action

> GitHub Action for running `semantic-release`. Respects any semantic-release configuration file in
> your repo or the `release` prop in your `package.json`. Exports [environment variables](#outputs)
> for you to use in subsequent actions containing version numbers.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Usage](#usage)
  - [Basic Usage](#basic-usage)
- [Why](#why)
- [Configuration](#configuration)
  - [Example with all inputs](#example-with-all-inputs)
  - [Outputs](#outputs)
- [Maintenance](#maintenance)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Usage

See [action.yml](action.yml).

Referencing the major version is
([recommended by GitHub](https://github.com/actions/toolkit/blob/main/docs/action-versioning.md)).

```yml
steps:
  # Reference a docker image from GitHub Container Registry (recommended for speed & security)
  - uses: docker://ghcr.io/codfish/semantic-release-action@sha256:4675eae74abbabc869298ca798833fef291ce30fb9edfac76787746e7d9d3904
  # Reference the major version of a release
  - uses: codfish/semantic-release-action@v2
  # Reference a specific commit
  - uses: codfish/semantic-release-action@4e0079a1e7511dab622628e1bf298e572a9f3d22
  # Reference a minor version of a release
  - uses: codfish/semantic-release-action@v1.10
  # Reference a branch
  - uses: codfish/semantic-release-action@main
```

> **Note**: Whenever you use a custom docker-based GitHub Action like this one, you may notice in
> your run logs, one of the first steps you'll see will be GA building the image for you. You can
> speed up runs by pulling pre-built docker images instead of making GitHub Actions build them on
> every run.

```yml
steps:
  # Reference a docker image from GitHub Container Registry
  - uses: docker://ghcr.io/codfish/semantic-release-action:v2
  # Reference a docker image from Dockerhub
  - uses: docker://codfish/semantic-release-action:v2
```

**If you're security conscious**, you can
[pin the docker image down to a specific digest](https://francoisbest.com/posts/2020/the-security-of-github-actions#docker-based-actions)
instead of using an image tag, which is a mutable reference.

```yml
steps:
  # Reference a docker image from GitHub Container Registry (example for v2.0.0)
  - uses: docker://ghcr.io/codfish/semantic-release-action@<digest>
```

Where `<digest>` is any
[docker image digest you want here](https://github.com/users/codfish/packages/container/package/semantic-release-action).
If you prefer pulling from
[Docker Hub, check here](https://hub.docker.com/repository/docker/codfish/semantic-release-action/tags).

### Basic Usage

> **Note**: Until
> [this semantic-release pr](https://github.com/semantic-release/semantic-release/pull/1737) gets
> merged, `main` is not a supported branch by default. If your repository is using `main` as the
> default branch which is extremely common, you need to pass the branches input into the action, or
> define it in your semantic-release config explicitly. See:
> https://github.com/semantic-release/semantic-release/pull/1737

```yml
steps:
  - uses: actions/checkout@v3

  - uses: codfish/semantic-release-action@v2
    with:
      # specify default branches to add support for the `main` branch
      # which semantic-release doesn't have as a default yet.
      branches: |
        [
          '+([0-9])?(.{+([0-9]),x}).x',
          'main',
          'next',
          'next-major',
          {
            name: 'beta',
            prerelease: true
          },
          {
            name: 'alpha',
            prerelease: true
          }
        ]
    env:
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

**Using output variables set by `semantic-release-action`:**

```yml
steps:
  - uses: actions/checkout@v3

  # you'll need to add an `id` in order to access output variables
  - uses: codfish/semantic-release-action@v2
    id: semantic
    env:
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      NPM_TOKEN: ${{ secrets.NPM_TOKEN }}

  - run: echo ${{ steps.semantic.outputs.release-version }}

  - run: echo "$OUTPUTS"
    env:
      OUTPUTS: ${{ toJson(steps.semantic.outputs) }}

  - uses: codfish/some-other-action@v1
    with:
      release-version: ${{ steps.semantic.outputs.release-version }}
```

**Example:** Only run an action if a new version was created.

```yml
steps:
  - uses: actions/checkout@v3

  # you'll need to add an `id` in order to access output variables
  - uses: codfish/semantic-release-action@v2
    id: semantic
    env:
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      NPM_TOKEN: ${{ secrets.NPM_TOKEN }}

  - name: docker push version
    if: steps.semantic.outputs.new-release-published == 'true'
    run: |
      docker tag some-image some-image:$TAG
      docker push some-image:$TAG
    env:
      TAG: v$RELEASE_VERSION
```

**Using environment variables set by `semantic-release-action`:**

```yml
steps:
  - uses: actions/checkout@v3

  - uses: codfish/semantic-release-action@v2
    env:
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      NPM_TOKEN: ${{ secrets.NPM_TOKEN }}

  - run: |
      echo $RELEASE_VERSION
      echo $RELEASE_MAJOR
      echo $RELEASE_MINOR
      echo $RELEASE_PATCH
```

If you're _not_ publishing to npm and only want to use this action for GitHub releases, the easiest
approach would simply be to add `"private": true,` to your `package.json`.

## Why

It's fairly easy to run `semantic-release` as a "host action," aka something that runs directly on
the VM.

```yml
steps:
  - run: npx semantic-release
    env:
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

If you're just publishing a node package, then this could still work well for you. The problem I
found with this is when I was in projects where I had subsequent steps/actions in which I wanted to
know whether a new version was cut.

> **Use Case:** For instance, in an application where I'm using `semantic-release` to manage GitHub
> releases, but also building and pushing docker images. Dockerhub has a
> [nice GitHub integration](https://docs.docker.com/docker-hub/builds/) to handle this for us, but
> some other registries do not. If I need to cut a new release, then update a docker registry by
> adding a new tagged build, I'll want to run `semantic-release` and then build a docker image, tag
> it with a version and push it up. In my case I like to push up tags for `latest`, the semver (i.e.
> `v1.8.3`), and just the major the version (i.e. `v1`).

I want to know 1) if semantic-release cut a new version and 2) what the version is.

There's a number of ways to handle this, but the most elegant way I found to do it was to abstract
it into it's own custom action. It abstracts away whatever logic you need to figure out what that
new release number is.

This also scales well, just in case I want to add some flexibility and functionality to this action,
I can easily leverage it across any project.

## Configuration

You can pass in `semantic-release` configuration options via GitHub Action inputs using `with`.

It's important to note, **NONE** of these inputs are required. Semantic release has a default
configuration that it will use if you don't provide any.

Also of note, if you'd like to override the default configuration and you'd rather not use the
inputs here, the action will automatically use any
[`semantic-release` configuration](https://github.com/semantic-release/semantic-release/blob/master/docs/usage/configuration.md#configuration-file)
defined in your repo (`.releaserc`, `release.config.js`, `release` prop in `package.json`)

> **Note**: Each input **will take precedence** over options configured in the configuration file
> and shareable configurations.

| Input Variable      | Type                        | Description                                                                                                                                                                                                                                                     |
| ------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| branches            | `Array`, `String`, `Object` | The branches on which releases should happen.                                                                                                                                                                                                                   |
| plugins             | `Array`                     | Define the list of plugins to use. Plugins will run in series, in the order defined, for each steps if they implement it                                                                                                                                        |
| extends             | `Array`, `String`           | List of modules or file paths containing a shareable configuration.                                                                                                                                                                                             |
| additional_packages | `Array`, `String`           | Define a list of additional plugins/configurations (official or community) to install. Use this if you 1) use any plugins other than the defaults, which are already installed along with semantic-release or 2) want to extend from a shareable configuration. |
| dry_run             | `Boolean`                   | The objective of the dry-run mode is to get a preview of the pending release. Dry-run mode skips the following steps: prepare, publish, success and fail.                                                                                                       |
| repository_url      | `String`                    | The git repository URL                                                                                                                                                                                                                                          |
| tag_format          | `String`                    | The Git tag format used by semantic-release to identify releases.                                                                                                                                                                                               |

> **Note**: Any package specified in `extends` or `additional_packages` will be installed
> automatically for you as a convenience, allowing you to use this action without adding new
> dependencies to your application or install deps in a separate action step.

> **Note**: `additional_packages` won't get used automatically, setting this variable will just
> install them so you can use them. You'll need to actually list them in your `plugins` and/or
> `extends` configuration for **semantic-release** to use them.

> **Note**: The `branch` input is **DEPRECATED**. Will continue to be supported for v1. Use
> `branches` instead. Previously used in semantic-release v15 to set a single branch on which
> releases should happen.

- **GitHub Actions Inputs:**
  https://help.github.com/en/articles/metadata-syntax-for-github-actions#inputs
- **Semantic Release Configuration:**
  https://github.com/semantic-release/semantic-release/blob/master/docs/usage/configuration.md

### Example with all inputs

```yml
steps:
  - run: codfish/semantic-release-action@v2
    with:
      dry_run: true
      branches: |
        [
          '+([0-9])?(.{+([0-9]),x}).x',
          'main',
          'next',
          'next-major',
          {
            name: 'beta',
            prerelease: true
          },
          {
            name: 'alpha',
            prerelease: true
          }
        ]
      repository_url: https://github.com/codfish/semantic-release-action.git
      tag_format: 'v${version}'
      extends: '@semantic-release/apm-config'
      additional_packages: |
        ['@semantic-release/apm@4.0.0', '@semantic-release/git']
      plugins: |
        ['@semantic-release/commit-analyzer', '@semantic-release/release-notes-generator', '@semantic-release/github', '@semantic-release/apm', '@semantic-release/git']
    env:
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Outputs

`semantic-release-action` sets both output variables and environment variables because why not?
Allows users the ability to use whichever they want. I don't know or understand every use case there
might be so this is a way to cover more cases.

**Docs:** https://help.github.com/en/articles/metadata-syntax-for-github-actions#outputs

#### Output Variables

| Output Variable       | Description                                                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| new-release-published | Either `'true'` when a new release was published or `'false'` when no release was published. Allows other actions to run or not-run based on this |
| release-version       | The new releases' semantic version, i.e. `1.8.3`                                                                                                  |
| release-major         | The new releases' major version number, i.e. `1`                                                                                                  |
| release-minor         | The new releases' minor version number, i.e. `8`                                                                                                  |
| release-patch         | The new releases' patch version number, i.e. `3`                                                                                                  |
| release-notes         | The release notes of the next release.                                                                                                            |
| type                  | The semver export type of the release, e.g. `major`, `prerelease`, etc.                                                                           |
| channel               | The release channel of the release.                                                                                                               |
| git-head              | The git hash of the release.                                                                                                                      |
| git-tag               | The version with v prefix.                                                                                                                        |
| name                  | The release name.                                                                                                                                 |

#### Environment Variables

| Environment Variable  | Description                                                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| NEW_RELEASE_PUBLISHED | Either `'true'` when a new release was published or `'false'` when no release was published. Allows other actions to run or not-run based on this |
| RELEASE_VERSION       | The new releases' semantic version, i.e. `1.8.3`                                                                                                  |
| RELEASE_MAJOR         | The new releases' major version number, i.e. `1`                                                                                                  |
| RELEASE_MINOR         | The new releases' minor version number, i.e. `8`                                                                                                  |
| RELEASE_PATCH         | The new releases' patch version number, i.e. `3`                                                                                                  |
| RELEASE_NOTES         | The release notes of the next release in markdown.                                                                                                |
| RELEASE_TYPE          | The semver export type of the release, e.g. `major`, `prerelease`, etc.                                                                           |
| RELEASE_CHANNEL       | The release channel of the release.                                                                                                               |
| RELEASE_GIT_HEAD      | The git hash of the release.                                                                                                                      |
| RELEASE_GIT_TAG       | The version with v prefix.                                                                                                                        |
| RELEASE_NAME          | The release name.                                                                                                                                 |

## Maintenance

> Make the new release available to those binding to the major version tag: Move the major version
> tag (v1, v2, etc.) to point to the ref of the current release. This will act as the stable release
> for that major version. You should keep this tag updated to the most recent stable minor/patch
> release.

```sh
git tag -fa v2 -m "Update v2 tag" && git push origin v2 --force
```

**Reference**:
https://github.com/actions/toolkit/blob/main/docs/action-versioning.md#recommendations
