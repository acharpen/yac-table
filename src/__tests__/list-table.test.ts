import { ListTable } from '../list-table';

import { TestObject, defaultFormatter } from './setup';

const columnOptions = [
  { align: 'left' as const, field: 'col1' as const, formatter: defaultFormatter, sortFeature: true, title: 'col1' },
  { align: 'left' as const, field: 'col2' as const, formatter: defaultFormatter, sortFeature: true, title: 'col2' }
];
const tableOptions = { frozenFirstColumn: true, nodeHeight: 40, resizeFeature: true, visibleNodesCount: 10 };

const table = new ListTable<TestObject>(document.body, { columnOptions, tableOptions });

// ////////////////////////////////////////////////////////////////////////////

describe('checking initialization', () => {
  test('table is empty', () => {
    expect(table.getNodes().length).toBe(0);
  });
});

describe('checking setData', () => {
  beforeEach(() => {
    table.setData([
      { col1: 'value01', col2: 'value02' },
      { col1: 'value11', col2: 'value12' }
    ]);
  });

  test('table has 2 nodes', () => {
    expect(table.getNodes().length).toBe(2);
  });
});
