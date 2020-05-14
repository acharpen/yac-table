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

export type ListNodeView<T> = Pick<Node<T>, 'id' | 'value' | 'isSelected'>;
export type TreeNodeView<T> = Pick<Node<T>, 'id' | 'value' | 'isSelected' | 'isExpanded'>;
