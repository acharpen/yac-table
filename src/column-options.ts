import { ColumnWidthUnit } from './table-utils';

export interface ColumnOptions<T> {
  align: 'center' | 'left' | 'right';
  formatter: (item: T) => DocumentFragment;
  id: number;

  cellColor?: (item: T) => { backgroundColor?: string; color?: string } | null;
  classList?: string[];
  resizable?: boolean;
  sortable?: boolean;
  sticky?: 'left' | 'right';
  title?: string;
  width?: { value: number; unit: ColumnWidthUnit };
}
