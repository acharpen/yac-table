import { Node } from '../src/node';
import { TreeTable } from '../src/tree-table';

import { treeData } from './data';
import { ExampleObject, columnOptions, tableOptions } from './setup';

const tableContainerElt = document.getElementById('table') as HTMLElement;

tableContainerElt.addEventListener('onClickNode', (event: CustomEvent<{ event: Event; node: Node<unknown> }>) => {
  const node = event.detail.node;
  if (node.isSelected) {
    table.deselectNodes([node.id]);
  } else {
    table.selectNodes([node.id]);
  }
});

tableContainerElt.addEventListener('onToggleNode', (event: CustomEvent<{ event: Event; node: Node<unknown> }>) => {
  const node = event.detail.node;
  if (node.isExpanded) {
    table.collapseNodes([node.id]);
  } else {
    table.expandNodes([node.id]);
  }
});

const table = new TreeTable<ExampleObject>(tableContainerElt, {
  columnOptions,
  tableOptions: { ...tableOptions, childNodeOffset: 8 }
});

table.setData(treeData);
