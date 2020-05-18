// tslint:disable

import { Node } from '../src/node';
import { ListTable, TreeTable } from '../src/table';

const defaultTableOptions = {
  frozenFirstColumn: true,
  nodeHeight: 40,
  resizeFeature: true,
  visibleNodesCount: 10
};

const defaultCellFormatter = (
  columnField: string,
  value: { col1: string; col2: string; col3: string; col4: string }
) => {
  const fragment = document.createDocumentFragment();
  fragment.textContent = value[columnField];

  return fragment;
};

const col1CellFormatter = (
  _columnField: string,
  _value: { col1: string; col2: string; col3: string; col4: string }
) => {
  const fragment = document.createDocumentFragment();
  const aElt = document.createElement('a');
  aElt.textContent = 'Test';
  aElt.id = 'link-test';

  fragment.appendChild(aElt);

  return fragment;
};

const columnOptions = [
  {
    align: 'left' as const,
    field: 'col1',
    formatter: col1CellFormatter,
    sortFeature: true,
    title: 'col1'
  },
  {
    align: 'left' as const,
    field: 'col2',
    formatter: defaultCellFormatter,
    sortFeature: true,
    title: 'col2',
    width: { value: 10, unit: '%' as const }
  },
  {
    align: 'right' as const,
    field: 'col3',
    formatter: defaultCellFormatter,
    sortFeature: true,
    title: 'col3'
  },
  {
    align: 'left' as const,
    field: 'col4',
    formatter: defaultCellFormatter,
    sortFeature: true,
    title: 'col4'
  }
];

const callbacks = {
  'link-test': (value: { col1: string; col2: string; col3: string; col4: string }) => {
    console.log(`Cell: ${value.col1}`);
  }
};

const tableContainerElt = document.getElementById('table');

// List ///////////////////////////////////////////////////////////////////////

// const table = new ListTable(tableContainerElt, {
//   columnOptions,
//   tableOptions: { ...defaultTableOptions, callbacks }
// });

// const listData = [...Array(1e5).keys()].map((i) => {
//   return { col1: `value${i}1`, col2: `value${i}2`, col3: `value${i}3`, col4: `value${i}4` };
// });

// table.setData(listData);

// Tree ///////////////////////////////////////////////////////////////////////

const table = new TreeTable(tableContainerElt, {
  columnOptions,
  tableOptions: { ...defaultTableOptions, callbacks, childNodeOffset: 8 }
});

tableContainerElt.addEventListener('onToggleNode', (event: CustomEvent<{ event: Event; node: Node<unknown> }>) => {
  const node = event.detail.node;
  if (node.isExpanded) {
    table.collapseNodes(node.id);
  } else {
    table.expandNodes(node.id);
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
    table.deselectNodes(node.id);
  } else {
    table.selectNodes(node.id);
  }
});
