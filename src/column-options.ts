import { ColumnWidthUnit } from './column-utils';

export interface ColumnOptions<T> {
  align: 'center' | 'left' | 'right';
  field: keyof T;
  formatter: (field: keyof T, item: T) => DocumentFragment;
  resizeFeature: boolean;
  sortFeature: boolean;
  title: string;
  width?: { value: number; unit: ColumnWidthUnit };
}
