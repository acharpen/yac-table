import { ColumnWidthUnit } from './column-utils';

export interface ColumnOptions<T> {
  align: 'center' | 'left' | 'right';
  formatter: (item: T) => DocumentFragment;
  id: number;
  isResizable: boolean;
  isSortable: boolean;
  title: string;
  cellColor?: (item: T) => { backgroundColor?: string; color?: string } | null;
  classList?: string[];
  width?: { value: number; unit: ColumnWidthUnit };
}
