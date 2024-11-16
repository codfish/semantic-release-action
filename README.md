# semantic-release-action

GitHub Action for running `semantic-release`. Respects any semantic-release configuration file in
your repo or the `release` prop in your `package.json`. Exports [environment variables](#outputs)
for you to use in subsequent actions containing version numbers.

> **Note**: `v3` of this action uses semantic-release v22 & node v20.9. `v2` uses semantic-release
> v20 & node v18.7.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Usage](#usage)
  - [Which Version to Use](#which-version-to-use)
- [Why](#why)
- [Configuration](#configuration)
  - [Example with all inputs](#example-with-all-inputs)
  - [Outputs](#outputs)
- [Recipes](#recipes)
  - [Including all commit types in a release](#including-all-commit-types-in-a-release)
- [Maintenance](#maintenance)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

> [!IMPORTANT]
>
> Check the release notes for help
> [migrating to v3](https://github.com/codfish/semantic-release-action/releases/tag/v3.0.0).

## Usage

```yml
steps:
  - uses: actions/checkout@v3

  - uses: codfish/semantic-release-action@v3
    env:
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

**Using output variables set by `semantic-release-action`:**

```yml
steps:
  - uses: actions/checkout@v3

  # you'll need to add an `id` in order to access output variables
  - uses: codfish/semantic-release-action@v3
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
  - uses: codfish/semantic-release-action@v3
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

  - uses: codfish/semantic-release-action@v3
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

### Which Version to Use

See [action.yml](action.yml).

```yml
steps:
  # Recommended: Docker image digest from GitHub Container Registry (best for speed & security)
  - uses: docker://ghcr.io/codfish/semantic-release-action@sha256:4c0955361cf42e5ab9bb05df3a1e2a781c443f9760b63a68957689445051a2fb

  # Major version of a release
  - uses: codfish/semantic-release-action@v3

  # Minor version of a release
  - uses: codfish/semantic-release-action@v3.0.1

  # Specific commit
  - uses: codfish/semantic-release-action@ee5b4afec556c3bf8b9f0b9cd542aade9e486033

  # Git branch
  - uses: codfish/semantic-release-action@main
```

> [!NOTE]
>
> Whenever you use a custom docker-based GitHub Action like this one, you may notice in your run
> logs, one of the first steps you'll see will be GA building the image for you. You can speed up
> runs by pulling pre-built docker images instead of making GitHub Actions build them on every run.

```yml
steps:
  # GitHub Container Registry
  - uses: docker://ghcr.io/codfish/semantic-release-action:v3

  # Dockerhub
  - uses: docker://codfish/semantic-release-action:v3
```

> [!TIP]
>
> **If you're security conscious**, you can
> [pin the docker image down to a specific digest](https://francoisbest.com/posts/2020/the-security-of-github-actions#docker-based-actions)
> instead of using an image tag, which is a mutable reference.

```yml
steps:
  # Docker image digest from GitHub Container Registry
  - uses: docker://ghcr.io/codfish/semantic-release-action@sha256:4c0955361cf42e5ab9bb05df3a1e2a781c443f9760b63a68957689445051a2fb
```

Where `<digest>` is any
[docker image digest you want here](https://github.com/users/codfish/packages/container/package/semantic-release-action).

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

Also of note, if you'd like to override the default configuration, and you'd rather not use the
inputs here, the action will automatically use any
[`semantic-release` configuration](https://github.com/semantic-release/semantic-release/blob/master/docs/usage/configuration.md#configuration-file)
defined in your repo (`.releaserc`, `release.config.js`, `release` prop in `package.json`)

> [!NOTE]
>
> Each input **will take precedence** over options configured in the configuration file and
> shareable configurations.

| Input Variable        | Type                        | Description                                                                                                                                                                                                                                                     | Default                                                                                                                                       |
| --------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `branches`            | `Array`, `String`, `Object` | The branches on which releases should happen. Our default mimic's semantic-release's, with one major inclusion: the `main` branch.                                                                                                                              | `['+([0-9])?(.{+([0-9]),x}).x', 'master', 'main', 'next', 'next-major', {name: 'beta', prerelease: true}, {name: 'alpha', prerelease: true}]` |
| `plugins`             | `Array`                     | Define the list of plugins to use. Plugins will run in series, in the order defined, for each steps if they implement it                                                                                                                                        | [Semantic default](https://github.com/semantic-release/semantic-release/blob/master/docs/usage/configuration.md#plugins)                      |
| `extends`             | `Array`, `String`           | List of modules or file paths containing a shareable configuration.                                                                                                                                                                                             | [Semantic default](https://github.com/semantic-release/semantic-release/blob/master/docs/usage/configuration.md#extends)                      |
| `additional-packages` | `Array`, `String`           | Define a list of additional plugins/configurations (official or community) to install. Use this if you 1) use any plugins other than the defaults, which are already installed along with semantic-release or 2) want to extend from a shareable configuration. | `[]`                                                                                                                                          |
| `dry-run`             | `Boolean`                   | The objective of the dry-run mode is to get a preview of the pending release. Dry-run mode skips the following steps: prepare, publish, success and fail.                                                                                                       | [Semantic default](https://github.com/semantic-release/semantic-release/blob/master/docs/usage/configuration.md#dryrun)                       |
| `working-directory`   | `String`                    | The working directory to use for all semantic-release actions.                                                                                                                                                                                                  | `.`                                                                                                                                           |
| `repository-url`      | `String`                    | The git repository URL                                                                                                                                                                                                                                          | [Semantic default](https://github.com/semantic-release/semantic-release/blob/master/docs/usage/configuration.md#repositoryurl)                |
| `tag-format`          | `String`                    | The Git tag format used by semantic-release to identify releases.                                                                                                                                                                                               | [Semantic default](https://github.com/semantic-release/semantic-release/blob/master/docs/usage/configuration.md#tagformat)                    |

> [!NOTE]
>
> Any package specified in `extends` or `additional-packages` will be installed automatically for
> you as a convenience, allowing you to use this action without adding new dependencies to your
> application or install deps in a separate action step.

> [!NOTE]
>
> `additional-packages` won't get used automatically, setting this variable will just install them
> so you can use them. You'll need to actually list them in your `plugins` and/or `extends`
> configuration for **semantic-release** to use them.

> [!NOTE]
>
> The `branch` input is **DEPRECATED**. Will continue to be supported for v1. Use `branches`
> instead. Previously used in semantic-release v15 to set a single branch on which releases should
> happen.

- **GitHub Actions Inputs:**
  https://help.github.com/en/articles/metadata-syntax-for-github-actions#inputs
- **Semantic Release Configuration:**
  https://github.com/semantic-release/semantic-release/blob/master/docs/usage/configuration.md

### Example with all inputs

```yml
steps:
  - run: codfish/semantic-release-action@v3
    with:
      dry-run: true
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
      repository-url: https://github.com/codfish/semantic-release-action.git
      tag-format: 'v${version}'
      working-directory: dist
      extends: '@semantic-release/apm-config'
      additional-packages: |
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

## Recipes

### Including all commit types in a release

By default, `semantic-release` only includes `fix`, `feat`, and `perf` commit types in the release.
A lot of projects want to include all commit types in their release notes, while still using
`semantic-release`'s commit analyzer to only create releases for `fix`, `feat`, and `perf` commits.

```yml
- run: codfish/semantic-release-action@v3
  with:
    additional-packages: ['conventional-changelog-conventionalcommits@7']
    plugins: |
      [
        '@semantic-release/commit-analyzer',
        [
          "@semantic-release/release-notes-generator",
          {
            "preset": "conventionalcommits",
            "presetConfig": {
              "types": [
                { type: 'feat', section: 'Features', hidden: false },
                { type: 'fix', section: 'Bug Fixes', hidden: false },
                { type: 'perf', section: 'Performance Improvements', hidden: false },
                { type: 'revert', section: 'Reverts', hidden: false },
                { type: 'docs', section: 'Other Updates', hidden: false },
                { type: 'style', section: 'Other Updates', hidden: false },
                { type: 'chore', section: 'Other Updates', hidden: false },
                { type: 'refactor', section: 'Other Updates', hidden: false },
                { type: 'test', section: 'Other Updates', hidden: false },
                { type: 'build', section: 'Other Updates', hidden: false },
                { type: 'ci', section: 'Other Updates', hidden: false }
              ]
            }
          }
        ],
        '@semantic-release/npm',
        '@semantic-release/github'
      ]
```

This configuration uses the `conventional-changelog-conventionalcommits` package to generate release
notes & configures `@semantic-release/release-notes-generator` to include all commit types. Tweaking
the `types` array will allow you to include or exclude specific commit types & group them to your
liking.

> [!IMPORTANT]
>
> This example uses the `additional-packages` input to install the
> `conventional-changelog-conventionalcommits` package. This is necessary because `semantic-release`
> doesn't install it by default & it's required for the customization of the `presetConfig` in the
> `@semantic-release/release-notes-generator` plugin.

## Maintenance

> Make the new release available to those binding to the major version tag: Move the major version
> tag (v2, v3, etc.) to point to the ref of the current release. This will act as the stable release
> for that major version. You should keep this tag updated to the most recent stable minor/patch
> release.

```sh
git tag -fa v3 -m "Update v3 tag" && git push origin v3 --force
```

**Reference**:
https://github.com/actions/toolkit/blob/main/docs/action-versioning.md#recommendations
