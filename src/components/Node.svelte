<script>
  import { mindMapStore } from '../stores/mindMapStore.js';
  
  export let node;
  export let isEditing = false;
  export let onEditStart;
  export let onEditEnd;
  
  let editText = node.text;
  
  function handleDoubleClick() {
    if (onEditStart) {
      onEditStart(node.id);
    }
  }
  
  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  }
  
  function saveEdit() {
    if (editText.trim()) {
      mindMapStore.updateNodeText(node.id, editText.trim());
    }
    if (onEditEnd) {
      onEditEnd();
    }
  }
  
  function cancelEdit() {
    editText = node.text;
    if (onEditEnd) {
      onEditEnd();
    }
  }
  
  function addChild() {
    mindMapStore.addChild(node.id);
  }
  
  function deleteNode() {
    if (!node.isRoot) {
      mindMapStore.deleteNode(node.id);
    }
  }
  
  $: x = node.x - node.width / 2;
  $: y = node.y - node.height / 2;
</script>

<g transform={`translate(${x}, ${y})`}>
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
  {#if isEditing}
    <foreignObject width={node.width} height={node.height}>
      <div class="edit-container">
        <input
          bind:value={editText}
          class="edit-input"
          on:keydown={handleKeyDown}
          on:blur={saveEdit}
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
      on:dblclick={handleDoubleClick}
    >
      {node.text}
    </text>
  {/if}
  
  <!-- 操作按钮 -->
  <g class="node-actions">
    <!-- 添加子节点按钮 -->
    <g class="action-btn-group">
      <!-- 隐藏的大圆形作为点击区域 -->
      <circle
        class="action-btn-hit"
        cx={node.width + 12}
        cy={node.height / 2}
        r={12}
        fill="transparent"
        on:click={addChild}
      />
      <!-- 可见的按钮 -->
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
    
    <!-- 删除按钮 (非根节点) -->
    {#if !node.isRoot}
      <g class="action-btn-group">
        <!-- 隐藏的大圆形作为点击区域 -->
        <circle
          class="action-btn-hit"
          cx={node.width + 12}
          cy={node.height / 2 + 20}
          r={12}
          fill="transparent"
          on:click={deleteNode}
        />
        <!-- 可见的按钮 -->
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

<style>
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
