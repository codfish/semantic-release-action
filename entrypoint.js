const core = require('@actions/core');
const semanticRelease = require('semantic-release');
const JSON5 = require('json5');

const parseInput = input => {
  try {
    return JSON5.parse(input);
  } catch (err) {
    return input;
  }
};

/**
 * Run semantic-release.
 *
 * @see https://github.com/semantic-release/semantic-release/blob/master/docs/developer-guide/js-api.md
 * @see https://github.com/semantic-release/semantic-release/blob/master/docs/usage/configuration.md#options
 */
async function run() {
  const branch = parseInput(core.getInput('branch', { required: false }));
  const branches = parseInput(core.getInput('branches', { required: false }));
  const plugins = parseInput(core.getInput('plugins', { required: false }));
  const extendsInput = parseInput(core.getInput('extends', { required: false }));
  let dryRun = core.getInput('dry_run', { required: false });
  dryRun = dryRun !== '' ? dryRun === 'true' : '';
  const repositoryUrl = core.getInput('repository_url', { required: false });
  const tagFormat = core.getInput('tag_format', { required: false });

  core.debug(`branch input: ${branch}`);
  core.debug(`branches input: ${branches}`);
  core.debug(`plugins input: ${plugins}`);
  core.debug(`extends input: ${extendsInput}`);
  core.debug(`dry_run input: ${dryRun}`);
  core.debug(`repository_url input: ${repositoryUrl}`);
  core.debug(`tag_format input: ${tagFormat}`);

  // build options object
  const branchOption = branch ? { branches: branch } : { branches };
  const options = {
    ...branchOption,
    plugins,
    extends: extendsInput,
    dryRun,
    repositoryUrl,
    tagFormat,
  };

  core.debug(`options before cleanup: ${JSON.stringify(options)}`);

  // remove falsey options
  Object.keys(options).forEach(
    key => (options[key] === undefined || options[key] === '') && delete options[key],
  );

  core.debug(`options after cleanup: ${JSON.stringify(options)}`);

  const result = await semanticRelease(options);
  if (!result) {
    core.debug('No release published');

    // set outputs
    core.exportVariable('NEW_RELEASE_PUBLISHED', 'false');
    core.setOutput('new-release-published', 'false');
    return;
  }

  const { lastRelease, nextRelease, commits } = result;

  core.debug(
    `Published ${nextRelease.type} release version ${nextRelease.version} containing ${commits.length} commits.`,
  );

  if (lastRelease.version) {
    core.debug(`The last release was "${lastRelease.version}".`);
  }

  // set outputs
  const { version, notes } = nextRelease;
  const [major, minor, patch] = version.split('.');
  core.exportVariable('NEW_RELEASE_PUBLISHED', 'true');
  core.exportVariable('RELEASE_VERSION', version);
  core.exportVariable('RELEASE_MAJOR', major);
  core.exportVariable('RELEASE_MINOR', minor);
  core.exportVariable('RELEASE_PATCH', patch);
  core.exportVariable('RELEASE_NOTES', notes);
  core.setOutput('new-release-published', 'true');
  core.setOutput('release-version', version);
  core.setOutput('release-major', major);
  core.setOutput('release-minor', minor);
  core.setOutput('release-patch', patch);
  core.setOutput('release-notes', notes);
}

run().catch(core.setFailed);
