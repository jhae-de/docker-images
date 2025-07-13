import { singleton } from 'tsyringe';
import type { WorkflowContextRegularVersion } from '../../types';
import { AbstractVersionValidator } from '../abstract/abstract-version-validator.class';

/**
 * The `NodeVersionValidator` class is responsible for validating Node.js version objects.
 *
 * It extends the `AbstractVersionValidator` class and implements the `isValidRegularVersion` method to check the
 * structure and properties of a regular version object. This class ensures that the version object adheres to the
 * expected format, including the version number, image version, image name, image code name, and whether it is marked
 * as the latest.
 */
@singleton()
export class NodeVersionValidator extends AbstractVersionValidator {
  /**
   * Validates a regular version object to ensure it has the correct structure and properties.
   *
   * This method checks if the provided version object adheres to the expected format and contains valid values. It
   * verifies the version number, image version, image name, image code name, and whether it is marked as the latest.
   *
   * @param {WorkflowContextRegularVersion} version - The regular version object to validate
   *
   * @returns {boolean} True if the version object is valid, otherwise false
   */
  public isValidRegularVersion(version: WorkflowContextRegularVersion): boolean {
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
