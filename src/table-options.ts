export interface TableOptions {
  frozenFirstColumn: boolean;
  nodeHeight: number;
  resizeFeature: boolean;
  visibleNodesCount: number;
}

export interface ListTableOptions extends TableOptions {}

export interface TreeTableOptions extends TableOptions {
  childNodeOffset: number;
}
