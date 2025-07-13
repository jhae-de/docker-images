import type { WorkflowContextLatestVersion, WorkflowContextRegularVersion, WorkflowContextVersion } from '../../types';
import { fetchWithRetry } from '../../utilities';
import { AbstractVersionValidator } from './abstract-version-validator.class';

/**
 * The `AbstractVersionFetcher` class is an abstract base class for fetching version data.
 *
 * It provides methods to fetch version data from a specified URL, cache the results, and filter versions based on a
 * predicate.
 *
 * @template T - The type of version data to be fetched. Defaults to `unknown`.
 */
export abstract class AbstractVersionFetcher<T = unknown> {
  /**
   * The URL to fetch version data from
   *
   * This should be overridden in subclasses to provide the specific URL for the version data.
   *
   * @type {string | undefined}
   */
  protected readonly versionDataUrl?: string;

  /**
   * The cached version data
   *
   * This property is used to store the fetched version data to avoid unnecessary network requests.
   *
   * @type {T[] | null}
   */
  protected cachedVersionData: T[] | null = null;

  /**
   * Initializes the version fetcher.
   *
   * @param {AbstractVersionValidator} versionValidator - An instance of the version validator to validate versions
   */
  public constructor(protected readonly versionValidator: AbstractVersionValidator) {}

  /**
   * Returns a specific version based on the provided version string to be used in a workflow context.
   *
   * This method is intended to be overridden by subclasses to define how a specific version is fetched and returned.
   *
   * @param {string} version - The version string to fetch
   *
   * @returns {Promise<WorkflowContextRegularVersion>} A promise that resolves to the specific version
   */
  public abstract getVersion(version: string): Promise<WorkflowContextRegularVersion>;

  /**
   * Returns the versions to be used in a workflow context.
   *
   * This method is intended to be overridden by subclasses to define how the versions are fetched and returned.
   *
   * @returns {Promise<WorkflowContextVersion[]>} A promise that resolves to an array of versions
   */
  public abstract getVersions(): Promise<WorkflowContextVersion[]>;

  /**
   * Returns the version data, fetching it if not already cached.
   *
   * This method will attempt to fetch the version data, caching the result for future calls. If the data has already
   * been fetched, it will return the cached data. It also handles retries in case of fetch failures.
   *
   * @returns {Promise<T[]>} A promise that resolves to the fetched data
   *
   * @throws {Error} If the fetch fails after the specified number of attempts, an error is thrown with the last
   *   encountered error message.
   */
  protected async getVersionData(): Promise<T[]> {
    if (this.cachedVersionData === null) {
      this.cachedVersionData = await fetchWithRetry<T[]>((): Promise<T[]> => this.fetchVersionData());
    }

    return this.cachedVersionData;
  }

  /**
   * Fetches version data from the specified URL.
   *
   * This method fetches the data from the URL set in `versionDataUrl`, parses the JSON response, and returns it as an
   * array.
   *
   * @returns {Promise<T[]>} A promise that resolves to the fetched data
   *
   * @throws {Error} If the version data URL is not set, an error is thrown indicating that the URL must be overridden.
   * @throws {Error} If the fetch fails or the response is not OK, an error is thrown with the status text.
   */
  protected async fetchVersionData(): Promise<T[]> {
    if (this.versionDataUrl === undefined) {
      throw new Error('Version data URL is not set. Please override "versionDataUrl" in the subclass.');
    }

    const response: Response = await fetch(this.versionDataUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch version data: ${response.statusText}`);
    }

    return (await response.json()) as T[];
  }

  /**
   * Filters versions based on a predicate function.
   *
   * This method filters the provided array of versions using the specified predicate function. It returns a new array
   * containing only the versions that satisfy the predicate.
   *
   * @param {T[]} versions - The array of versions to filter
   * @param {(version: T) => boolean} predicate - The predicate function to test each version
   *
   * @returns {T[]} An array of versions that match the predicate
   */
  protected filterVersions(versions: T[], predicate: (version: T) => boolean): T[] {
    return versions.filter(predicate);
  }

  /**
   * Adds a latest version object to an array of regular versions.
   *
   * This method appends a `latest` version object to the provided array of regular versions. The `latest` version
   * object is defined with the properties: `version: 'latest'`, `image-version: 'latest'`, and `is-latest: true`.
   *
   * @param {WorkflowContextRegularVersion[]} regularVersions - The array of regular versions to which the latest
   *   version object will be added
   *
   * @returns {WorkflowContextVersion[]} An array containing the original regular versions plus the latest version
   *   object
   */
  protected addLatestVersionObject(regularVersions: WorkflowContextRegularVersion[]): WorkflowContextVersion[] {
    const latestVersion: WorkflowContextLatestVersion = {
      'version': 'latest',
      'image-version': 'latest',
      'is-latest': true,
    };

    return [...regularVersions, latestVersion];
  }
}
