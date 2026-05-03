const HORIZONTAL_SPACING = 150;
const VERTICAL_SPACING = 80;

function getTreeHeight(node) {
  if (node.children.length === 0) return 0;
  let maxHeight = 0;
  for (const child of node.children) {
    const childHeight = getTreeHeight(child);
    maxHeight = Math.max(maxHeight, childHeight);
  }
  return maxHeight + 1;
}

function getSubtreeWidth(node) {
  if (node.children.length === 0) return node.width;
  
  let childrenWidth = 0;
  for (const child of node.children) {
    childrenWidth += getSubtreeWidth(child);
  }
  childrenWidth += (node.children.length - 1) * VERTICAL_SPACING;
  
  return Math.max(node.width, childrenWidth);
}

function calculatePositions(node, x, y, level, siblingOffset) {
  node.x = x;
  node.y = y;
  
  if (node.children.length === 0) return 0;
  
  const totalChildrenWidth = node.children.reduce((sum, child) => {
    return sum + getSubtreeWidth(child);
  }, 0) + (node.children.length - 1) * VERTICAL_SPACING;
  
  let currentY = y - totalChildrenWidth / 2;
  
  for (const child of node.children) {
    const childWidth = getSubtreeWidth(child);
    const childCenterY = currentY + childWidth / 2;
    
    calculatePositions(
      child,
      x + HORIZONTAL_SPACING,
      childCenterY,
      level + 1,
      0
    );
    
    currentY += childWidth + VERTICAL_SPACING;
  }
  
  return totalChildrenWidth;
}

export function layoutTree(root, centerX = 400, centerY = 300) {
  const tree = JSON.parse(JSON.stringify(root));
  calculatePositions(tree, centerX, centerY, 0, 0);
  return tree;
}

export function getNodeBounds(node) {
  return {
    x: node.x - node.width / 2,
    y: node.y - node.height / 2,
    width: node.width,
    height: node.height
  };
}
