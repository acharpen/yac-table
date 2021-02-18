import { ExampleObject, columnOptions, tableOptions } from '../setup';
import { TreeNodeView } from '../../src/node';
import { TreeTable } from '../../src/tree-table';

const treeData = [...Array(1e5).keys()].map((i) => ({
  children: [
    {
      children: [
        {
          children: [],
          value: {
            col1: `childchildvalue${i}11`,
            col2: `childchildvalue${i}12`,
            col3: `childchildvalue${i}13`,
            col4: `childchildvalue${i}14`
          }
        }
      ],
      value: {
        col1: `childvalue${i}11`,
        col2: `childvalue${i}12`,
        col3: `childvalue${i}13`,
        col4: `childvalue${i}14`
      }
    },
    {
      children: [],
      value: {
        col1: `childvalue${i}21`,
        col2: `childvalue${i}22`,
        col3: `childvalue${i}23`,
        col4: `childvalue${i}24`
      }
    }
  ],
  value: {
    col1: `value${i}1`,
    col2: `value${i}2`,
    col3: `value${i}3`,
    col4: `value${i}4`
  }
}));

const tableContainerElt = document.getElementById('table-container') as HTMLElement;
const table = new TreeTable<ExampleObject>(tableContainerElt, {
  columnOptions,
  tableOptions: { ...tableOptions, childNodeOffset: 8, expandTogglerColumnIndex: 0 }
});

// tableContainerElt.addEventListener('onClickNode', (event) => {
//   const { node } = (event as CustomEvent<{ node: TreeNodeView<ExampleObject> }>).detail;
//   if (node.isSelected) {
//     table.deselectNodes([node.id], { withChildren: true, withParents: false });
//   } else {
//     table.selectNodes([node.id], { withChildren: true, withParents: false });
//   }
// });

// tableContainerElt.addEventListener('onToggleNode', (event) => {
//   const { node } = (event as CustomEvent<{ node: TreeNodeView<ExampleObject> }>).detail;
//   if (node.isExpanded) {
//     table.collapseNodes([node.id]);
//   } else {
//     table.expandNodes([node.id]);
//   }
// });

// table.setData(treeData);
