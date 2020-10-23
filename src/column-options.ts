import { ColumnWidthUnit } from './styles-utils';

export interface ColumnOptions<T> {
  align: 'center' | 'left' | 'right';
  field: keyof T;
  formatter: (field: keyof T, obj: T) => DocumentFragment;
  sortFeature: boolean;
  title: string;
  width?: { value: number; unit: ColumnWidthUnit };
}
