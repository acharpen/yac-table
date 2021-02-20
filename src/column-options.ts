import { ColumnWidthUnit } from './table-utils';

export interface ColumnOptions<T> {
  align: 'center' | 'left' | 'right';
  formatter: (item: T) => DocumentFragment;
  id: number;

  cellColor?: (item: T) => { backgroundColor?: string; color?: string } | null;
  classList?: string[];
  resizable?: boolean;
  sorter?: (a: T, b: T) => number;
  sticky?: 'left' | 'right';
  title?: string;
  width?: { value: number; unit: ColumnWidthUnit };
}
