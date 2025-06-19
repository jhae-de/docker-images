import type { WorkflowContextLatestVersion, WorkflowContextRegularVersion, WorkflowContextVersion } from '../types';
import { NodeVersionFetcher } from './node-version-fetcher.class';

class TestNodeVersionFetcher extends NodeVersionFetcher {
  public validateVersions(versions: WorkflowContextVersion[]): void {
    super.validateVersions(versions);
  }
}

const fetcher: TestNodeVersionFetcher = new TestNodeVersionFetcher();

function getValidRegularVersion(version: string, codeName: string, isLatest: boolean): WorkflowContextRegularVersion {
  return {
    version,
    'image-version': version.split('.')[0],
    'image-name': `Node ${version} LTS (${codeName})`,
    'image-code-name': codeName.toLowerCase(),
    'is-latest': isLatest,
  };
}

function getValidLatestVersion(): WorkflowContextLatestVersion {
  return {
    'version': 'latest',
    'image-version': 'latest',
    'is-latest': true,
  };
}

describe('NodeVersionFetcher.validateVersions', (): void => {
  it('does not throw for valid versions', (): void => {
    expect((): void =>
      fetcher.validateVersions([
        getValidRegularVersion('18.17.1', 'Hydrogen', false),
        getValidRegularVersion('20.10.0', 'Iron', true),
        getValidLatestVersion(),
      ]),
    ).not.toThrow();
  });

  it('throws if versions array is too short', (): void => {
    expect((): void => fetcher.validateVersions([getValidRegularVersion('18.17.1', 'Hydrogen', true)])).toThrow(
      'Versions array must contain at least two elements.',
    );
  });

  it('throws for invalid regular version', (): void => {
    const validRegularVersion: WorkflowContextRegularVersion = getValidRegularVersion('18.17.1', 'Hydrogen', false);

    const invalidRegularVersions: WorkflowContextRegularVersion[] = [
      { ...validRegularVersion, version: 'invalid' },
      { ...validRegularVersion, 'image-version': 'twenty' },
      { ...validRegularVersion, 'image-name': 'Node 20.10.0 (Iron)' },
      { ...validRegularVersion, 'image-name': 'Node 20.10.0 LTS (Iron)', 'image-code-name': 'hydrogen' },
      { ...validRegularVersion, 'image-code-name': 'Iron' },
      { ...validRegularVersion, 'is-latest': 'yes' as unknown as boolean },
    ];

    invalidRegularVersions.forEach((invalidRegularVersion: WorkflowContextRegularVersion): void => {
      expect((): void =>
        fetcher.validateVersions([validRegularVersion, invalidRegularVersion, getValidLatestVersion()]),
      ).toThrow(`Invalid regular version object: ${JSON.stringify(invalidRegularVersion)}`);
    });
  });

  it('throws if latest version is missing', (): void => {
    expect((): void =>
      fetcher.validateVersions([
        getValidRegularVersion('18.17.1', 'Hydrogen', false),
        getValidRegularVersion('20.10.0', 'Iron', true),
      ]),
    ).toThrow('Missing latest version object.');
  });

  it('throws if more than one latest version object is present', (): void => {
    expect((): void =>
      fetcher.validateVersions([
        getValidRegularVersion('18.17.1', 'Hydrogen', true),
        getValidLatestVersion(),
        getValidLatestVersion(),
      ]),
    ).toThrow('Versions array must contain only one latest version object.');
  });

  it('throws for invalid latest version object', (): void => {
    const invalidLatestVersion: WorkflowContextLatestVersion = {
      'version': 'latest',
      'image-version': 'not-latest',
      'is-latest': false,
    } as unknown as WorkflowContextLatestVersion;

    expect((): void =>
      fetcher.validateVersions([getValidRegularVersion('18.17.1', 'Hydrogen', true), invalidLatestVersion]),
    ).toThrow(`Invalid latest version object: ${JSON.stringify(invalidLatestVersion)}`);
  });

  it('throws for unsorted regular versions', (): void => {
    expect((): void =>
      fetcher.validateVersions([
        getValidRegularVersion('20.10.0', 'Iron', true),
        getValidRegularVersion('18.17.1', 'Hydrogen', false),
        getValidLatestVersion(),
      ]),
    ).toThrow('Regular versions are not sorted ascending by version number.');
  });

  it('throws if the last regular version does not have is-latest: true', (): void => {
    expect((): void =>
      fetcher.validateVersions([
        getValidRegularVersion('18.17.1', 'Hydrogen', false),
        getValidRegularVersion('20.10.0', 'Iron', false),
        getValidLatestVersion(),
      ]),
    ).toThrow('The last regular version must have is-latest: true.');
  });

  it('throws if latest version is not last', (): void => {
    expect((): void =>
      fetcher.validateVersions([getValidLatestVersion(), getValidRegularVersion('18.17.1', 'Hydrogen', true)]),
    ).toThrow('Latest version object must be last in the array.');
  });
});
