import { WidthUnit } from './styles-utils';

export interface ColumnOptions<T> {
  align: 'center' | 'left' | 'right';
  field: keyof T;
  formatter: (field: keyof T, data: T) => DocumentFragment;
  sortFeature: boolean;
  title: string;
  width?: { value: number; unit: WidthUnit };
}
