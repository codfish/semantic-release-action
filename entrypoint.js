const core = require('@actions/core');
const semanticRelease = require('semantic-release');

async function main() {
  try {
    const result = await semanticRelease();

    if (result) {
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

      core.exportVariable('SEMANTIC_RELEASE', 'true');
      core.exportVariable('SEMANTIC_RELEASE_VERSION', version);
      core.exportVariable('SEMANTIC_RELEASE_MAJOR', major);
      core.exportVariable('SEMANTIC_RELEASE_MINOR', minor);
      core.exportVariable('SEMANTIC_RELEASE_PATCH', patch);

      // TODO: core.setOutput as well? What are outputs, how do they differ from env vars?
    } else {
      core.exportVariable('SEMANTIC_RELEASE', 'false');
      core.setOutput('semantic_release_string', 'true');
      core.setOutput('semantic_release_version', '1.0.4');
      core.setOutput('semantic_release_bool', true);
      core.debug('No release published');
    }
  } catch (err) {
    core.setFailed(`Action failed with error ${err}`);
  }
}

main();
