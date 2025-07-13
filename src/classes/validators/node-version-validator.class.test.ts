import 'reflect-metadata';
import { container } from 'tsyringe';
import type { WorkflowContextLatestVersion, WorkflowContextRegularVersion } from '../../types';
import { NodeVersionValidator } from './node-version-validator.class';

type RegularVersionTestCase = {
  name: string;
  version: WorkflowContextRegularVersion;
  expected: boolean;
};

const validator: NodeVersionValidator = container.resolve(NodeVersionValidator);

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

describe('NodeVersionValidator.validateVersions', (): void => {
  it('does not throw for valid versions', (): void => {
    expect((): void =>
      validator.validateVersions([
        getValidRegularVersion('18.17.1', 'Hydrogen', false),
        getValidRegularVersion('20.10.0', 'Iron', true),
        getValidLatestVersion(),
      ]),
    ).not.toThrow();
  });

  it('throws if versions array is too short', (): void => {
    expect((): void => validator.validateVersions([getValidRegularVersion('18.17.1', 'Hydrogen', true)])).toThrow(
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
        validator.validateVersions([validRegularVersion, invalidRegularVersion, getValidLatestVersion()]),
      ).toThrow(`Invalid regular version object: ${JSON.stringify(invalidRegularVersion)}`);
    });
  });

  it('throws if latest version is missing', (): void => {
    expect((): void =>
      validator.validateVersions([
        getValidRegularVersion('18.17.1', 'Hydrogen', false),
        getValidRegularVersion('20.10.0', 'Iron', true),
      ]),
    ).toThrow('Missing latest version object.');
  });

  it('throws if more than one latest version object is present', (): void => {
    expect((): void =>
      validator.validateVersions([
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
      validator.validateVersions([getValidRegularVersion('18.17.1', 'Hydrogen', true), invalidLatestVersion]),
    ).toThrow(`Invalid latest version object: ${JSON.stringify(invalidLatestVersion)}`);
  });

  it('throws for unsorted regular versions', (): void => {
    expect((): void =>
      validator.validateVersions([
        getValidRegularVersion('20.10.0', 'Iron', true),
        getValidRegularVersion('18.17.1', 'Hydrogen', false),
        getValidLatestVersion(),
      ]),
    ).toThrow('Regular versions are not sorted ascending by version number.');
  });

  it('throws if the last regular version does not have is-latest: true', (): void => {
    expect((): void =>
      validator.validateVersions([
        getValidRegularVersion('18.17.1', 'Hydrogen', false),
        getValidRegularVersion('20.10.0', 'Iron', false),
        getValidLatestVersion(),
      ]),
    ).toThrow('The last regular version must have is-latest: true.');
  });

  it('throws if latest version is not last', (): void => {
    expect((): void =>
      validator.validateVersions([getValidLatestVersion(), getValidRegularVersion('18.17.1', 'Hydrogen', true)]),
    ).toThrow('Latest version object must be last in the array.');
  });
});

describe('NodeVersionValidator.isValidRegularVersion', (): void => {
  const regularVersionTestCases: RegularVersionTestCase[] = [
    {
      name: 'returns true for a valid regular version',
      version: getValidRegularVersion('18.17.1', 'Hydrogen', false),
      expected: true,
    },
    {
      name: 'returns false for invalid version format',
      version: { ...getValidRegularVersion('18.17.1', 'Hydrogen', false), version: '18.17' },
      expected: false,
    },
    {
      name: 'returns false for invalid image-version format',
      version: { ...getValidRegularVersion('18.17.1', 'Hydrogen', false), 'image-version': 'eighteen' },
      expected: false,
    },
    {
      name: 'returns false for invalid image-name format',
      version: { ...getValidRegularVersion('18.17.1', 'Hydrogen', false), 'image-name': 'Node 18.17.1 (Hydrogen)' },
      expected: false,
    },
    {
      name: 'returns false for mismatched image-code-name',
      version: { ...getValidRegularVersion('18.17.1', 'Hydrogen', false), 'image-code-name': 'iron' },
      expected: false,
    },
    {
      name: 'returns false for invalid image-code-name format',
      version: { ...getValidRegularVersion('18.17.1', 'Hydrogen', false), 'image-code-name': 'Hydrogen' },
      expected: false,
    },
    {
      name: 'returns false if is-latest is not boolean',
      version: { ...getValidRegularVersion('18.17.1', 'Hydrogen', false), 'is-latest': 'yes' as unknown as boolean },
      expected: false,
    },
  ];

  it.each(regularVersionTestCases)('$name', (testCase: RegularVersionTestCase): void => {
    expect(validator.isValidRegularVersion(testCase.version)).toBe(testCase.expected);
  });
});
