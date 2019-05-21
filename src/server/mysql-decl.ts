export interface ColumnAttr {
  name: string;
  type: string;
  autoInc?: boolean;
  notNull?: boolean;
  primary?: boolean;
  unique?: boolean;
  index?: boolean;
}

export type Columns = Array<ColumnAttr>;
export interface PushRowArgs {
  columns?: Array<string>;
  values: Array<{[key: string]: string}>;
}
