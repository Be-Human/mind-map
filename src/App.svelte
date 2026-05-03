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
  
  function getAllDescendants(node) {
    const ids = [node.id];
    function traverse(n) {
      for (const child of n.children) {
        ids.push(child.id);
        traverse(child);
      }
    }
    traverse(node);
    return ids;
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
  
  let svgWidth = 3000;
  let svgHeight = 2000;
  
  let scale = 1;
  let panX = 0;
  let panY = 0;
  
  let isPanning = false;
  let panStartX = 0;
  let panStartY = 0;
  let panStartPanX = 0;
  let panStartPanY = 0;
  
  let nodeManualPositions = {};
  
  let isDraggingNode = false;
  let dragNodeId = null;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragStartPositions = {};
  
  let clickCount = 0;
  let clickTimer = null;
  
  function findNodeById(node, id) {
    if (node.id === id) return node;
    for (const child of node.children) {
      const found = findNodeById(child, id);
      if (found) return found;
    }
    return null;
  }
  
  function getNodePosition(nodeId, layoutedNode) {
    if (nodeManualPositions[nodeId] !== undefined) {
      return nodeManualPositions[nodeId];
    }
    return { x: layoutedNode?.x ?? 0, y: layoutedNode?.y ?? 0 };
  }
  
  function setNodePosition(nodeId, x, y) {
    nodeManualPositions = {
      ...nodeManualPositions,
      [nodeId]: { x, y }
    };
  }
  
  function startEditing(nodeId) {
    editingNodeId = nodeId;
  }
  
  function endEditing() {
    editingNodeId = null;
  }
  
  function handleWheel(e) {
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.1, Math.min(3, scale * delta));
    
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const svgMouseX = (mouseX - panX) / scale;
    const svgMouseY = (mouseY - panY) / scale;
    
    panX = mouseX - svgMouseX * newScale;
    panY = mouseY - svgMouseY * newScale;
    scale = newScale;
  }
  
  function handleCanvasMouseDown(e) {
    const target = e.target;
    
    if (target.classList.contains('action-btn-hit')) {
      return;
    }
    
    const nodeGroup = target.closest('[data-node-id]');
    if (nodeGroup) {
      const nodeId = nodeGroup.getAttribute('data-node-id');
      handleNodeMouseDown(e, nodeId);
      return;
    }
    
    isPanning = true;
    panStartX = e.clientX;
    panStartY = e.clientY;
    panStartPanX = panX;
    panStartPanY = panY;
    
    window.addEventListener('mousemove', handlePanMove);
    window.addEventListener('mouseup', handlePanEnd);
  }
  
  function handlePanMove(e) {
    if (!isPanning) return;
    
    panX = panStartPanX + (e.clientX - panStartX);
    panY = panStartPanY + (e.clientY - panStartY);
  }
  
  function handlePanEnd() {
    isPanning = false;
    window.removeEventListener('mousemove', handlePanMove);
    window.removeEventListener('mouseup', handlePanEnd);
  }
  
  function handleNodeMouseDown(e, nodeId) {
    e.preventDefault();
    e.stopPropagation();
    
    if (editingNodeId === nodeId) {
      return;
    }
    
    clickCount++;
    
    if (clickCount === 1) {
      clickTimer = setTimeout(() => {
        if (clickCount === 1 && !isDraggingNode) {
          clickCount = 0;
        }
      }, 250);
    } else if (clickCount >= 2) {
      clearTimeout(clickTimer);
      clickCount = 0;
      startEditing(nodeId);
      return;
    }
    
    isDraggingNode = true;
    dragNodeId = nodeId;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    
    const nodeInStore = findNodeById($mindMapStore, nodeId);
    if (nodeInStore) {
      const subtreeIds = getAllDescendants(nodeInStore);
      
      dragStartPositions = {};
      for (const id of subtreeIds) {
        const pos = getNodePosition(id, findNodeById(layoutedTree, id));
        dragStartPositions[id] = {
          x: pos.x,
          y: pos.y
        };
      }
    }
    
    window.addEventListener('mousemove', handleNodeDragMove);
    window.addEventListener('mouseup', handleNodeDragEnd);
  }
  
  function handleNodeDragMove(e) {
    if (!isDraggingNode || !dragNodeId) return;
    
    const dx = (e.clientX - dragStartX) / scale;
    const dy = (e.clientY - dragStartY) / scale;
    
    for (const [nodeId, startPos] of Object.entries(dragStartPositions)) {
      const newX = startPos.x + dx;
      const newY = startPos.y + dy;
      setNodePosition(nodeId, newX, newY);
    }
  }
  
  function handleNodeDragEnd() {
    isDraggingNode = false;
    dragNodeId = null;
    dragStartPositions = {};
    clickCount = 0;
    
    window.removeEventListener('mousemove', handleNodeDragMove);
    window.removeEventListener('mouseup', handleNodeDragEnd);
  }
  
  $: layoutedTree = layoutTree($mindMapStore, svgWidth / 2, svgHeight / 2);
  $: nodes = $flatNodes.map(node => {
    const layoutedNode = findNodeById(layoutedTree, node.id);
    const pos = getNodePosition(node.id, layoutedNode);
    return {
      ...node,
      x: pos.x,
      y: pos.y
    };
  });
  $: conns = $connections.map(conn => {
    const fromLayouted = findNodeById(layoutedTree, conn.from.id);
    const toLayouted = findNodeById(layoutedTree, conn.to.id);
    const fromPos = getNodePosition(conn.from.id, fromLayouted);
    const toPos = getNodePosition(conn.to.id, toLayouted);
    return {
      from: { ...conn.from, x: fromPos.x, y: fromPos.y },
      to: { ...conn.to, x: toPos.x, y: toPos.y }
    };
  });
