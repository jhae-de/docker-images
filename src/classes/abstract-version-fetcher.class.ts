import assert from 'node:assert/strict';
import type { WorkflowContextVersion } from '../types';

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
  protected versionDataUrl?: string;

  /**
   * The cached version data
   *
   * This property is used to store the fetched version data to avoid unnecessary network requests.
   *
   * @type {T[] | null}
   */
  protected cachedVersionData: T[] | null = null;

  /**
   * Returns the versions to be used in a workflow context.
   *
   * This method is intended to be overridden by subclasses to define how the versions are fetched and processed.
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
      this.cachedVersionData = await this.fetchWithRetry((): Promise<T[]> => this.fetchVersionData());
    }

    return this.cachedVersionData;
  }

  /**
   * Fetches data with retry logic.
   *
   * This method attempts to fetch data using the provided fetch function, retrying on failure up to a specified number
   * of attempts with exponential backoff. It will throw an error if all attempts fail. The delay between attempts
   * increases exponentially, up to a maximum of 30 seconds.
   *
   * @param {() => Promise<T>} fetchFn - The function that performs the fetch operation
   * @param {number} [attempts=3] - The maximum number of attempts to fetch the data
   * @param {number} [delay=1000] - The initial delay between attempts in milliseconds
   *
   * @returns {Promise<T>} A promise that resolves to the fetched data
   *
   * @throws {Error} If all fetch attempts fail, an error is thrown with the last encountered error message.
   */
  protected async fetchWithRetry<T>(fetchFn: () => Promise<T>, attempts: number = 3, delay: number = 1000): Promise<T> {
    assert.ok(attempts >= 1, 'The number of attempts must be at least 1.');
    assert.ok(delay >= 0, 'The delay must be a non-negative number.');

    let lastError: Error | null = null;

    for (let attempt: number = 1; attempt <= attempts; attempt++) {
      try {
        return await fetchFn();
      } catch (error: unknown) {
        lastError = !(error instanceof Error) ? new Error(String(error)) : error;
        console.warn(`Fetch attempt ${attempt}/${attempts} failed: ${lastError.message}`);

        if (attempt === attempts) {
          continue;
        }

        await new Promise(
          (resolve: (value: unknown) => void): void =>
            void setTimeout(resolve, Math.min(delay * Math.pow(2, attempt - 1), 30000)),
        );
      }
    }

    throw lastError || new Error(`Failed to fetch data after ${attempts} attempts.`);
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
}
