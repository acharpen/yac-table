import { Node } from './node';

export type ListNodeView<T> = Pick<Node<T>, 'id' | 'value' | 'isSelected'>;

export type TreeNodeView<T> = Pick<Node<T>, 'id' | 'value' | 'isSelected' | 'isExpanded'>;
