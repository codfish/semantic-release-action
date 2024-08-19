import * as childProcess from 'child_process';
import core from '@actions/core';
import semanticRelease from 'semantic-release';
import JSON5 from 'json5';
import arrify from 'arrify';
import { cosmiconfig } from 'cosmiconfig';

const parseInput = (input, defaultValue = '') => {
  try {
    return JSON5.parse(input);
  } catch (err) {
    return defaultValue || input;
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
    const spawn = childProcess.spawnSync(
      'npm',
      ['install', '--no-save', '--no-audit', '--no-fund', '--force', ...packagesArr],
      {
        stdio: ['inherit', 'inherit', 'pipe'],
      },
    );
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
 * Sets the github workspace as a safe directory in the global git config.
 *
 * @returns {object} - Response from `child_process.spawnSync()`.
 */
const setGitConfigSafeDirectory = () => {
  try {
    core.debug(`Enabling github workspace as a git safe directory`);
    const spawn = childProcess.spawnSync('git', [
      'config',
      '--global',
      '--add',
      'safe.directory',
      process.env.GITHUB_WORKSPACE,
    ]);
    if (spawn.status !== 0) {
      throw new Error(spawn.stderr);
    }
    core.debug(`Set ${process.env.GITHUB_WORKSPACE} as a safe directory.`);
    return spawn;
  } catch (err) {
    core.debug(`Error setting ${process.env.GITHUB_WORKSPACE} as a safe directory.`);
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
  const workingDirectory =
    parseInput(core.getInput('working-directory', { required: false })) || '.';
  const configFile = await cosmiconfig('release')
    .search(workingDirectory)
    .then((result) => result?.config);
  const branch = parseInput(core.getInput('branch', { required: false }));
  // Branches are parsed in this order:
  // 1. Input from the action
  // 2. Config file
  // 3. Default branches set in this action = semantic-release's default branches with the addition of `main`.
  const branches = parseInput(
    core.getInput('branches', { required: false }),
    configFile?.branches || [
      'master',
      'main',
      'next',
      'next-major',
      '+([0-9])?(.{+([0-9]),x}).x',
      { name: 'beta', prerelease: true },
      { name: 'alpha', prerelease: true },
      { name: 'canary', prerelease: true },
    ],
  );
  const plugins = parseInput(core.getInput('plugins', { required: false }));
  const additionalPackages =
    parseInput(core.getInput('additional-packages', { required: false })) || [];
  const extendsInput = parseInput(core.getInput('extends', { required: false }));
  let dryRun = core.getInput('dry-run', { required: false });
  dryRun = dryRun !== '' ? dryRun === 'true' : '';
  const repositoryUrl = core.getInput('repository-url', { required: false });
  const tagFormat = core.getInput('tag-format', { required: false });

  core.debug(`branch input: ${branch}`);
  core.debug(`branches input: ${branches}`);
  core.debug(`plugins input: ${plugins}`);
  core.debug(`additional-packages input: ${additionalPackages}`);
  core.debug(`extends input: ${extendsInput}`);
  core.debug(`dry-run input: ${dryRun}`);
  core.debug(`repository-url input: ${repositoryUrl}`);
  core.debug(`tag-format input: ${tagFormat}`);
  core.debug(`working-directory input: ${workingDirectory}`);

  setGitConfigSafeDirectory();

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

  const result = await semanticRelease(options, { cwd: workingDirectory });
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
  const { version, notes, type, channel, gitHead, gitTag, name } = nextRelease;
  const [major, minor, patch] = version.split('.');
  core.exportVariable('NEW_RELEASE_PUBLISHED', 'true');
  core.exportVariable('RELEASE_VERSION', version);
  core.exportVariable('RELEASE_MAJOR', major);
  core.exportVariable('RELEASE_MINOR', minor);
  core.exportVariable('RELEASE_PATCH', patch);
  core.exportVariable('RELEASE_NOTES', notes);
  core.exportVariable('RELEASE_TYPE', type);
  core.exportVariable('RELEASE_CHANNEL', channel);
  core.exportVariable('RELEASE_GIT_HEAD', gitHead);
  core.exportVariable('RELEASE_GIT_TAG', gitTag);
  core.exportVariable('RELEASE_NAME', name);
  core.setOutput('new-release-published', 'true');
  core.setOutput('release-version', version);
  core.setOutput('release-major', major);
  core.setOutput('release-minor', minor);
  core.setOutput('release-patch', patch);
  core.setOutput('release-notes', notes);
  core.setOutput('type', type);
  core.setOutput('channel', channel);
  core.setOutput('git-head', gitHead);
  core.setOutput('git-tag', gitTag);
  core.setOutput('name', name);
}

run().catch(core.setFailed);
