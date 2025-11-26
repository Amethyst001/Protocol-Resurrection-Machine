<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	export let items: any[] = [];
	export let itemHeight: number = 40;
	export let visibleCount: number = 20;
	export let renderItem: (item: any, index: number) => string = (item) => String(item);

	let scrollContainer: HTMLDivElement;
	let scrollTop = 0;
	let containerHeight = 0;

	$: totalHeight = items.length * itemHeight;
	$: startIndex = Math.floor(scrollTop / itemHeight);
	$: endIndex = Math.min(startIndex + visibleCount + 1, items.length);
	$: visibleItems = items.slice(startIndex, endIndex);
	$: offsetY = startIndex * itemHeight;

	function handleScroll() {
		if (scrollContainer) {
			scrollTop = scrollContainer.scrollTop;
		}
	}

	function updateContainerHeight() {
		if (scrollContainer) {
			containerHeight = scrollContainer.clientHeight;
			visibleCount = Math.ceil(containerHeight / itemHeight) + 2;
		}
	}

	onMount(() => {
		updateContainerHeight();
		window.addEventListener('resize', updateContainerHeight);
	});

	onDestroy(() => {
		window.removeEventListener('resize', updateContainerHeight);
	});
</script>

<div
	bind:this={scrollContainer}
	on:scroll={handleScroll}
	class="virtual-scroll-container"
	style="height: 100%; overflow-y: auto;"
>
	<div style="height: {totalHeight}px; position: relative;">
		<div style="transform: translateY({offsetY}px);">
			{#each visibleItems as item, i (startIndex + i)}
				<div
					class="virtual-scroll-item"
					style="height: {itemHeight}px;"
				>
					<slot {item} index={startIndex + i}>
						{@html renderItem(item, startIndex + i)}
					</slot>
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	.virtual-scroll-container {
		position: relative;
	}

	.virtual-scroll-item {
		overflow: hidden;
	}
</style>
