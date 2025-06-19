export type NodeVersion = {
  version: string;
  date: string;
  files: string[];
  npm?: string;
  v8: string;
  uv?: string;
  zlib?: string;
  openssl?: string;
  modules?: string;
  lts: boolean | string;
  security: boolean;
};
