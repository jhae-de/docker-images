#!/usr/bin/env -S npx tsx

import 'reflect-metadata';
import process from 'node:process';
import { container } from 'tsyringe';
import { AbstractImageVersionFetcher, AbstractVersionValidator, NodeImageVersionFetcher } from '../src/classes';
import { VersionFetcherType } from '../src/enums';
import type { WorkflowContextRegularVersion, WorkflowContextVersion } from '../src/types';

type VersionFetcherClass = new (versionValidator: AbstractVersionValidator) => AbstractImageVersionFetcher;

const versionFetcherType: VersionFetcherType | undefined = process.argv[2] as VersionFetcherType | undefined;
const version: string | undefined = process.argv[3];

if (versionFetcherType === undefined) {
  console.error('Missing version fetcher type argument.');
  console.info(`Usage: fetch-image-versions.ts <${Object.values(VersionFetcherType).join('|')}> [version]`);
  process.exit(1);
}

const VersionFetcher: VersionFetcherClass | undefined = {
  [VersionFetcherType.Node]: NodeImageVersionFetcher,
}[versionFetcherType];

if (VersionFetcher === undefined) {
  console.error(`Unsupported image version fetcher type: ${versionFetcherType}`);
  console.info(`Supported types:\n- ${Object.values(VersionFetcherType).join('\n- ')}`);
  process.exit(1);
}

try {
  const versionFetcher: AbstractImageVersionFetcher = container.resolve(VersionFetcher);
  const result: WorkflowContextRegularVersion | WorkflowContextVersion[] =
    version !== undefined ? await versionFetcher.getVersion(version) : await versionFetcher.getVersions();

  console.log(JSON.stringify(result, null, 2));
} catch (error: unknown) {
  console.error(version !== undefined ? 'Error fetching image version.' : 'Error fetching image versions.');
  console.error((error as Error).message);
  process.exit(1);
}
