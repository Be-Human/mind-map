<script>
  export let from;
  export let to;
  
  $: fromX = from.x + from.width / 2;
  $: fromY = from.y;
  $: toX = to.x - to.width / 2;
  $: toY = to.y;
  
  $: controlOffset = Math.abs(toX - fromX) / 2;
  
  $: pathD = `M ${fromX} ${fromY} 
              C ${fromX + controlOffset} ${fromY},
                ${toX - controlOffset} ${toY},
                ${toX} ${toY}`;
</script>

<path
  d={pathD}
  fill="none"
  stroke="#94a3b8"
  stroke-width={2}
  stroke-linecap="round"
/>
