import * as childProcess from 'child_process';
import core from '@actions/core';
import semanticRelease from 'semantic-release';
import JSON5 from 'json5';
import arrify from 'arrify';

const parseInput = (input) => {
  try {
    return JSON5.parse(input);
  } catch (err) {
    return input;
  }
};

/**
 * Install npm packages.
 *
 * @param {string|string[]} packages - List of packages to install.
 * @returns {object} - Response from `child_process.spawnSync()`.
 */
const installPackages = (packages) => {
  try {
    const packagesArr = arrify(packages);
    core.debug(`Installing additional packages: ${packagesArr}`);
    const spawn = childProcess.spawnSync('npm', ['install', '--no-save', ...packagesArr], {
      stdio: ['inherit', 'inherit', 'pipe'],
    });
    if (spawn.status !== 0) {
      throw new Error(spawn.stderr);
    }
    core.debug(`Packages installed.`);
    return spawn;
  } catch (err) {
    core.debug(`Error installing additional packages: ${packages}`);
    throw err;
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
  const additionalPackages =
    parseInput(core.getInput('additional_packages', { required: false })) || [];
  const extendsInput = parseInput(core.getInput('extends', { required: false }));
  let dryRun = core.getInput('dry_run', { required: false });
  dryRun = dryRun !== '' ? dryRun === 'true' : '';
  const repositoryUrl = core.getInput('repository_url', { required: false });
  const tagFormat = core.getInput('tag_format', { required: false });

  core.debug(`branch input: ${branch}`);
  core.debug(`branches input: ${branches}`);
  core.debug(`plugins input: ${plugins}`);
  core.debug(`additional_packages input: ${additionalPackages}`);
  core.debug(`extends input: ${extendsInput}`);
  core.debug(`dry_run input: ${dryRun}`);
  core.debug(`repository_url input: ${repositoryUrl}`);
  core.debug(`tag_format input: ${tagFormat}`);

  // install additional plugins/configurations
  if (extendsInput) {
    additionalPackages.push(...arrify(extendsInput));
  }
  if (additionalPackages.length) {
    installPackages(additionalPackages);
  }

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
    (key) => (options[key] === undefined || options[key] === '') && delete options[key],
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
