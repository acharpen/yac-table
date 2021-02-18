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
    resize: true,
    sort: true,
    title: 'col1',
    stick: 'left',
    width: { value: 400, unit: 'px' as const }
  },
  {
    align: 'left' as const,
    formatter: defaultFormatter('col2'),
    id: 2,
    resize: true,
    sort: true,
    title: 'col2',
    stick: 'left',
    width: { value: 600, unit: 'px' as const }
  },
  {
    align: 'left' as const,
    formatter: defaultFormatter('col3'),
    id: 3,
    resize: true,
    sort: true,
    title: 'col3',
    width: { value: 400, unit: 'px' as const }
  },
  {
    align: 'left' as const,
    formatter: defaultFormatter('col4'),
    id: 4,
    resize: true,
    sort: true,
    title: 'col4',
    stick: 'right',
    width: { value: 200, unit: 'px' as const }
  }
];

export const tableOptions = { frozenColumns: 1, columnMinWidth: 40, nodeHeight: 40, visibleNodes: 10 };
