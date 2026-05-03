import { writable, derived } from 'svelte/store';

let nodeIdCounter = 0;

function createNode(text, parentId = null) {
  return {
    id: `node-${nodeIdCounter++}`,
    text,
    parentId,
    children: [],
    x: 0,
    y: 0,
    width: 120,
    height: 40,
    isRoot: parentId === null
  };
}

function createMindMapStore() {
  const rootNode = createNode('中心主题', null);
  const { subscribe, update, set } = writable(rootNode);

  function findNode(node, id) {
    if (node.id === id) return node;
    for (const child of node.children) {
      const found = findNode(child, id);
      if (found) return found;
    }
    return null;
  }

  function findParentNode(node, targetId, parent = null) {
    if (node.id === targetId) return parent;
    for (const child of node.children) {
      const found = findParentNode(child, targetId, node);
      if (found !== undefined) return found;
    }
    return undefined;
  }

  return {
    subscribe,
    addChild: (parentId, text = '新节点') => {
      update(root => {
        const parent = findNode(root, parentId);
        if (parent) {
          const newNode = createNode(text, parentId);
          parent.children.push(newNode);
        }
        return JSON.parse(JSON.stringify(root));
      });
    },
    deleteNode: (nodeId) => {
      update(root => {
        if (root.id === nodeId) return root;
        const parent = findParentNode(root, nodeId);
        if (parent) {
          parent.children = parent.children.filter(child => child.id !== nodeId);
        }
        return JSON.parse(JSON.stringify(root));
      });
    },
    updateNodeText: (nodeId, newText) => {
      update(root => {
        const node = findNode(root, nodeId);
        if (node) {
          node.text = newText;
        }
        return JSON.parse(JSON.stringify(root));
      });
    },
    updateNodePosition: (nodeId, x, y) => {
      update(root => {
        const node = findNode(root, nodeId);
        if (node) {
          node.x = x;
          node.y = y;
        }
        return JSON.parse(JSON.stringify(root));
      });
    },
    updateNodeSize: (nodeId, width, height) => {
      update(root => {
        const node = findNode(root, nodeId);
        if (node) {
          node.width = width;
          node.height = height;
        }
        return JSON.parse(JSON.stringify(root));
      });
    }
  };
}

export const mindMapStore = createMindMapStore();

export const flatNodes = derived(mindMapStore, (root) => {
  const nodes = [];
  function traverse(node) {
    nodes.push(node);
    for (const child of node.children) {
      traverse(child);
    }
  }
  traverse(root);
  return nodes;
});

export const connections = derived(mindMapStore, (root) => {
  const conns = [];
  function traverse(node) {
    for (const child of node.children) {
      conns.push({
        from: node,
        to: child
      });
      traverse(child);
    }
  }
  traverse(root);
  return conns;
});
