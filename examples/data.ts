export const listData = [...Array(1e5).keys()].map((i) => {
  return { col1: `value${i}1`, col2: `value${i}2`, col3: `value${i}3`, col4: `value${i}4` };
});

export const treeData = [...Array(1e5).keys()].map((i) => {
  return {
    children: [
      {
        children: [
          {
            children: [],
            value: {
              col1: `childchildvalue${i}11`,
              col2: `childchildvalue${i}12`,
              col3: `childchildvalue${i}13`,
              col4: `childchildvalue${i}14`
            }
          }
        ],
        value: {
          col1: `childvalue${i}11`,
          col2: `childvalue${i}12`,
          col3: `childvalue${i}13`,
          col4: `childvalue${i}14`
        }
      },
      {
        children: [],
        value: {
          col1: `childvalue${i}21`,
          col2: `childvalue${i}22`,
          col3: `childvalue${i}23`,
          col4: `childvalue${i}24`
        }
      }
    ],
    value: {
      col1: `value${i}1`,
      col2: `value${i}2`,
      col3: `value${i}3`,
      col4: `value${i}4`
    }
  };
});
