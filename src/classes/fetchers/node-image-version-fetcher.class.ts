import semver from 'semver';
import { inject, injectable } from 'tsyringe';
import type {
  GithubPackageVersion,
  NodeVersionSchedule,
  NodeVersionScheduleData,
  WorkflowContextRegularVersion,
  WorkflowContextVersion,
} from '../../types';
import { AbstractImageVersionFetcher } from '../abstract/abstract-image-version-fetcher.class';
import { NodeVersionValidator } from '../validators/node-version-validator.class';
import { VersionScheduleDataFetcher } from './version-schedule-data-fetcher.class';

/**
 * The `NodeImageVersionFetcher` class is responsible for fetching and processing Node.js image versions.
 *
 * It extends the `AbstractImageVersionFetcher` class to provide specific functionality for Node.js image versions.
 */
@injectable()
export class NodeImageVersionFetcher extends AbstractImageVersionFetcher {
  /**
   * The URL to fetch Node.js image versions from
   *
   * This URL points to the GitHub API endpoint for the Node.js container package versions. It is used to retrieve the
   * available Node.js image versions built for different Node.js versions.
   *
   * @type {string}
   */
  protected readonly versionDataUrl: string = 'https://api.github.com/users/jhae-de/packages/container/node/versions';

  /**
   * The URL to fetch Node.js version schedule data from
   *
   * This URL points to the Node.js release schedule JSON file, which contains information about the lifecycle of
   * different Node.js versions, including LTS and EOL dates. It is used to determine which versions are currently
   * supported and their respective lifecycles.
   *
   * @type {string}
   */
  protected readonly versionScheduleDataUrl: string =
    'https://raw.githubusercontent.com/nodejs/Release/main/schedule.json';

  /**
   * Creates a new `NodeImageVersionFetcher` instance.
   *
   * @param {NodeVersionValidator} versionValidator - An instance of the `NodeVersionValidator` to validate versions
   */
  public constructor(@inject(NodeVersionValidator) protected readonly versionValidator: NodeVersionValidator) {
    super(versionValidator);
  }

  /**
   * Returns the Node.js image versions to be used in a workflow context.
   *
   * This method retrieves the Node.js version schedule data and filters the Node.js image versions fetched from the
   * parent class to include only those that are currently active LTS versions.
   *
   * @returns {Promise<WorkflowContextVersion[]>} A promise that resolves to an array of Node.js image versions
   */
  public async getVersions(): Promise<WorkflowContextVersion[]> {
    const versionScheduleData: NodeVersionScheduleData = await new VersionScheduleDataFetcher<NodeVersionScheduleData>(
      this.versionScheduleDataUrl,
    ).getVersionScheduleData();
    const now: Date = new Date();

    return (await this.getAllVersions()).filter((version: WorkflowContextVersion): boolean => {
      if (version.version === 'latest') {
        return true;
      }

      const versionSchedule: NodeVersionSchedule = versionScheduleData[`v${semver.major(version.version)}`];

      return versionSchedule?.lts !== undefined && versionSchedule?.end !== undefined
        ? now >= new Date(versionSchedule.lts) && now < new Date(versionSchedule.end)
        : false;
    });
  }

  /**
   * Processes the Node.js image versions to extract Node.js version information.
   *
   * This method processes the fetched Node.js image versions to extract relevant information such as the version,
   * image version, image name, and image code name.
   *
   * @param {GithubPackageVersion[]} packageVersions - The Node.js image versions to process
   *
   * @returns {Omit<WorkflowContextRegularVersion, 'is-latest'>[]} An array of Node.js image versions, excluding the
   *   'is-latest' property
   */
  protected processPackageVersions(
    packageVersions: GithubPackageVersion[],
  ): Omit<WorkflowContextRegularVersion, 'is-latest'>[] {
    const processedVersions: Map<number, Omit<WorkflowContextRegularVersion, 'is-latest'>> = new Map();

    packageVersions.forEach((packageVersion: GithubPackageVersion): void => {
      const [, nodeVersion, nodeLts]: (string | undefined)[] =
        packageVersion.description?.match(/^Node (\d+\.\d+\.\d+) LTS \(([A-Z][a-z]+)\)/i) ?? [];

      if (semver.valid(nodeVersion) === null || nodeLts === undefined) {
        return;
      }

      const majorVersion: number = semver.major(nodeVersion);
      const storedVersion: string | undefined = processedVersions.get(majorVersion)?.version;

      if (storedVersion !== undefined && semver.lte(nodeVersion, storedVersion)) {
        return;
      }

      processedVersions.set(majorVersion, {
        'version': nodeVersion,
        'image-version': majorVersion.toString(),
        'image-name': `Node ${nodeVersion} LTS (${nodeLts})`,
        'image-code-name': nodeLts.toLowerCase(),
      });
    });

    return Array.from(processedVersions.values());
  }
}
