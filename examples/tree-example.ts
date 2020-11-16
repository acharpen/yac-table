import { ExampleObject, columnOptions, tableOptions } from './setup';
import { Node } from '../src/node';
import { TreeTable } from '../src/tree-table';
import { treeData } from './data';

const tableContainerElt = document.getElementById('table') as HTMLElement;
const table = new TreeTable<ExampleObject>(tableContainerElt, {
  columnOptions,
  tableOptions: { ...tableOptions, childNodeOffset: 8, expandTogglerColumnIndex: 0 }
});

tableContainerElt.addEventListener('onClickNode', (event: CustomEvent<{ event: Event; node: Node<unknown> }>) => {
  const { node } = event.detail;
  if (node.isSelected) {
    table.deselectNodes([node.id], { withChildren: true, withParents: false });
  } else {
    table.selectNodes([node.id], { withChildren: true, withParents: false });
  }
});

tableContainerElt.addEventListener('onToggleNode', (event: CustomEvent<{ event: Event; node: Node<unknown> }>) => {
  const { node } = event.detail;
  if (node.isExpanded) {
    table.collapseNodes([node.id]);
  } else {
    table.expandNodes([node.id]);
  }
});

table.setData(treeData);
