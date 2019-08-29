const core = require('@actions/core');
const semanticRelease = require('semantic-release');

async function run() {
  const result = await semanticRelease();

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

  // outputs
  const { version } = nextRelease;
  const major = version.split('.')[0];
  const minor = version.split('.')[1];
  const patch = version.split('.')[2];

  // set outputs
  core.exportVariable('NEW_RELEASE_PUBLISHED', 'true');
  core.exportVariable('RELEASE_VERSION', version);
  core.exportVariable('RELEASE_MAJOR', major);
  core.exportVariable('RELEASE_MINOR', minor);
  core.exportVariable('RELEASE_PATCH', patch);
  core.setOutput('new-release-published', 'true');
  core.setOutput('release-version', version);
  core.setOutput('release-major', major);
  core.setOutput('release-minor', minor);
  core.setOutput('release-patch', patch);
}

run().catch(core.setFailed);
