export interface TableOptions<T> {
  frozenFirstColumn: boolean;
  nodeHeight: number;
  resizeFeature: boolean;
  visibleNodesCount: number;
  callbacks?: { [id: string]: (obj: T) => void };
}

export interface ListTableOptions<T> extends TableOptions<T> {}

export interface TreeTableOptions<T> extends TableOptions<T> {
  childNodeOffset: number;
}
