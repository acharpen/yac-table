import { Column } from './column';

export type ColumnView<T> = Pick<Column<T>, 'field' | 'sortMode'>;
