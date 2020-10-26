/* eslint-disable @typescript-eslint/no-unsafe-call */

import { TestObject, defaultFormatter } from './setup';
import { ListTable } from '../list-table';
import { getByText } from '@testing-library/dom';

const columnOptions = [
  { align: 'left' as const, field: 'col1' as const, formatter: defaultFormatter, sortFeature: true, title: 'col1' },
  { align: 'left' as const, field: 'col2' as const, formatter: defaultFormatter, sortFeature: true, title: 'col2' }
];
const tableOptions = { frozenFirstColumn: true, nodeHeight: 40, resizeFeature: true, visibleNodesCount: 10 };

const table = new ListTable<TestObject>(document.body, { columnOptions, tableOptions });

// ////////////////////////////////////////////////////////////////////////////

describe('checking initialization', () => {
  test('table is empty', () => {
    expect(table.getNodes()).toHaveLength(0);
  });

  test('table header is correct', () => {
    expect(getByText(document.body, 'col1')).toBeTruthy();
    expect(getByText(document.body, 'col2')).toBeTruthy();
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
    expect(table.getNodes()).toHaveLength(2);
  });
});

describe('checking addData', () => {
  beforeEach(() => {
    table.addData({ col1: 'value21', col2: 'value22' }, { position: 'top' });
  });

  test('table has 3 nodes', () => {
    expect(table.getNodes()).toHaveLength(3);
  });
});

describe('checking deleteNodes', () => {
  beforeEach(() => {
    table.deleteNodes([0]);
  });

  test('table has 2 nodes', () => {
    expect(table.getNodes()).toHaveLength(2);
  });
});
