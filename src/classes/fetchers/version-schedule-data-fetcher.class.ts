import { fetchWithRetry } from '../../utilities';

/**
 * The `VersionScheduleDataFetcher` class is responsible for fetching version schedule data from a specified URL.
 *
 * This class provides a method to retrieve the version schedule data, which is cached to avoid unnecessary network
 * requests on subsequent calls.
 *
 * @template T - The type of version schedule data to be fetched. Defaults to `unknown`.
 */
export class VersionScheduleDataFetcher<T = unknown> {
  /**
   * The cached version schedule data
   *
   * This property is used to store the fetched version schedule data for each URL. It is used to cache the results of
   * the `getVersionScheduleData` method, so that if the same URL is requested again, the cached data is returned
   * instead of making another network request.
   *
   * @type {Map<string, Promise<T>}
   */
  protected static readonly versionScheduleDataCache: Map<string, Promise<unknown>> = new Map();

  /**
   * Creates a new `VersionScheduleDataFetcher` instance.
   *
   * @param {string} versionScheduleDataUrl - The URL to fetch version schedule data from
   */
  public constructor(protected readonly versionScheduleDataUrl: string) {}

  /**
   * Returns the version schedule data, fetching it if not already cached.
   *
   * This method retrieves the version schedule data. It caches the result to avoid unnecessary network requests on
   * subsequent calls.
   *
   * @returns {Promise<T>} A promise that resolves to the version schedule data
   */
  public getVersionScheduleData(): Promise<T> {
    if (!VersionScheduleDataFetcher.versionScheduleDataCache.has(this.versionScheduleDataUrl)) {
      VersionScheduleDataFetcher.versionScheduleDataCache.set(
        this.versionScheduleDataUrl,
        fetchWithRetry<T>((): Promise<T> => this.fetchVersionScheduleData()),
      );
    }

    return VersionScheduleDataFetcher.versionScheduleDataCache.get(this.versionScheduleDataUrl) as Promise<T>;
  }

  /**
   * Fetches version schedule data from the specified URL.
   *
   * This method performs a network request to retrieve the version schedule. It returns the parsed JSON data as an
   * object.
   *
   * @returns {Promise<T>} A promise that resolves to the version schedule data
   *
   * @throws {Error} If the fetch fails or the response is not OK, an error is thrown with the status text.
   */
  protected async fetchVersionScheduleData(): Promise<T> {
    const response: Response = await fetch(this.versionScheduleDataUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch version schedule data: ${response.statusText}`);
    }

    return (await response.json()) as T;
  }
}
