export interface Node<T> {
  id: number;
  isExpanded: boolean;
  isFiltered: boolean;
  isHidden: boolean;
  isLeaf: boolean;
  isSelected: boolean;
  level: number;
  value: T;
}

export type NodeView<T> = Pick<Node<T>, 'id' | 'isExpanded' | 'isSelected' | 'value'>;

export interface TreeNode<T> {
  value: T;
  children: TreeNode<T>[];
}
