export interface TestObject {
  col1?: string;
  col2?: string;
  col3?: string;
  col4?: string;
}

// ////////////////////////////////////////////////////////////////////////////

export const defaultFormatter = (field: keyof TestObject): ((obj: TestObject) => [DocumentFragment]) => {
  return (obj: TestObject): [DocumentFragment] => {
    const fragment = document.createDocumentFragment();

    const value = obj[field];
    if (value != null) {
      fragment.textContent = value;
    }

    return [fragment];
  };
};
