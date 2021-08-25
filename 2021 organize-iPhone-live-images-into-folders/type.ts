export interface FileGroup {
  heic?: string;
  jpg?: string;
  mov?: string;
  aae?: string;
  folder: string;
  createDate?: Date;
}

export interface CollectedFiles {
  [name: string]: boolean;
}

export interface ByDate {
  [date: number]: Array<string>;
}
