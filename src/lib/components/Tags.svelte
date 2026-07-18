<script>
  let { items = [] } = $props();
</script>

<div class="tags">
  {#each items as item}<span class="tag">{item}</span>{/each}
</div>
