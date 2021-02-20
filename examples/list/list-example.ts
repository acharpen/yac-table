import { ExampleObject, columnOptions, tableOptions } from '../setup';
import { ListNodeView } from '../../src/node';
import { ListTable } from '../../src/list-table';

const listData = [...Array(20).keys()].map((i) => ({
  col1: `value${i}1`,
  col2: `value${i}2`,
  col3: `value${i}3`,
  col4: `value${i}4`
}));

const tableContainerElt = document.getElementById('table-container') as HTMLElement;
const table = new ListTable<ExampleObject>(tableContainerElt, { columnOptions, tableOptions });

// tableContainerElt.addEventListener('onClickNode', (event) => {
//   const { node } = (event as CustomEvent<{ node: ListNodeView<ExampleObject> }>).detail;
//   if (node.isSelected) {
//     table.deselectNodes([node.id]);
//   } else {
//     table.selectNodes([node.id]);
//   }
// });

table.setData(listData);
