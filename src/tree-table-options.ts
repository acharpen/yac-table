import { TableOptions } from './table-options';

export interface TreeTableOptions<T> extends TableOptions<T> {
  childNodeOffset: number;
}
