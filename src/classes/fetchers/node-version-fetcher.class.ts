import semver from 'semver';
import { container, inject, injectable } from 'tsyringe';
import type {
  NodeVersion,
  NodeVersionSchedule,
  NodeVersionScheduleData,
  WorkflowContextRegularVersion,
  WorkflowContextVersion,
} from '../../types';
import { AbstractVersionFetcher } from '../abstract/abstract-version-fetcher.class';
import { NodeVersionValidator } from '../validators/node-version-validator.class';
import { NodeImageVersionFetcher } from './node-image-version-fetcher.class';
import { VersionScheduleDataFetcher } from './version-schedule-data-fetcher.class';

/**
 * The `NodeVersionFetcher` class is responsible for fetching and processing Node.js version data.
 *
 * It retrieves the latest LTS versions, newer EOL versions, and Node.js image versions from the Node.js distribution
 * and GitHub package registry. It provides methods to get the versions in a format to be used in a GitHub workflow. It
 * extends the `AbstractVersionFetcher` class to implement version fetching and processing logic specific to Node.js.
 */
@injectable()
export class NodeVersionFetcher extends AbstractVersionFetcher<NodeVersion> {
  /**
   * The URL to fetch Node.js version data from
   *
   * This URL points to the Node.js distribution index JSON file, which contains information about all Node.js
   * versions. It is used to retrieve the version data for processing.
   *
   * @type {string}
   */
  protected readonly versionDataUrl: string = 'https://nodejs.org/dist/index.json';

  /**
   * The URL to fetch Node.js version schedule data from
   *
   * This URL points to the Node.js release schedule JSON file, which contains information about the lifecycle of
   * different Node.js versions, including LTS and EOL dates. It is used to determine which versions are currently
   * active and their respective lifecycles.
   *
   * @type {string}
   */
  protected readonly versionScheduleDataUrl: string =
    'https://raw.githubusercontent.com/nodejs/Release/main/schedule.json';

  /**
   * Creates a new `NodeVersionFetcher` instance.
   *
   * @param {NodeVersionValidator} versionValidator - An instance of the `NodeVersionValidator` to validate versions
   */
  public constructor(@inject(NodeVersionValidator) protected readonly versionValidator: NodeVersionValidator) {
    super(versionValidator);
  }

  /**
   * Returns a specific Node.js version based on the provided version string.
   *
   * This method retrieves the LTS version corresponding to the specified version string. The version string should be
   * in the format `x.y.z`, where `x`, `y`, and `z` are integers representing the major, minor, and patch versions
   * respectively. It ensures that the version is valid and returns it as a regular version object. If the version is
   * not found or is invalid, it throws an error.
   *
   * @param {string} version - The version string to fetch
   *
   * @returns {Promise<WorkflowContextRegularVersion>} A promise that resolves to the specific Node.js version object
   *
   * @throws {Error} If the version is invalid or not a valid Node.js LTS version, an error is thrown with a message
   *  indicating the issue.
   */
  public async getVersion(version: string): Promise<WorkflowContextRegularVersion> {
    const cleanVersion: string | null = semver.clean(version);

    if (cleanVersion === null) {
      throw new Error(`Invalid version: ${version}`);
    }

    const ltsVersions: NodeVersion[] = await this.getLtsVersions();
    const ltsVersion: NodeVersion | undefined = ltsVersions.find((ltsVersion: NodeVersion): boolean =>
      semver.eq(semver.clean(ltsVersion.version)!, cleanVersion),
    );

    if (ltsVersion === undefined) {
      throw new Error(`Version ${version} is not a valid Node.js LTS version.`);
    }

    const latestLtsVersion: string = semver
      .sort(ltsVersions.map((ltsVersion: NodeVersion): string => ltsVersion.version))
      .at(-1)!;

    const regularVersion: WorkflowContextRegularVersion = {
      'version': cleanVersion,
      'image-version': semver.major(cleanVersion).toString(),
      'image-name': `Node ${cleanVersion} LTS (${ltsVersion.lts})`,
      'image-code-name': (ltsVersion.lts as string).toLowerCase(),
      'is-latest': semver.eq(cleanVersion, latestLtsVersion),
    };

    if (!this.versionValidator.isValidRegularVersion(regularVersion)) {
      throw new Error(`Invalid regular version object for version: ${version}`);
    }

    return regularVersion;
  }

