export interface TableOptions<T> {
  columnMinWidth: number;
  nodeHeight: number;
  visibleNodes: number;

  rowActions?: { callback: (item: T) => void; label: string }[][];
  rowColor?: (item: T) => { backgroundColor?: string; color?: string } | null;
  selectable?: boolean | number;
}

export type ListTableOptions<T> = TableOptions<T>;

export interface TreeTableOptions<T> extends TableOptions<T> {
  childNodeOffset: number;
}
