import process from 'node:process';
import semver from 'semver';
import type { GithubPackageVersion, WorkflowContextRegularVersion, WorkflowContextVersion } from '../../types';
import { AbstractVersionFetcher } from './abstract-version-fetcher.class';

/**
 * The `AbstractImageVersionFetcher` class is an abstract base class for fetching image versions from the GitHub
 * package registry.
 *
 * It extends the `AbstractVersionFetcher` class and provides methods to fetch, process, and return image version data.
 * Subclasses must implement the `processPackageVersions` method to define how the versions are processed.
 */
export abstract class AbstractImageVersionFetcher extends AbstractVersionFetcher<GithubPackageVersion> {
  /**
   * Abstract method to process package versions.
   *
   * This method is intended to be overridden by subclasses to define how the fetched package versions are processed.
   *
   * @param {GithubPackageVersion[]} versions - The package versions to process
   *
   * @returns {Omit<WorkflowContextRegularVersion, 'is-latest'>[]} An array of processed versions, excluding the
   *   'is-latest' property
   */
  protected abstract processPackageVersions(
    versions: GithubPackageVersion[],
  ): Omit<WorkflowContextRegularVersion, 'is-latest'>[];

  /**
   * Returns a specific version based on the provided version string to be used in a workflow context.
   *
   * This method retrieves the version corresponding to the specified version string. The version string should be in
   * the format `x.y.z`, where `x`, `y`, and `z` are integers representing the major, minor, and patch versions
   * respectively. It ensures that the version is valid and returns it as a regular version object. If the version is
   * not found or invalid, it throws an error.
   *
   * @param {string} version - The version string to fetch
   *
   * @returns {Promise<WorkflowContextRegularVersion>} A promise that resolves to the specific version
   *
   * @throws {Error} If the version is invalid or not found, an error is thrown with a descriptive message.
   */
  public async getVersion(version: string): Promise<WorkflowContextRegularVersion> {
    const cleanVersion: string | null = semver.clean(version);

    if (cleanVersion === null) {
      throw new Error(`Invalid version: ${version}`);
    }

    const imageVersion: WorkflowContextRegularVersion | undefined = (await this.getAllVersions()).find(
      (version: WorkflowContextVersion): version is WorkflowContextRegularVersion =>
        version.version !== 'latest' && semver.eq(semver.clean(version.version)!, cleanVersion),
    );

    if (imageVersion === undefined) {
      throw new Error(`An image for version ${version} was not found.`);
    }

    return imageVersion;
  }

  /**
   * Returns the versions to be used in a workflow context.
   *
   * This method fetches the version data from the specified URL, processes it, and returns an array of version
   * objects. The versions are sorted in ascending order, and the latest version is marked with `is-latest: true`.
   *
   * @returns {Promise<WorkflowContextVersion[]>} A promise that resolves to an array of versions
   */
  protected async getAllVersions(): Promise<WorkflowContextVersion[]> {
    const regularVersions: WorkflowContextRegularVersion[] = this.processPackageVersions(await this.fetchVersionData())
      .map(
        (version: Omit<WorkflowContextRegularVersion, 'is-latest'>): WorkflowContextRegularVersion => ({
          ...version,
          'is-latest': false,
        }),
      )
      .sort((a: WorkflowContextRegularVersion, b: WorkflowContextRegularVersion): number =>
        semver.compare(a.version, b.version),
      );

    if (regularVersions.length > 0) {
      regularVersions.at(-1)!['is-latest'] = true;
    }

    const versions: WorkflowContextVersion[] = this.addLatestVersionObject(regularVersions);

    this.versionValidator.validateVersions(versions);

    return versions;
  }

  /**
   * Returns the version data, fetching it if not already cached.
   *
   * This method performs a network request to retrieve the version data from the URL defined in `versionDataUrl`. It
   * handles pagination by checking the `link` header for the next page URL and continues fetching until all pages are
   * retrieved.
   *
   * @returns {Promise<GithubPackageVersion[]>} A promise that resolves to the fetched data
   *
   * @throws {Error} If the version data URL is not set, an error is thrown indicating that the URL must be overridden.
   * @throws {Error} If the fetch fails or the response is not OK, an error is thrown with the status text.
   */
  protected async fetchVersionData(): Promise<GithubPackageVersion[]> {
    if (this.versionDataUrl === undefined) {
      throw new Error('Version data URL is not set. Please override "versionDataUrl" in the subclass.');
    }

    const versionData: GithubPackageVersion[] = [];
    let versionDataUrl: string | null = `${this.versionDataUrl}?page=1&per_page=100`;

    while (versionDataUrl !== null) {
      const response: Response = await fetch(versionDataUrl, {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          Authorization: `token ${process.env.GITHUB_TOKEN}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch version data: ${response.statusText}`);
      }

      versionData.push(...((await response.json()) as GithubPackageVersion[]));

      const linkHeader: string | null = response.headers.get('link');

      versionDataUrl = linkHeader !== null ? this.getNextPageUrl(linkHeader) : null;
    }

    return versionData;
  }

  /**
   * Returns the next page URL from a `link` header.
   *
   * This method extracts the `next` link from the provided `link` header string and returns the URL for the next page
   * of results. If no `next` link is found, it returns null.
   *
   * @param {string} linkHeader - The link header string containing pagination links
   *
   * @returns {string | null} The URL for the next page of results, or null if not found
   */
  protected getNextPageUrl(linkHeader: string): string | null {
    const nextLink: string | undefined = linkHeader
      .split(',')
      .find((link: string): boolean => link.includes('rel="next"'));

    return nextLink?.match(/<([^>]+)>/)?.[1] ?? null;
  }
}