  /**
   * Returns the Node.js versions to be used in a workflow context.
   *
   * This method retrieves the eligible Node.js versions, processes them, and returns an array of version objects. It
   * includes the regular LTS versions, newer EOL versions (optional), and a 'latest' version object.
   *
   * @returns {Promise<WorkflowContextVersion[]>} A promise that resolves to an array of versions
   */
  public async getVersions(): Promise<WorkflowContextVersion[]> {
    const eligibleVersions: NodeVersion[] = await this.getEligibleVersions();
    const latestVersion: string = semver
      .sort(eligibleVersions.map((version: NodeVersion): string => version.version))
      .at(-1)!;

    const regularVersions: WorkflowContextRegularVersion[] = eligibleVersions.map(
      (version: NodeVersion): WorkflowContextRegularVersion => {
        const cleanVersion: string = semver.clean(version.version)!;

        return {
          'version': cleanVersion,
          'image-version': semver.major(cleanVersion).toString(),
          'image-name': `Node ${cleanVersion} LTS (${version.lts})`,
          'image-code-name': (version.lts as string).toLowerCase(),
          'is-latest': semver.eq(cleanVersion, latestVersion),
        };
      },
    );

    const versions: WorkflowContextVersion[] = this.addLatestVersionObject(regularVersions);

    this.versionValidator.validateVersions(versions);

    return versions;
  }

  /**
   * Returns the eligible Node.js versions.
   *
   * This method retrieves the curently active LTS versions and newer EOL versions, combines them, and sorts them by
   * major version. It ensures that only the versions that are currently active or have a newer EOL are included.
   *
   * @returns {Promise<NodeVersion[]>} A promise that resolves to an array of eligible Node.js versions
   */
  protected async getEligibleVersions(): Promise<NodeVersion[]> {
    const activeLtsVersions: NodeVersion[] = this.getLatestVersionsByMajor(await this.getActiveLtsVersions());
    const newerEolVersions: NodeVersion[] = await this.getNewerEolVersions();
    const eligibleVersions: Map<number, NodeVersion> = new Map();

    [...activeLtsVersions, ...newerEolVersions].forEach((eligibleVersion: NodeVersion): void => {
      const cleanVersion: string | null = semver.clean(eligibleVersion.version);

      if (cleanVersion === null) {
        return;
      }

      const majorVersion: number = semver.major(cleanVersion);
      const storedVersion: NodeVersion | undefined = eligibleVersions.get(majorVersion);

      if (storedVersion !== undefined && semver.lte(cleanVersion, semver.clean(storedVersion.version)!)) {
        return;
      }

      eligibleVersions.set(majorVersion, eligibleVersion);
    });

    return Array.from(eligibleVersions.values()).sort((a: NodeVersion, b: NodeVersion): number =>
      semver.compare(a.version, b.version),
    );
  }

  /**
   * Returns the currently active LTS versions of Node.js.
   *
   * This method retrieves all Node.js versions, filters them to get only the LTS versions, and checks their lifecycle
   * status against the current date. It returns only those LTS versions that are currently active.
   *
   * @returns {Promise<NodeVersion[]>} A promise that resolves to an array of currently active LTS Node.js versions
   */
  protected async getActiveLtsVersions(): Promise<NodeVersion[]> {
    const versionScheduleData: NodeVersionScheduleData = await new VersionScheduleDataFetcher<NodeVersionScheduleData>(
      this.versionScheduleDataUrl,
    ).getVersionScheduleData();
    const now: Date = new Date();

    return this.filterVersions(await this.getLtsVersions(), (ltsVersion: NodeVersion): boolean => {
      const cleanLtsVersion: string | null = semver.clean(ltsVersion.version);

      if (cleanLtsVersion === null) {
        return false;
      }

      const versionSchedule: NodeVersionSchedule = versionScheduleData[`v${semver.major(cleanLtsVersion)}`];

      return versionSchedule?.lts !== undefined && versionSchedule?.end !== undefined
        ? now >= new Date(versionSchedule.lts) && now < new Date(versionSchedule.end)
        : false;
    });
  }

