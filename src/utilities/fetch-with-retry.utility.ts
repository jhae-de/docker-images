import assert from 'node:assert/strict';

/**
 * Fetches data with retry logic.
 *
 * This method tries to fetch data using the provided fetch function, retrying on failure up to a specified number of
 * attempts with an exponential delay up to a maximum of 30 seconds between attempts. If all attempts fail, it throws
 * the last encountered error.
 *
 * @template T - The type of the data to be fetched
 *
 * @param {() => Promise<T>} fetchFn - The function that performs the fetch operation
 * @param {number} [attempts=3] - The maximum number of attempts to fetch the data
 * @param {number} [delay=1000] - The initial delay between attempts in milliseconds
 *
 * @returns {Promise<T>} A promise that resolves to the fetched data
 *
 * @throws {Error} If all fetch attempts fail, an error is thrown with the last encountered error message.
 */
export async function fetchWithRetry<T>(
  fetchFn: () => Promise<T>,
  attempts: number = 3,
  delay: number = 1000,
): Promise<T> {
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
