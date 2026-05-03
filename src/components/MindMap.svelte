<script>
  import { mindMapStore, flatNodes, connections } from '../stores/mindMapStore.js';
  import { layoutTree } from '../utils/treeLayout.js';
  import Node from './Node.svelte';
  import Connection from './Connection.svelte';
  
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
      <Connection from={conn.from} to={conn.to} />
    {/each}
    
    <!-- 节点 -->
    {#each nodes as node (node.id)}
      <Node
        node={node}
        isEditing={editingNodeId === node.id}
        onEditStart={startEditing}
        onEditEnd={endEditing}
      />
    {/each}
  </svg>
</div>

<style>
  .mind-map-container {
    width: 100vw;
    height: 100vh;
    overflow: auto;
    background-color: #f8fafc;
  }
  
  svg {
    display: block;
  }
</style>
