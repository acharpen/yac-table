import { Column } from './column';

export interface TableOptions<T> {
  frozenFirstColumn: boolean;
  nodeHeight: number;
  resizeFeature: boolean;
  visibleNodesCount: number;
  cellColor?: (obj: T, column: Column<T>) => { backgroundColor?: string; color?: string } | undefined;
  rowColor?: (obj: T) => { backgroundColor?: string; color?: string } | undefined;
}

export interface ListTableOptions<T> extends TableOptions<T> {}

export interface TreeTableOptions<T> extends TableOptions<T> {
  childNodeOffset: number;
}
