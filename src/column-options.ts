import { ColumnWidthUnit } from './column-utils';

export interface ColumnOptions<T> {
  align: 'center' | 'left' | 'right';
  formatter: (item: T) => DocumentFragment;
  id: number;
  resizeFeature: boolean;
  sortFeature: boolean;
  title: string;
  cellColor?: (item: T) => { backgroundColor?: string; color?: string } | null;
  width?: { value: number; unit: ColumnWidthUnit };
}
