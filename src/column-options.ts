import { WidthUnit } from './styles-utils';

export interface ColumnOptions<T> {
  align: 'center' | 'left' | 'right';
  field: string;
  formatter: (field: string, data: T) => DocumentFragment;
  sortFeature: boolean;
  title: string;
  width?: { value: number; unit: WidthUnit };
}
