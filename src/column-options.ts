import { ColumnWidthUnit } from './table-utils';

export interface ColumnOptions<T> {
  align: 'center' | 'left' | 'right';
  formatter: (item: T) => DocumentFragment;
  id: number;
  order: number;

  cellColor?: (item: T) => { backgroundColor?: string; color?: string } | null;
  classList?: string[];
  pinned?: 'left' | 'right';
  resizable?: boolean;
  sorter?: (a: T, b: T) => number;
  title?: string;
  width?: { value: number; unit: ColumnWidthUnit };
}
