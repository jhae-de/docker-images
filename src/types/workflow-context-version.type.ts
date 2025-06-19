export type WorkflowContextRegularVersion = {
  'version': string;
  'image-version': string;
  'image-name': string;
  'image-code-name'?: string;
  'is-latest': boolean;
};

export type WorkflowContextLatestVersion = {
  'version': 'latest';
  'image-version': 'latest';
  'is-latest': true;
};

export type WorkflowContextVersion = WorkflowContextRegularVersion | WorkflowContextLatestVersion;
