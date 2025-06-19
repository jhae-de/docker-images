import process from 'node:process';
import semver from 'semver';
import type {
  GithubPackageVersion,
  NodeVersion,
  NodeVersionSchedule,
  NodeVersionScheduleData,
  WorkflowContextLatestVersion,
  WorkflowContextRegularVersion,
  WorkflowContextVersion,
} from '../types';
import { AbstractVersionFetcher } from './abstract-version-fetcher.class';

/**
 * The `NodeVersionFetcher` class is responsible for fetching and processing Node.js version data.
 *
 * It retrieves the latest LTS versions, newer EOL versions, and Docker image versions from the Node.js distribution
 * and GitHub registry. It provides methods to get the versions in a format to be used in a GitHub workflow. It extends
 * the `AbstractVersionFetcher` class to implement version fetching and processing logic specific to Node.js.
 */
export class NodeVersionFetcher extends AbstractVersionFetcher<NodeVersion> {
  /**
   * The URL to fetch Node.js version data from
   *
   * This URL points to the Node.js distribution index JSON file, which contains information about all Node.js
   * versions. It is used to retrieve the version data for processing.
   *
   * @type {string}
   */
  protected versionDataUrl: string = 'https://nodejs.org/dist/index.json';

  /**
   * The URL to fetch Node.js version schedule data from
   *
   * This URL points to the Node.js release schedule JSON file, which contains information about the lifecycle of
   * different Node.js versions, including LTS and EOL dates. It is used to determine which versions are currently
   * active and their respective lifecycles.
   *
   * @type {string}
   */
  protected versionScheduleDataUrl: string = 'https://raw.githubusercontent.com/nodejs/Release/main/schedule.json';

  /**
   * The URL to fetch Docker image versions from GitHub Packages
   *
   * This URL points to the GitHub API endpoint for the Node.js Docker images. It is used to retrieve the versions of
   * Docker images built for different Node.js versions.
   *
   * @type {string}
   */
  protected dockerRegistryUrl: string = 'https://api.github.com/users/jhae-de/packages/container/node/versions';

  /**
   * The cached version schedule data
   *
   * This property is used to store the fetched Node.js version schedule data to avoid unnecessary network requests. It
   * is initialized to null and will be populated when the data is fetched for the first time.
   *
   * @type {NodeVersionScheduleData | null}
   */
  protected cachedVersionScheduleData: NodeVersionScheduleData | null = null;

  /**
   * The cached Docker image versions
   *
   * This property is used to store the fetched Docker image versions to avoid unnecessary network requests. It is
   * initialized to null and will be populated when the data is fetched for the first time.
   *
   * @type {Map<number, string> | null}
   */
  protected cachedDockerImageVersions: Map<number, string> | null = null;

