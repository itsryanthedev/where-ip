const { readdirSync, readFileSync } = require('node:fs');
const { join } = require('node:path');

describe('GitHub Actions supply-chain controls', () => {
  test('pins every remote action to an immutable commit SHA', () => {
    const workflowsDirectory = join(process.cwd(), '.github', 'workflows');
    const workflowFiles = readdirSync(workflowsDirectory).filter((fileName) =>
      /\.ya?ml$/i.test(fileName),
    );
    const mutableActionReferences = [];

    for (const workflowFile of workflowFiles) {
      const workflow = readFileSync(
        join(workflowsDirectory, workflowFile),
        'utf8',
      );

      workflow.split('\n').forEach((line, index) => {
        const reference = line.match(/^\s*uses:\s*([^\s#]+)/)?.[1];

        if (
          reference &&
          !reference.startsWith('./') &&
          !reference.startsWith('docker://') &&
          !/@[0-9a-f]{40}$/i.test(reference)
        ) {
          mutableActionReferences.push(
            `${workflowFile}:${index + 1} ${reference}`,
          );
        }
      });
    }

    expect(mutableActionReferences).toEqual([]);
  });
});
