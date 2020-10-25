import { Column } from './column';

export interface TableOptions<T> {
  frozenFirstColumn: boolean;
  nodeHeight: number;
  resizeFeature: boolean;
  visibleNodesCount: number;
  cellColor?: (obj: T, column: Column<T>) => { backgroundColor?: string; color?: string } | undefined;
  rowColor?: (obj: T) => { backgroundColor?: string; color?: string } | undefined;
}
