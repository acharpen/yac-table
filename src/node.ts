export interface Node<T> {
  id: number;
  isExpanded: boolean;
  isHidden: boolean;
  isLeaf: boolean;
  isMatching: boolean;
  isSelected: boolean;
  level: number;
  value: T;
}

export interface TreeNode<T> {
  value: T;
  children: TreeNode<T>[];
}
