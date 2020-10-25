import { ColumnOptions } from './column-options';
import { ColumnSortMode } from './column-utils';

export interface Column<T> extends ColumnOptions<T> {
  id: number;
  sortMode: ColumnSortMode;
}

export type ColumnView<T> = Pick<Column<T>, 'field' | 'sortMode'>;
