export interface ExampleObject {
  col1: string;
  col2: string;
  col3: string;
  col4: string;
}

// ////////////////////////////////////////////////////////////////////////////

export const defaultFormatter = (field: keyof ExampleObject, obj: ExampleObject): DocumentFragment => {
  const fragment = document.createDocumentFragment();
  fragment.textContent = obj[field];

  return fragment;
};

export const linkFormatter = (field: keyof ExampleObject, obj: ExampleObject): DocumentFragment => {
  const fragment = document.createDocumentFragment();
  const elt = document.createElement('a');
  elt.textContent = obj[field];

  fragment.appendChild(elt);

  return fragment;
};

// ////////////////////////////////////////////////////////////////////////////

export const columnOptions = [
  {
    align: 'left' as const,
    field: 'col1' as const,
    formatter: linkFormatter,
    sortFeature: true,
    title: 'col1'
  },
  {
    align: 'left' as const,
    field: 'col2' as const,
    formatter: defaultFormatter,
    sortFeature: true,
    title: 'col2',
    width: { value: 10, unit: '%' as const }
  },
  {
    align: 'right' as const,
    field: 'col3' as const,
    formatter: defaultFormatter,
    sortFeature: true,
    title: 'col3'
  },
  {
    align: 'left' as const,
    field: 'col4' as const,
    formatter: defaultFormatter,
    sortFeature: true,
    title: 'col4'
  }
];

export const tableOptions = { frozenFirstColumn: true, nodeHeight: 40, resizeFeature: true, visibleNodesCount: 10 };
