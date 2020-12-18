import { ExampleObject, columnOptions, tableOptions } from './setup';
import { ListTable } from '../src/list-table';
import { Node } from '../src/node';

const listData = [...Array(1e5).keys()].map((i) => ({
  col1: `value${i}1`,
  col2: `value${i}2`,
  col3: `value${i}3`,
  col4: `value${i}4`
}));

const tableContainerElt = document.getElementById('table') as HTMLElement;
const table = new ListTable<ExampleObject>(tableContainerElt, { columnOptions, tableOptions });

tableContainerElt.addEventListener('onClickNode', (event: CustomEvent<{ event: Event; node: Node<unknown> }>) => {
  const { node } = event.detail;
  if (node.isSelected) {
    table.deselectNodes([node.id]);
  } else {
    table.selectNodes([node.id]);
  }
});

table.setData(listData);
