// tslint:disable

import { Node } from '../src/node';
import { ListTable } from '../src/list-table';
import { TreeTable } from '../src/tree-table';

type DataType = { col1: string; col2: string; col3: string; col4: string };

const defaultTableOptions = {
  frozenFirstColumn: true,
  nodeHeight: 40,
  resizeFeature: true,
  visibleNodesCount: 10
};

const col1CellFormatter = (_columnField: keyof DataType, _value: DataType) => {
  const fragment = document.createDocumentFragment();
  const elt = document.createElement('a');
  elt.textContent = 'Test';

  fragment.appendChild(elt);

  return fragment;
};

const defaultCellFormatter = (columnField: keyof DataType, value: DataType) => {
  const fragment = document.createDocumentFragment();
  fragment.textContent = value[columnField];

  return fragment;
};

const columnOptions = [
  {
    align: 'left' as const,
    field: 'col1' as const,
    formatter: col1CellFormatter,
    sortFeature: true,
    title: 'col1'
  },
  {
    align: 'left' as const,
    field: 'col2' as const,
    formatter: defaultCellFormatter,
    sortFeature: true,
    title: 'col2',
    width: { value: 10, unit: '%' as const }
  },
  {
    align: 'right' as const,
    field: 'col3' as const,
    formatter: defaultCellFormatter,
    sortFeature: true,
    title: 'col3'
  },
  {
    align: 'left' as const,
    field: 'col4' as const,
    formatter: defaultCellFormatter,
    sortFeature: true,
    title: 'col4'
  }
];

const tableContainerElt = document.getElementById('table');

// List ///////////////////////////////////////////////////////////////////////

// const table = new ListTable(tableContainerElt, {
//   columnOptions,
//   tableOptions: { ...defaultTableOptions }
// });

// const listData = [...Array(1e5).keys()].map((i) => {
//   return { col1: `value${i}1`, col2: `value${i}2`, col3: `value${i}3`, col4: `value${i}4` };
// });

// table.setData(listData);

// Tree ///////////////////////////////////////////////////////////////////////

const table = new TreeTable(tableContainerElt, {
  columnOptions,
  tableOptions: { ...defaultTableOptions, childNodeOffset: 8 }
});

tableContainerElt.addEventListener('onToggleNode', (event: CustomEvent<{ event: Event; node: Node<unknown> }>) => {
  const node = event.detail.node;
  if (node.isExpanded) {
    table.collapseNodes([node.id]);
  } else {
    table.expandNodes([node.id]);
  }
});

const treeData = [...Array(1e5).keys()].map((i) => {
  return {
    value: {
      col1: `value${i}1`,
      col2: `value${i}2`,
      col3: `value${i}3`,
      col4: `value${i}4`
    },
    children: [
      {
        value: {
          col1: `childvalue${i}11`,
          col2: `childvalue${i}12`,
          col3: `childvalue${i}13`,
          col4: `childvalue${i}14`
        },
        children: [
          {
            value: {
              col1: `childchildvalue${i}11`,
              col2: `childchildvalue${i}12`,
              col3: `childchildvalue${i}13`,
              col4: `childchildvalue${i}14`
            },
            children: []
          }
        ]
      },
      {
        value: {
          col1: `childvalue${i}21`,
          col2: `childvalue${i}22`,
          col3: `childvalue${i}23`,
          col4: `childvalue${i}24`
        },
        children: []
      }
    ]
  };
});

table.setData(treeData);

// ////////////////////////////////////////////////////////////////////////////

tableContainerElt.addEventListener('onClickNode', (event: CustomEvent<{ event: Event; node: Node<unknown> }>) => {
  const node = event.detail.node;
  if (node.isSelected) {
    table.deselectNodes([node.id]);
  } else {
    table.selectNodes([node.id]);
  }
});