  /**
   * Returns newer EOL versions of Node.js.
   *
   * This method retrieves all Node.js versions, checks the Node.js image versions, and identifies newer EOL versions
   * that are not currently active as LTS. It returns an array of objects representing these newer EOL versions.
   *
   * @returns {Promise<NodeVersion[]>} A promise that resolves to an array of newer EOL Node.js versions
   */
  protected async getNewerEolVersions(): Promise<NodeVersion[]> {
    const allVersions: NodeVersion[] = await this.getVersionData();
    const activeLtsMajorVersions: Set<number> = this.getMajorVersions(await this.getActiveLtsVersions());
    const newerEolVersions: NodeVersion[] = [];

    (await container.resolve(NodeImageVersionFetcher).getVersions())
      .filter(
        (nodeImageVersion: WorkflowContextVersion): nodeImageVersion is WorkflowContextRegularVersion =>
          nodeImageVersion.version !== 'latest',
      )
      .forEach((nodeImageVersion: WorkflowContextRegularVersion): void => {
        const majorVersion: number = semver.major(nodeImageVersion.version);

        if (activeLtsMajorVersions.has(majorVersion)) {
          return;
        }

        const versionsWithSameMajor: NodeVersion[] = this.getVersionsByMajorVersion(allVersions, majorVersion);
        const newerEolVersion: NodeVersion | undefined = this.getLatestVersionsByMajor(versionsWithSameMajor)[0];

        if (newerEolVersion === undefined) {
          return;
        }

        const cleanEolVersion: string | null = semver.clean(newerEolVersion.version);

        if (cleanEolVersion === null || semver.lte(cleanEolVersion, nodeImageVersion.version)) {
          return;
        }

        newerEolVersions.push(newerEolVersion);
      });

    return newerEolVersions;
  }

  /**
   * Returns the latest versions of Node.js by major version.
   *
   * This method processes an array of Node.js versions and returns the latest version for each major version. It
   * ensures that only the most recent version for each major version is included in the result.
   *
   * @param {NodeVersion[]} versions - The array of Node.js versions to process
   *
   * @returns {NodeVersion[]} An array of Node.js versions, each representing the latest version for its major version
   */
  protected getLatestVersionsByMajor(versions: NodeVersion[]): NodeVersion[] {
    const latestVersions: Map<number, NodeVersion> = new Map();

    versions.forEach((version: NodeVersion): void => {
      const cleanVersion: string | null = semver.clean(version.version);

      if (cleanVersion === null) {
        return;
      }

      const majorVersion: number = semver.major(cleanVersion);
      const storedVersion: NodeVersion | undefined = latestVersions.get(majorVersion);

      if (storedVersion !== undefined && semver.lte(cleanVersion, semver.clean(storedVersion.version)!)) {
        return;
      }

      latestVersions.set(majorVersion, version);
    });

    return Array.from(latestVersions.values());
  }

  /**
   * Returns the major versions from an array of Node.js versions.
   *
   * This method extracts the major version numbers from the provided Node.js versions and returns them as a set.
   *
   * @param {NodeVersion[]} versions - The array of Node.js versions to process
   *
   * @returns {Set<number>} A set of major version numbers extracted from the Node.js versions
   */
  protected getMajorVersions(versions: NodeVersion[]): Set<number> {
    const majorVersions: number[] = versions
      .map((version: NodeVersion): string | null => semver.clean(version.version))
      .filter((version: string | null): version is string => version !== null)
      .map((version: string): number => semver.major(version));

    return new Set(majorVersions);
  }

  /**
   * Returns all LTS versions of Node.js.
   *
   * This method retrieves the Node.js version data and filters it to include only those versions that are marked as
   * LTS.
   *
   * @returns {Promise<NodeVersion[]>} A promise that resolves to an array of Node.js versions that are marked as LTS
   */
  protected async getLtsVersions(): Promise<NodeVersion[]> {
    return this.filterVersions(await this.getVersionData(), (version: NodeVersion): boolean => version.lts !== false);
  }

  /**
   * Returns the Node.js versions that match a specific major version.
   *
   * This method filters the provided array of Node.js versions to include only those that match the specified major
   * version number.
   *
   * @param {NodeVersion[]} versions - The array of Node.js versions to filter
   * @param {number} majorVersion - The major version number to match
   *
   * @returns {NodeVersion[]} An array of Node.js versions that match the specified major version
   */
  protected getVersionsByMajorVersion(versions: NodeVersion[], majorVersion: number): NodeVersion[] {
    return this.filterVersions(versions, (version: NodeVersion): boolean => {
      const cleanVersion: string | null = semver.clean(version.version);

      return cleanVersion !== null && semver.major(cleanVersion) === majorVersion;
    });
  }
}
