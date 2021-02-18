import { ColumnWidthUnit } from './column-utils';

export interface ColumnOptions<T> {
  align: 'center' | 'left' | 'right';
  formatter: (item: T) => DocumentFragment;
  id: number;

  cellColor?: (item: T) => { backgroundColor?: string; color?: string } | null;
  classList?: string[];
  resize?: boolean;
  sort?: boolean;
  stick?: 'left' | 'right';
  title?: string;
  width?: { value: number; unit: ColumnWidthUnit };
}
