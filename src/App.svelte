<script>
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
  
  function createMindMapStore() {
    const rootNode = createNode('中心主题', null);
    const { subscribe, update } = writable(rootNode);

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
      }
    };
  }
  
  const mindMapStore = createMindMapStore();
  
  const flatNodes = derived(mindMapStore, (root) => {
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
  
  const connections = derived(mindMapStore, (root) => {
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
  
  const HORIZONTAL_SPACING = 150;
  const VERTICAL_SPACING = 80;
  
  function getSubtreeWidth(node) {
    if (node.children.length === 0) return node.width;
    
    let childrenWidth = 0;
    for (const child of node.children) {
      childrenWidth += getSubtreeWidth(child);
    }
    childrenWidth += (node.children.length - 1) * VERTICAL_SPACING;
    
    return Math.max(node.width, childrenWidth);
  }
  
  function calculatePositions(node, x, y) {
    node.x = x;
    node.y = y;
    
    if (node.children.length === 0) return;
    
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
        childCenterY
      );
      
      currentY += childWidth + VERTICAL_SPACING;
    }
  }
  
  function layoutTree(root, centerX = 400, centerY = 300) {
    const tree = JSON.parse(JSON.stringify(root));
    calculatePositions(tree, centerX, centerY);
    return tree;
  }
  
  let editingNodeId = null;
  
  let width = 1600;
  let height = 1200;
  
  function findNodeById(node, id) {
    if (node.id === id) return node;
    for (const child of node.children) {
      const found = findNodeById(child, id);
      if (found) return found;
    }
    return null;
  }
  
  function startEditing(nodeId) {
    editingNodeId = nodeId;
  }
  
  function endEditing() {
    editingNodeId = null;
  }
  
  $: layoutedTree = layoutTree($mindMapStore, width / 2, height / 2);
  $: nodes = $flatNodes.map(node => {
    const layoutedNode = findNodeById(layoutedTree, node.id);
    return {
      ...node,
      x: layoutedNode?.x ?? node.x,
      y: layoutedNode?.y ?? node.y
    };
  });
  $: conns = $connections.map(conn => {
    const fromLayouted = findNodeById(layoutedTree, conn.from.id);
    const toLayouted = findNodeById(layoutedTree, conn.to.id);
    return {
      from: { ...conn.from, x: fromLayouted?.x ?? conn.from.x, y: fromLayouted?.y ?? conn.from.y },
      to: { ...conn.to, x: toLayouted?.x ?? conn.to.x, y: toLayouted?.y ?? conn.to.y }
    };
  });
</script>

<main>
  <div class="mind-map-container">
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
    >
      <!-- 背景网格 -->
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" stroke-width="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
      
      <!-- 连接线 -->
      {#each conns as conn}
        {@const fromX = conn.from.x + conn.from.width / 2}
        {@const fromY = conn.from.y}
        {@const toX = conn.to.x - conn.to.width / 2}
        {@const toY = conn.to.y}
        {@const controlOffset = Math.abs(toX - fromX) / 2}
        <path
          d={`M ${fromX} ${fromY} C ${fromX + controlOffset} ${fromY}, ${toX - controlOffset} ${toY}, ${toX} ${toY}`}
          fill="none"
          stroke="#94a3b8"
          stroke-width={2}
          stroke-linecap="round"
        />
      {/each}
      
      <!-- 节点 -->
      {#each nodes as node (node.id)}
        <g transform={`translate(${node.x - node.width / 2}, ${node.y - node.height / 2})`}>
          <!-- 节点背景 -->
          <rect
            class="node-rect"
            width={node.width}
            height={node.height}
            rx={node.isRoot ? 20 : 8}
            ry={node.isRoot ? 20 : 8}
            fill={node.isRoot ? '#6366f1' : '#f1f5f9'}
            stroke={node.isRoot ? '#4f46e5' : '#94a3b8'}
            stroke-width={2}
          />
          
          <!-- 节点文本 -->
          {#if editingNodeId === node.id}
            <foreignObject width={node.width} height={node.height}>
              <div class="edit-container">
                <input
                  bind:value={node.text}
                  class="edit-input"
                  on:keydown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      mindMapStore.updateNodeText(node.id, node.text);
                      endEditing();
                    } else if (e.key === 'Escape') {
                      endEditing();
                    }
                  }}
                  on:blur={() => {
                    mindMapStore.updateNodeText(node.id, node.text);
                    endEditing();
                  }}
                />
              </div>
            </foreignObject>
          {:else}
            <text
              class="node-text"
              x={node.width / 2}
              y={node.height / 2}
              text-anchor="middle"
              dominant-baseline="middle"
              fill={node.isRoot ? 'white' : '#1e293b'}
              font-size={node.isRoot ? 16 : 14}
              font-weight={node.isRoot ? 'bold' : 'normal'}
              on:dblclick={() => startEditing(node.id)}
            >
              {node.text}
            </text>
          {/if}
          
          <!-- 操作按钮 -->
          <g>
            <!-- 添加子节点按钮 -->
            <circle
              class="action-btn"
              cx={node.width + 12}
              cy={node.height / 2}
              r={8}
              fill="#22c55e"
              stroke="#16a34a"
              stroke-width={1.5}
              on:click={() => mindMapStore.addChild(node.id)}
            />
            <text
              x={node.width + 12}
              y={node.height / 2}
              text-anchor="middle"
              dominant-baseline="middle"
              fill="white"
              font-size={14}
              font-weight="bold"
              pointer-events="none"
            >
              +
            </text>
            
            <!-- 删除按钮 (非根节点) -->
            {#if !node.isRoot}
              <circle
                class="action-btn"
                cx={node.width + 12}
                cy={node.height / 2 + 20}
                r={8}
                fill="#ef4444"
                stroke="#dc2626"
                stroke-width={1.5}
                on:click={() => mindMapStore.deleteNode(node.id)}
              />
              <text
                x={node.width + 12}
                y={node.height / 2 + 20}
                text-anchor="middle"
                dominant-baseline="middle"
                fill="white"
                font-size={14}
                font-weight="bold"
                pointer-events="none"
              >
                ×
              </text>
            {/if}
          </g>
        </g>
      {/each}
    </svg>
  </div>
</main>

<style>
  main {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
  }
  
  .mind-map-container {
    width: 100vw;
    height: 100vh;
    overflow: auto;
    background-color: #f8fafc;
  }
  
  svg {
    display: block;
  }
  
  .node-rect {
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .node-rect:hover {
    filter: brightness(1.05);
  }
  
  .node-text {
    cursor: pointer;
    user-select: none;
  }
  
  .edit-container {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    box-sizing: border-box;
  }
  
  .edit-input {
    width: 100%;
    height: 100%;
    border: 2px solid #6366f1;
    border-radius: 6px;
    padding: 0 8px;
    font-size: 14px;
    text-align: center;
    outline: none;
    box-sizing: border-box;
  }
  
  .action-btn {
    cursor: pointer;
    transition: transform 0.15s ease;
  }
  
  .action-btn:hover {
    transform: scale(1.2);
  }
</style>
