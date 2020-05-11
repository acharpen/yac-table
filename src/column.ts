import { ColumnOptions } from './column-options';
import { SortMode } from './sort-utils';

export interface Column<T> extends ColumnOptions<T> {
  sortMode: SortMode;
}

export type ColumnView<T> = Pick<Column<T>, 'field' | 'sortMode'>;
