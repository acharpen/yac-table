export interface ExampleObject {
  col1: string;
  col2: string;
  col3: string;
  col4: string;
}

// ////////////////////////////////////////////////////////////////////////////

export const defaultFormatter = (field: keyof ExampleObject): ((obj: ExampleObject) => [DocumentFragment]) => {
  return (obj: ExampleObject): [DocumentFragment] => {
    const fragment = document.createDocumentFragment();
    fragment.textContent = obj[field];

    return [fragment];
  };
};

export const linkFormatter = (field: keyof ExampleObject): ((obj: ExampleObject) => [DocumentFragment]) => {
  return (obj: ExampleObject): [DocumentFragment] => {
    const fragment = document.createDocumentFragment();

    const elt = document.createElement('a');
    elt.textContent = obj[field];
    fragment.appendChild(elt);

    return [fragment];
  };
};

// ////////////////////////////////////////////////////////////////////////////

export const columnOptions = [
  {
    align: 'left' as const,
    formatter: linkFormatter('col1'),
    id: 1,
    resizeFeature: true,
    sortFeature: true,
    title: 'col1'
  },
  {
    align: 'left' as const,
    formatter: defaultFormatter('col2'),
    id: 2,
    resizeFeature: true,
    sortFeature: true,
    title: 'col2',
    width: { value: 10, unit: '%' as const }
  },
  {
    align: 'right' as const,
    formatter: defaultFormatter('col3'),
    id: 3,
    resizeFeature: true,
    sortFeature: true,
    title: 'col3'
  },
  {
    align: 'left' as const,
    formatter: defaultFormatter('col4'),
    id: 4,
    resizeFeature: true,
    sortFeature: true,
    title: 'col4'
  }
];

export const tableOptions = { frozenColumns: 1, nodeHeight: 40, visibleNodes: 10 };
