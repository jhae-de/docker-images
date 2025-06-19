export type NodeVersionSchedule = {
  start: string;
  lts?: string;
  maintenance?: string;
  end: string;
  codename?: string;
};

export type NodeVersionScheduleData = {
  [version: string]: NodeVersionSchedule;
};