</script>

<main>
  <div 
    class="mind-map-container"
    on:wheel={handleWheel}
    on:mousedown={handleCanvasMouseDown}
  >
    <svg
      width={svgWidth}
      height={svgHeight}
      style="transform: translate({panX}px, {panY}px) scale({scale}); transform-origin: 0 0;"
    >
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" stroke-width="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
      
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
      
      {#each nodes as node (node.id)}
        <g 
          transform={`translate(${node.x - node.width / 2}, ${node.y - node.height / 2})`}
          data-node-id={node.id}
          class="node-group"
        >
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
            >
              {node.text}
            </text>
          {/if}
          
          <g>
            <g class="action-btn-group">
              <circle
                class="action-btn-hit"
                cx={node.width + 12}
                cy={node.height / 2}
                r={12}
                fill="transparent"
                on:click|stopPropagation={() => mindMapStore.addChild(node.id)}
              />
              <circle
                class="action-btn action-btn-add"
                cx={node.width + 12}
                cy={node.height / 2}
                r={8}
                fill="#22c55e"
                stroke="#16a34a"
                stroke-width={1.5}
                pointer-events="none"
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
            </g>
            
            {#if !node.isRoot}
              <g class="action-btn-group">
                <circle
                  class="action-btn-hit"
                  cx={node.width + 12}
                  cy={node.height / 2 + 20}
                  r={12}
                  fill="transparent"
                  on:click|stopPropagation={() => mindMapStore.deleteNode(node.id)}
                />
                <circle
                  class="action-btn action-btn-delete"
                  cx={node.width + 12}
                  cy={node.height / 2 + 20}
                  r={8}
                  fill="#ef4444"
                  stroke="#dc2626"
                  stroke-width={1.5}
                  pointer-events="none"
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
              </g>
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
    overflow: hidden;
    background-color: #f8fafc;
    cursor: grab;
  }
  
  .mind-map-container:active {
    cursor: grabbing;
  }
  
  svg {
    display: block;
  }
  
  .node-group {
    cursor: grab;
  }
  
  .node-group:active {
    cursor: grabbing;
  }
  
  .node-rect {
    cursor: inherit;
    transition: all 0.2s ease;
  }
  
  .node-rect:hover {
    filter: brightness(1.05);
  }
  
  .node-text {
    cursor: inherit;
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
  
  .action-btn-hit {
    cursor: pointer;
  }
  
  .action-btn-group:hover .action-btn {
    stroke-width: 2.5;
    filter: brightness(1.1);
  }
  
  .action-btn {
    transition: stroke-width 0.15s ease, filter 0.15s ease;
  }
</style>
