#!/usr/bin/env -S npx tsx

import process from 'node:process';
import { AbstractVersionFetcher, NodeVersionFetcher } from '../src/classes';
import { VersionFetcherType } from '../src/enums';
import type { WorkflowContextVersion } from '../src/types';

type VersionFetcherClass = new () => AbstractVersionFetcher;

const versionFetcherType: VersionFetcherType = process.argv[2] as VersionFetcherType;

if (!versionFetcherType) {
  console.error(`Usage: ./bin/fetch-versions.ts <${Object.values(VersionFetcherType).join('|')}>`);
  process.exit(1);
}

const VersionFetcher: VersionFetcherClass = {
  [VersionFetcherType.Node]: NodeVersionFetcher,
}[versionFetcherType];

if (!VersionFetcher) {
  console.error(`Unsupported version fetcher type: ${versionFetcherType}`);
  console.log(`Supported types:\n- ${Object.values(VersionFetcherType).join('\n- ')}`);
  process.exit(1);
}

try {
  const versions: WorkflowContextVersion[] = await new VersionFetcher().getVersions();
  console.log(JSON.stringify(versions, null, 2));
} catch (error: unknown) {
  console.error('Error fetching versions:', (error as Error).message);
  process.exit(1);
}
