import semver from 'semver';
import type { WorkflowContextLatestVersion, WorkflowContextRegularVersion, WorkflowContextVersion } from '../../types';

/**
 * The `AbstractVersionValidator` class is an abstract base class for validating version objects.
 *
 * It provides methods to validate regular version objects and to validate an array of versions, ensuring they meet
 * specific criteria. Subclasses must implement the `isValidRegularVersion` method to define the specific validation
 * logic for regular versions.
 */
export abstract class AbstractVersionValidator {
  /**
   * Validates a regular version object to ensure it has the correct structure and properties.
   *
   * This method is intended to be overridden by subclasses to define the specific validation logic for regular
   * versions.
   *
   * @param {WorkflowContextRegularVersion} version - The regular version object to validate
   *
   * @returns {boolean} True if the version object is valid, otherwise false
   */
  public abstract isValidRegularVersion(version: WorkflowContextRegularVersion): boolean;

  /**
   * Validates the versions array to ensure it contains at least two elements, has a valid structure, and is sorted.
   *
   * This method checks that the versions array contains at least one regular version and one latest version. It also
   * verifies that the regular versions are sorted in ascending order by version number and that the latest version is
   * correctly formatted and placed last in the array.
   *
   * @param {WorkflowContextVersion[]} versions - The array of versions to validate
   *
   * @throws {Error} If the versions array does not meet the validation criteria, an error is thrown with a message
   *   indicating the specific validation failure.
   */
  public validateVersions(versions: WorkflowContextVersion[]): void {
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
}