  /**
   * Returns the Node.js versions to be used in a GitHub workflow context.
   *
   * This method retrieves the eligible Node.js versions, processes them, and returns an array of version objects. It
   * includes the regular LTS versions, newer EOL versions (optional), and a 'latest' version object.
   *
   * @returns {Promise<WorkflowContextVersion[]>} A promise that resolves to an array of versions
   */
  public async getVersions(): Promise<WorkflowContextVersion[]> {
    const eligibleVersions: NodeVersion[] = await this.getEligibleVersions();

    const regularVersions: WorkflowContextRegularVersion[] = eligibleVersions.map(
      (version: NodeVersion, _: number, versions: NodeVersion[]): WorkflowContextRegularVersion => {
        const cleanVersion: string = semver.clean(version.version)!;

        return {
          'version': cleanVersion,
          'image-version': semver.major(cleanVersion).toString(),
          'image-name': `Node ${cleanVersion} LTS (${version.lts})`,
          'image-code-name': (version.lts as string).toLowerCase(),
          'is-latest': versions.every((version: NodeVersion): boolean =>
            semver.lte(semver.clean(version.version)!, cleanVersion),
          ),
        };
      },
    );

    const latestVersion: WorkflowContextLatestVersion = {
      'version': 'latest',
      'image-version': 'latest',
      'is-latest': true,
    };

    const versions: WorkflowContextVersion[] = [...regularVersions, latestVersion];

    this.validateVersions(versions);

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

      if (storedVersion !== undefined && !semver.gt(cleanVersion, semver.clean(storedVersion.version)!)) {
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
    const versionScheduleData: NodeVersionScheduleData = await this.getVersionScheduleData();
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
   * This method retrieves all Node.js versions, checks the Docker image versions, and identifies newer EOL versions
   * that are not currently active as LTS. It returns an array of objects representing these newer EOL versions.
   *
   * @returns {Promise<NodeVersion[]>} A promise that resolves to an array of newer EOL Node.js versions
   */
  protected async getNewerEolVersions(): Promise<NodeVersion[]> {
    const allVersions: NodeVersion[] = await this.getVersionData();
    const dockerImageVersions: Map<number, string> = await this.getDockerImageVersions();
    const activeLtsMajorVersions: Set<number> = this.getMajorVersions(await this.getActiveLtsVersions());
    const newerEolVersions: NodeVersion[] = [];

    dockerImageVersions.forEach((builtVersion: string, majorVersion: number): void => {
      if (activeLtsMajorVersions.has(majorVersion)) {
        return;
      }

      const versionsWithSameMajor: NodeVersion[] = this.getVersionsByMajorVersion(allVersions, majorVersion);
      const latestVersionsForMajor: NodeVersion[] = this.getLatestVersionsByMajor(versionsWithSameMajor);

      if (latestVersionsForMajor.length === 0) {
        return;
      }

      const newerEolVersion: NodeVersion = latestVersionsForMajor[0];
      const cleanEolVersion: string | null = semver.clean(newerEolVersion.version);

      if (cleanEolVersion === null || semver.lte(cleanEolVersion, builtVersion)) {
        return;
      }

      newerEolVersions.push(newerEolVersion);
    });

    return newerEolVersions;
  }

  /**
   * Returns the version schedule data, fetching it if not already cached.
   *
   * This method retrieves the Node.js version schedule data, which includes information about the lifecycle of
   * different Node.js versions. It caches the result to avoid unnecessary network requests on subsequent calls.
   *
   * @returns {Promise<NodeVersionScheduleData>} A promise that resolves to the Node.js version schedule data
   */
  protected async getVersionScheduleData(): Promise<NodeVersionScheduleData> {
    if (this.cachedVersionScheduleData === null) {
      this.cachedVersionScheduleData = await this.fetchWithRetry(
        (): Promise<NodeVersionScheduleData> => this.fetchVersionScheduleData(),
      );
    }

    return this.cachedVersionScheduleData;
  }

  /**
   * Returns the Docker image versions, fetching them if not already cached.
   *
   * This method retrieves the versions of Docker images built for different Node.js versions from the GitHub registry.
   * It caches the result to avoid unnecessary network requests on subsequent calls.
   *
   * @returns {Promise<Map<number, string>>} A promise that resolves to a map of major version numbers to Docker image
   *   versions
   */
  protected async getDockerImageVersions(): Promise<Map<number, string>> {
    if (this.cachedDockerImageVersions === null) {
      this.cachedDockerImageVersions = await this.fetchWithRetry(
        (): Promise<Map<number, string>> => this.fetchDockerImageVersions(),
      );
    }

    return this.cachedDockerImageVersions;
  }

  /**
   * Fetches the Node.js version schedule data from the specified URL.
   *
   * This method performs a network request to retrieve the Node.js version schedule data, which includes information
   * about the lifecycle of different Node.js versions. It returns the parsed JSON data as an object.
   *
   * @returns {Promise<NodeVersionScheduleData>} A promise that resolves to the Node.js version schedule data
   *
   * @throws {Error} If the fetch fails or the response is not OK, an error is thrown with the status text.
   */
  protected async fetchVersionScheduleData(): Promise<NodeVersionScheduleData> {
    const response: Response = await fetch(this.versionScheduleDataUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch Node.js version schedule data: ${response.statusText}`);
    }

    return (await response.json()) as NodeVersionScheduleData;
  }

  /**
   * Fetches the Docker image versions from the GitHub registry.
   *
   * This method performs a network request to retrieve the versions of Docker images built for different Node.js
   * versions. It processes the response to extract the relevant version information and returns it as a map of major
   * version numbers to Docker image versions.
   *
   * @returns {Promise<Map<number, string>>} A promise that resolves to a map of major version numbers to Docker image
   *   versions
   *
   * @throws {Error} If the fetch fails or the response is not OK, an error is thrown with the status text.
   */
  protected async fetchDockerImageVersions(): Promise<Map<number, string>> {
    const dockerImageVersions: Map<number, string> = new Map<number, string>();
    let dockerRegistryUrl: string | null = `${this.dockerRegistryUrl}?page=1&per_page=100`;

    while (dockerRegistryUrl !== null) {
      const response: Response = await fetch(dockerRegistryUrl, {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          Authorization: `token ${process.env.GITHUB_TOKEN}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch Docker image data: ${response.statusText}`);
      }

      this.processPackageVersions((await response.json()) as GithubPackageVersion[], dockerImageVersions);

      const linkHeader: string | null = response.headers.get('link');

      dockerRegistryUrl = linkHeader !== null ? this.getNextPageUrl(linkHeader) : null;
    }

    return dockerImageVersions;
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
   * Processes the package versions from the GitHub registry to extract Node.js version information.
   *
   * This method iterates over the package versions, extracts the Node.js version from the description, and updates
   * the Docker image versions map with the latest version for each major version.
   *
   * @param {GithubPackageVersion[]} packageVersions - The array of package versions to process
   * @param {Map<number, string>} dockerImageVersions - The map to update with major version numbers and their latest
   *   Docker image versions
   */
  protected processPackageVersions(
    packageVersions: GithubPackageVersion[],
    dockerImageVersions: Map<number, string>,
  ): void {
    packageVersions.forEach((packageVersion: GithubPackageVersion): void => {
      const versionString: string | undefined = packageVersion.description?.match(/Node (\d+\.\d+\.\d+)/i)?.[1];

      if (versionString === undefined || semver.valid(versionString) === null) {
        return;
      }

      const majorVersion: number = semver.major(versionString);
      const storedVersion: string | undefined = dockerImageVersions.get(majorVersion);

      if (storedVersion !== undefined && semver.lte(versionString, storedVersion)) {
        return;
      }

      dockerImageVersions.set(majorVersion, versionString);
    });
  }

  /**
   * Returns the next page URL from a link header.
   *
   * This method extracts the 'next' link from the provided link header string and returns the URL for the next page of
   * results. If no 'next' link is found, it returns null.
   *
   * @param {string} linkHeader - The link header string containing pagination links
   *
   * @returns {string | null} The URL for the next page of results, or null if not found
   */
  protected getNextPageUrl(linkHeader: string): string | null {
    const nextLink: string | undefined = linkHeader
      .split(',')
      .find((link: string): boolean => link.includes('rel="next"'));

    return nextLink?.match(/<([^>]+)>/)?.[1] || null;
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

  /**
   * Validates the versions array to ensure it contains at least two elements, has a valid structure, and is sorted.
   *
   * This method checks that the versions array contains at least one regular version and one latest version. It also
   * verifies that the regular versions are sorted in ascending order by version number and that the latest version is
   * correctly formatted and placed last in the array.
   *
   * @param {WorkflowContextVersion[]} versions - The array of versions to validate
   *
   * @throws {Error} If the versions array does not meet the validation criteria
   */
  protected validateVersions(versions: WorkflowContextVersion[]): void {
    if (!Array.isArray(versions) || versions.length < 2) {
      throw new Error('Versions array must contain at least two elements.');
    }

    const regularVersions: WorkflowContextRegularVersion[] = versions.filter(
      (version: WorkflowContextVersion): version is WorkflowContextRegularVersion => version.version !== 'latest',
    );

    regularVersions.forEach((version: WorkflowContextRegularVersion): void => {
      if (this.isValidRegularVersion(version)) {
        return;
      }

      throw new Error(`Invalid regular version object: ${JSON.stringify(version)}`);
    });

    const latestVersions: WorkflowContextLatestVersion[] = versions.filter(
      (version: WorkflowContextVersion): version is WorkflowContextLatestVersion => version.version === 'latest',
    );

    if (latestVersions.length === 0) {
      throw new Error('Missing latest version object.');
    }

    if (latestVersions.length > 1) {
      throw new Error('Versions array must contain only one latest version object.');
    }

    const latestVersion: WorkflowContextLatestVersion = latestVersions[0];

    if (latestVersion['image-version'] !== 'latest' || !latestVersion['is-latest']) {
      throw new Error(`Invalid latest version object: ${JSON.stringify(latestVersion)}`);
    }

    const regularVersionNumbers: string[] = regularVersions.map(
      (version: WorkflowContextRegularVersion): string => version.version,
    );

    if (JSON.stringify(regularVersionNumbers) !== JSON.stringify(semver.sort([...regularVersionNumbers]))) {
      throw new Error('Regular versions are not sorted ascending by version number.');
    }

    if (!regularVersions.at(-1)?.['is-latest']) {
      throw new Error('The last regular version must have is-latest: true.');
    }

    if (versions.at(-1)?.version === 'latest') {
      return;
    }

    throw new Error('Latest version object must be last in the array.');
  }

  /**
   * Validates the structure and values of a regular version object.
   *
   * This method checks if the provided version object adheres to the expected format and contains valid values. It
   * verifies the version number, image version, image name, image code name, and whether it is marked as the latest.
   *
   * @param {WorkflowContextRegularVersion} version - The regular version object to validate
   *
   * @returns {boolean} True if the version object is valid, otherwise false
   */
  protected isValidRegularVersion(version: WorkflowContextRegularVersion): boolean {
    const versionRegex: RegExp = /^\d+\.\d+\.\d+$/;
    const imageVersionRegex: RegExp = /^\d+$/;
    const imageNameRegex: RegExp = /^Node \d+\.\d+\.\d+ LTS \([A-Z][a-z]+\)$/;
    const imageCodeNameRegex: RegExp = /^[a-z]+$/;

    const codeNameMatches: RegExpMatchArray | null = version['image-name'].match(/\(([^)]+)\)$/);
    const isValidCodeName: boolean =
      codeNameMatches !== null && version['image-code-name'] === codeNameMatches[1].toLowerCase();

    return (
      versionRegex.test(version.version) &&
      imageVersionRegex.test(version['image-version']) &&
      imageNameRegex.test(version['image-name']) &&
      imageCodeNameRegex.test(version['image-code-name']!) &&
      typeof version['is-latest'] === 'boolean' &&
      isValidCodeName
    );
  }
}
