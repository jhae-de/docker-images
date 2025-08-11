import 'reflect-metadata';
import { container } from 'tsyringe';
import type { WorkflowContextLatestVersion, WorkflowContextRegularVersion } from '../../types';
import { JekyllVersionValidator } from './jekyll-version-validator.class';

type RegularVersionTestCase = {
  name: string;
  version: WorkflowContextRegularVersion;
  expected: boolean;
};

const validator: JekyllVersionValidator = container.resolve(JekyllVersionValidator);

function getValidRegularVersion(version: string, isLatest: boolean): WorkflowContextRegularVersion {
  return {
    version,
    'image-version': version,
    'image-name': `Jekyll ${version}`,
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

describe('JekyllVersionValidator.validateVersions', (): void => {
  it('does not throw for valid versions', (): void => {
    expect((): void =>
      validator.validateVersions([
        getValidRegularVersion('4.0.0', false),
        getValidRegularVersion('4.1.0', true),
        getValidLatestVersion(),
      ]),
    ).not.toThrow();
  });

  it('throws if versions array is too short', (): void => {
    expect((): void => validator.validateVersions([getValidRegularVersion('4.0.0', true)])).toThrow(
      'Versions array must contain at least two elements.',
    );
  });

  it('throws for invalid regular version', (): void => {
    const validRegularVersion: WorkflowContextRegularVersion = getValidRegularVersion('4.0.0', false);

    const invalidRegularVersions: WorkflowContextRegularVersion[] = [
      { ...validRegularVersion, version: 'invalid' },
      { ...validRegularVersion, 'image-version': 'four' },
      { ...validRegularVersion, 'image-name': 'Hyde 4.0.0' },
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
      validator.validateVersions([getValidRegularVersion('4.0.0', false), getValidRegularVersion('4.1.0', false)]),
    ).toThrow('Missing latest version object.');
  });

  it('throws if more than one latest version object is present', (): void => {
    expect((): void =>
      validator.validateVersions([
        getValidRegularVersion('4.0.0', true),
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
      validator.validateVersions([getValidRegularVersion('4.0.0', true), invalidLatestVersion]),
    ).toThrow(`Invalid latest version object: ${JSON.stringify(invalidLatestVersion)}`);
  });

  it('throws for unsorted regular versions', (): void => {
    expect((): void =>
      validator.validateVersions([
        getValidRegularVersion('4.1.0', true),
        getValidRegularVersion('4.0.0', false),
        getValidLatestVersion(),
      ]),
    ).toThrow('Regular versions are not sorted ascending by version number.');
  });

  it('throws if the last regular version does not have is-latest: true', (): void => {
    expect((): void =>
      validator.validateVersions([
        getValidRegularVersion('4.0.0', false),
        getValidRegularVersion('4.1.0', false),
        getValidLatestVersion(),
      ]),
    ).toThrow('The last regular version must have is-latest: true.');
  });

  it('throws if latest version is not last', (): void => {
    expect((): void =>
      validator.validateVersions([getValidLatestVersion(), getValidRegularVersion('4.0.0', true)]),
    ).toThrow('Latest version object must be last in the array.');
  });
});

describe('JekyllVersionValidator.isValidRegularVersion', (): void => {
  const regularVersionTestCases: RegularVersionTestCase[] = [
    {
      name: 'returns true for a valid regular version',
      version: getValidRegularVersion('4.0.0', false),
      expected: true,
    },
    {
      name: 'returns false for invalid version format',
      version: { ...getValidRegularVersion('4.0.0', false), version: '4.0' },
      expected: false,
    },
    {
      name: 'returns false for invalid image-version format',
      version: { ...getValidRegularVersion('4.0.0', false), 'image-version': 'four' },
      expected: false,
    },
    {
      name: 'returns false for invalid image-name format',
      version: { ...getValidRegularVersion('4.0.0', false), 'image-name': 'Hyde 4.0.0' },
      expected: false,
    },
    {
      name: 'returns false if is-latest is not boolean',
      version: { ...getValidRegularVersion('4.0.0', false), 'is-latest': 'yes' as unknown as boolean },
      expected: false,
    },
  ];

  it.each(regularVersionTestCases)('$name', (testCase: RegularVersionTestCase): void => {
    expect(validator.isValidRegularVersion(testCase.version)).toBe(testCase.expected);
  });
});
