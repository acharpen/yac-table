import { ColumnOptions } from './column-options';
import { SortMode } from './sort-utils';

export interface Column<T> extends ColumnOptions<T> {
  id: number;
  sortMode: SortMode;
}
