export interface TestObject {
  col1?: string;
  col2?: string;
  col3?: string;
  col4?: string;
}

// ////////////////////////////////////////////////////////////////////////////

export const defaultFormatter = (field: keyof TestObject, obj: TestObject): DocumentFragment => {
  const fragment = document.createDocumentFragment();

  const value = obj[field];
  if (value) {
    fragment.textContent = value;
  }

  return fragment;
};

export const linkFormatter = (field: keyof TestObject, obj: TestObject): DocumentFragment => {
  const fragment = document.createDocumentFragment();

  const value = obj[field];
  if (value) {
    const elt = document.createElement('a');
    elt.textContent = value;
    fragment.appendChild(elt);
  }

  return fragment;
};
