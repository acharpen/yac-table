export interface ExampleObject {
  col1: string;
  col2: string;
  col3: string;
  col4: string;
}

// ////////////////////////////////////////////////////////////////////////////

export const defaultFormatter = (field: keyof ExampleObject): ((obj: ExampleObject) => DocumentFragment) => {
  return (obj: ExampleObject): DocumentFragment => {
    const fragment = document.createDocumentFragment();
    fragment.textContent = obj[field];

    return fragment;
  };
};

export const linkFormatter = (field: keyof ExampleObject): ((obj: ExampleObject) => DocumentFragment) => {
  return (obj: ExampleObject): DocumentFragment => {
    const fragment = document.createDocumentFragment();

    const elt = document.createElement('a');
    elt.textContent = obj[field];
    fragment.appendChild(elt);

    return fragment;
  };
};

// ////////////////////////////////////////////////////////////////////////////

export const columnOptions = [
  {
    align: 'left' as const,
    formatter: linkFormatter('col1'),
    id: 1,
    resizable: true,
    sorter: (a: ExampleObject, b: ExampleObject): number => a.col1.localeCompare(b.col1),
    title: 'col1',
    sticky: 'left',
    width: { value: 400, unit: 'px' as const }
  },
  {
    align: 'left' as const,
    formatter: defaultFormatter('col2'),
    id: 2,
    resizable: true,
    sorter: (a: ExampleObject, b: ExampleObject): number => a.col2.localeCompare(b.col2),
    title: 'col2',
    sticky: 'left',
    width: { value: 600, unit: 'px' as const }
  },
  {
    align: 'left' as const,
    formatter: defaultFormatter('col3'),
    id: 3,
    resizable: true,
    sorter: (a: ExampleObject, b: ExampleObject): number => a.col3.localeCompare(b.col3),
    title: 'col3',
    width: { value: 400, unit: 'px' as const }
  },
  {
    align: 'left' as const,
    formatter: defaultFormatter('col4'),
    id: 4,
    resizable: true,
    sorter: (a: ExampleObject, b: ExampleObject): number => a.col4.localeCompare(b.col4),
    title: 'col4',
    sticky: 'right',
    width: { value: 200, unit: 'px' as const }
  }
];

export const tableOptions = {
  frozenColumns: 1,
  columnMinWidth: 40,
  nodeHeight: 40,
  selectable: true,
  visibleNodes: 10
};
