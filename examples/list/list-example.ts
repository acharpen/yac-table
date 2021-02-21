import { ExampleObject, columnOptions, tableOptions } from '../setup';
import { ListTable } from '../../src/list-table';

const listData = [...Array(1e5).keys()].map((i) => ({
  col1: `value${i}1`,
  col2: `value${i}2`,
  col3: `value${i}3`,
  col4: `value${i}4`
}));

const containerElt = document.getElementById('table-container') as HTMLElement;
const table = new ListTable<ExampleObject>(containerElt, { columnOptions, tableOptions });

table.setData(listData);
