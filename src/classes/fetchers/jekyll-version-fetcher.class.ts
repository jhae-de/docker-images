import { inject, injectable } from 'tsyringe';
import type { NodeVersion, WorkflowContextRegularVersion, WorkflowContextVersion } from '../../types';
import { AbstractVersionFetcher } from '../abstract/abstract-version-fetcher.class';
import { JekyllVersionValidator } from '../validators/jekyll-version-validator.class';

@injectable()
export class JekyllVersionFetcher extends AbstractVersionFetcher<NodeVersion> {
  /**
   * The URL to fetch Jekyll version data from
   *
   * This URL points to the GitHub API endpoint for the Jekyll releases, which contains information about all Jekyll
   * versions. It is used to retrieve the version data for processing.
   *
   * @type {string}
   */
  protected readonly versionDataUrl: string = 'https://api.github.com/repos/jekyll/jekyll/releases';

  /**
   * Creates a new `JekyllVersionFetcher` instance.
   *
   * @param {JekyllVersionValidator} versionValidator - An instance of the `JekyllVersionValidator` to validate versions
   */
  public constructor(@inject(JekyllVersionValidator) protected readonly versionValidator: JekyllVersionValidator) {
    super(versionValidator);
  }

  public getVersion(version: string): Promise<WorkflowContextRegularVersion> {
    throw new Error('Method not implemented.');
  }

  public getVersions(): Promise<WorkflowContextVersion[]> {
    throw new Error('Method not implemented.');
  }
}
