export interface TableOptions<T> {
  frozenColumns: number;
  nodeHeight: number;
  visibleNodesCount: number;
  cellColor?: (item: T, columnId: number) => { backgroundColor?: string; color?: string } | null;
  rowColor?: (item: T) => { backgroundColor?: string; color?: string } | null;
}

export type ListTableOptions<T> = TableOptions<T>;

export interface TreeTableOptions<T> extends TableOptions<T> {
  childNodeOffset: number;
  expandTogglerColumnIndex: number;
}
