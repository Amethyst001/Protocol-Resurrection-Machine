<script lang="ts" context="module">
	export interface ASTNode {
		type: string;
		fields?: Record<string, any>;
		children?: ASTNode[];
		line?: number;
		column?: number;
		error?: string;
	}
</script>

<script lang="ts">
	export let ast: ASTNode | null = null;
	export let onNodeHover: (node: ASTNode | null) => void = () => {};
	export let onNodeClick: (node: ASTNode) => void = () => {};

	let expandedNodes = new Set<string>();

	function getNodeId(node: ASTNode, path: string): string {
		return `${path}-${node.type}`;
	}

	function toggleNode(nodeId: string) {
		if (expandedNodes.has(nodeId)) {
			expandedNodes.delete(nodeId);
		} else {
			expandedNodes.add(nodeId);
		}
		expandedNodes = expandedNodes; // Trigger reactivity
	}

	function isExpanded(nodeId: string): boolean {
		return expandedNodes.has(nodeId);
	}

	function formatValue(value: any): string {
		if (value === null || value === undefined) {
			return String(value);
		}
		if (typeof value === 'object') {
			return JSON.stringify(value);
		}
		if (typeof value === 'string') {
			return `"${value}"`;
		}
		return String(value);
	}

	function hasChildren(node: ASTNode): boolean {
		return !!(node.children && node.children.length > 0) || 
		       !!(node.fields && Object.keys(node.fields).length > 0);
	}

	function expandAll() {
		const collectNodeIds = (node: ASTNode, path: string = '') => {
			const nodeId = getNodeId(node, path);
			expandedNodes.add(nodeId);
			
			if (node.children) {
				node.children.forEach((child, i) => {
					collectNodeIds(child, `${path}/${i}`);
				});
			}
		};
		
		if (ast) {
			collectNodeIds(ast, 'root');
		}
		expandedNodes = expandedNodes;
	}

	function collapseAll() {
		expandedNodes.clear();
		expandedNodes = expandedNodes;
	}
</script>

<div class="flex flex-col h-full bg-white dark:bg-gray-900">
	<!-- Header -->
	<div class="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
		<div class="flex items-center gap-2">
			<svg class="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
				      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
			</svg>
			<span class="text-sm font-medium text-gray-700 dark:text-gray-300">AST Viewer</span>
		</div>
		
		{#if ast}
			<div class="flex items-center gap-2">
				<button
					onclick={expandAll}
					class="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200
					       focus:outline-none focus:ring-2 focus:ring-blue-500 rounded transition-colors"
					aria-label="Expand all nodes"
				>
					Expand All
				</button>
				<button
					onclick={collapseAll}
					class="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200
					       focus:outline-none focus:ring-2 focus:ring-blue-500 rounded transition-colors"
					aria-label="Collapse all nodes"
				>
					Collapse All
				</button>
			</div>
		{/if}
	</div>

	<!-- AST Tree -->
	<div class="flex-1 overflow-auto p-4">
		{#if !ast}
			<div class="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
				<div class="text-center">
					<svg class="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
						      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
					</svg>
					<p class="text-lg font-medium">No AST available</p>
					<p class="text-sm mt-2">Validate your specification to see the AST</p>
				</div>
			</div>
		{:else}
			{#each [ast] as node}
				{@render renderNode(node, 'root', 0)}
			{/each}
		{/if}
	</div>
</div>

{#snippet renderNode(node: ASTNode, path: string, depth: number)}
	{@const nodeId = getNodeId(node, path)}
	{@const expanded = isExpanded(nodeId)}
	{@const hasKids = hasChildren(node)}

	<div class="font-mono text-sm" style="margin-left: {depth * 20}px">
		<div
			class="flex items-start gap-2 py-1 px-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer
			       {node.error ? 'bg-red-50 dark:bg-red-900/20' : ''}"
			onmouseenter={() => onNodeHover(node)}
			onmouseleave={() => onNodeHover(null)}
			onclick={() => onNodeClick(node)}
			onkeydown={(e) => e.key === 'Enter' && onNodeClick(node)}
			role="button"
			tabindex="0"
		>
			{#if hasKids}
				<button
					onclick={(e) => { e.stopPropagation(); toggleNode(nodeId); }}
					class="flex-shrink-0 w-4 h-4 flex items-center justify-center text-gray-500 dark:text-gray-400"
					aria-label={expanded ? 'Collapse' : 'Expand'}
				>
					{#if expanded}
						<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					{:else}
						<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
						</svg>
					{/if}
				</button>
			{:else}
				<span class="w-4"></span>
			{/if}

			<div class="flex-1">
				<span class="text-blue-600 dark:text-blue-400 font-semibold">
					{node.type}
				</span>
				
				{#if node.line !== undefined}
					<span class="text-xs text-gray-500 dark:text-gray-400 ml-2">
						@{node.line}:{node.column}
					</span>
				{/if}

				{#if node.error}
					<span class="text-xs text-red-600 dark:text-red-400 ml-2">
						Error: {node.error}
					</span>
				{/if}
			</div>
		</div>

		{#if expanded}
			{#if node.fields}
				{#each Object.entries(node.fields) as [key, value]}
					<div class="py-1 px-2 ml-6 text-gray-700 dark:text-gray-300">
						<span class="text-purple-600 dark:text-purple-400">{key}:</span>
						<span class="ml-2 text-green-600 dark:text-green-400">{formatValue(value)}</span>
					</div>
				{/each}
			{/if}

			{#if node.children}
				{#each node.children as child, i}
					{@render renderNode(child, `${path}/${i}`, depth + 1)}
				{/each}
			{/if}
		{/if}
	</div>
{/snippet}
