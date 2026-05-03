<script>
  import { mindMapStore, flatNodes, connections } from '../stores/mindMapStore.js';
  import { layoutTree } from '../utils/treeLayout.js';
  import Node from './Node.svelte';
  import Connection from './Connection.svelte';
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher();
  
  let editingNodeId = null;
  
  let width = 3000;
  let height = 2000;
  
  let scale = 1;
  let panX = 0;
  let panY = 0;
  
  let isPanning = false;
  let lastPanX = 0;
  let lastPanY = 0;
  
  let nodePositions = new Map();
  
  function findNodeById(node, id) {
    if (node.id === id) return node;
    for (const child of node.children) {
      const found = findNodeById(child, id);
      if (found) return found;
    }
    return null;
  }
  
  function getAllDescendantIds(node) {
    const ids = [];
    function traverse(n) {
      ids.push(n.id);
      for (const child of n.children) {
        traverse(child);
      }
    }
    traverse(node);
    return ids;
  }
  
  function startEditing(nodeId) {
    editingNodeId = nodeId;
  }
  
  function endEditing() {
    editingNodeId = null;
  }
  
  function getNodePosition(nodeId, layoutedNode) {
    if (nodePositions.has(nodeId)) {
      return nodePositions.get(nodeId);
    }
    return { x: layoutedNode?.x ?? 0, y: layoutedNode?.y ?? 0 };
  }
  
  function setNodePosition(nodeId, x, y) {
    nodePositions.set(nodeId, { x, y });
    nodePositions = new Map(nodePositions);
  }
  
  function handleNodeDragStart(nodeId) {
    const layoutedNode = findNodeById(layoutedTree, nodeId);
    const pos = getNodePosition(nodeId, layoutedNode);
    
    const nodeInStore = findNodeById($mindMapStore, nodeId);
    if (nodeInStore) {
      const subtreeIds = getAllDescendantIds(nodeInStore);
      const subtreeOffsets = new Map();
      
      for (const id of subtreeIds) {
        const ln = findNodeById(layoutedTree, id);
        const p = getNodePosition(id, ln);
        subtreeOffsets.set(id, {
          dx: p.x - pos.x,
          dy: p.y - pos.y
        });
      }
      
      return { nodeId, startX: pos.x, startY: pos.y, subtreeOffsets };
    }
    return { nodeId, startX: pos.x, startY: pos.y, subtreeOffsets: new Map([[nodeId, { dx: 0, dy: 0 }]]) };
  }
  
  function handleNodeDrag(dragState, dx, dy) {
    for (const [nodeId, offset] of dragState.subtreeOffsets) {
      const newX = dragState.startX + dx + offset.dx;
      const newY = dragState.startY + dy + offset.dy;
      setNodePosition(nodeId, newX, newY);
    }
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
  
  function handleMouseDown(e) {
    if (e.target.closest('.node-element') || e.target.closest('.action-btn-hit')) {
      return;
    }
    
    isPanning = true;
    lastPanX = e.clientX - panX;
    lastPanY = e.clientY - panY;
    
    window.addEventListener('mousemove', handlePanMove);
    window.addEventListener('mouseup', handlePanEnd);
  }
  
  function handlePanMove(e) {
    if (!isPanning) return;
    
    panX = e.clientX - lastPanX;
    panY = e.clientY - lastPanY;
  }
  
  function handlePanEnd() {
    isPanning = false;
    window.removeEventListener('mousemove', handlePanMove);
    window.removeEventListener('mouseup', handlePanEnd);
  }
  
  $: layoutedTree = layoutTree($mindMapStore, width / 2, height / 2);
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

<div class="mind-map-container" on:wheel={handleWheel} on:mousedown={handleMouseDown}>
  <svg
    width={width}
    height={height}
    style="transform: translate({panX}px, {panY}px) scale({scale}); transform-origin: 0 0;"
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
      <Connection from={conn.from} to={conn.to} />
    {/each}
    
    <!-- 节点 -->
    {#each nodes as node (node.id)}
      <Node
        node={node}
        isEditing={editingNodeId === node.id}
        onEditStart={startEditing}
        onEditEnd={endEditing}
        scale={scale}
        onDragStart={handleNodeDragStart}
        onDrag={handleNodeDrag}
      />
    {/each}
  </svg>
</div>

<style>
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
</style>
