import { ColumnWidthUnit } from './column-utils';

export interface ColumnOptions<T> {
  align: 'center' | 'left' | 'right';
  field: keyof T;
  formatter: (field: keyof T, item: T) => [fragment: DocumentFragment, ...cleanupFuncs: (() => void)[]];
  resizeFeature: boolean;
  sortFeature: boolean;
  title: string;
  width?: { value: number; unit: ColumnWidthUnit };
}
