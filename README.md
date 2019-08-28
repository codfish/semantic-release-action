# semantic-release-action

> GitHub Action for running `semantic-release`. Respects any .releaserc.js configuration file in
> your repo. Exports [environment variables](#outputs) for you to use in subsequent actions
> containing version numbers.

## Why

It would have been fairly easy to run this as a "host action," aka something that simply runs
directly on the VM.

```yml
steps:
  - name: Semantic Release
    run: npx semantic-release
    env:
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

If you're just publishing an node package, then this could still work well for you. The problem I
found with this is when I was in projects where I had subsequent steps/actions in which I wanted to
know whether a new version was cut.

> **Use Case:** For instance, in an application where I'm using `semantic-release` to manage GitHub
> releases, but also building and pushing docker images. Dockerhub has a
> [nice GitHub integration](https://docs.docker.com/docker-hub/builds/) to handle this for us, but
> some other registries do not. If I need to cut a new release, then update a docker registry by
> adding a new tagged build, I'll want to run `semantic-release` and then build a docker image, tag
> it with a version and push it up. In my case I like to push up tags for `latest`, the semver (i.e.
> `1.8.3`), and just the major the version (i.e. `1`).

I want to know 1) if semantic-release cut a new version and 2) what the version is.

There's a number of ways to handle this, but the most elegant way I found to do it was to abstract
it into it's own custom action. It abstracts away whatever logic you need to figure out what that
new release number is.

This also scales well, just in case I want to add some flexibility and functionality to this action,
I can easily leverage it across any project.

## Usage

```yml
jobs:
  release:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@master

      - uses: codfish/actions/semantic-release@master
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

If you're not publishing to npm and only want to use this action for GitHub releases, you'd only
need to provide a `GITHUB_TOKEN` env var. You'll also need to include a `.releaserc.js` file in your
repo, instructing `semantic-release` to not look to publish to `npm`.

**Example:**

```js
module.exports = {
  branch: 'master',
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    ['@semantic-release/npm', { npmPublish: false }],
    '@semantic-release/github',
  ],
};
```

### Inputs

None. Might be a good idea to accept optional configuration values via inputs that would merge, yet
override any `.releaserc.js` config file values.

### Outputs

**Environment Variables**:

- `SEMANTIC_RELEASE`: Either `'true'` or `'false'`. This allows other actions to run or not-run
  based on this.
- `SEMANTIC_RELEASE_VERSION`: The new release's semantic version, i.e. `1.8.3`.
- `SEMANTIC_RELEASE_MAJOR`: The new release's major version number, i.e. `1`.
- `SEMANTIC_RELEASE_MINOR`: The new release's minor version number, i.e. `8`.
- `SEMANTIC_RELEASE_PATCH`: The new release's patch version number, i.e. `3`.
