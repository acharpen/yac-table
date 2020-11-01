export interface TableOptions<T> {
  frozenFirstColumn: boolean;
  nodeHeight: number;
  resizeFeature: boolean;
  visibleNodesCount: number;
  cellColor?: (obj: T, columnField: keyof T) => { backgroundColor?: string; color?: string } | null;
  rowColor?: (obj: T) => { backgroundColor?: string; color?: string } | null;
}

export type ListTableOptions<T> = TableOptions<T>;

export interface TreeTableOptions<T> extends TableOptions<T> {
  childNodeOffset: number;
}
