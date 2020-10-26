import { ExampleObject, columnOptions, tableOptions } from './setup';
import { ListTable } from '../src/list-table';
import { Node } from '../src/node';
import { listData } from './data';

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
