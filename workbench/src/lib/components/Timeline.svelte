<script lang="ts" context="module">
	export interface Packet {
		direction: 'sent' | 'received';
		timestamp: string;
		length: number;
		hex: string;
		parsed?: {
			type: string;
			fields: Record<string, any>;
		};
		error?: string;
	}
</script>

<script lang="ts">
	import VirtualScroll from './VirtualScroll.svelte';

	export let packets: Packet[] = [];
	export let onPacketClick: (packet: Packet) => void = () => {};

	let hoveredPacket: Packet | null = null;
	let hoveredPosition = { x: 0, y: 0 };
	let useVirtualScroll = false;

	// Use virtual scrolling for large packet lists
	$: useVirtualScroll = packets.length > 100;

	function formatTimestamp(timestamp: string): string {
		const date = new Date(timestamp);
		const hours = date.getHours().toString().padStart(2, '0');
		const minutes = date.getMinutes().toString().padStart(2, '0');
		const seconds = date.getSeconds().toString().padStart(2, '0');
		const ms = date.getMilliseconds().toString().padStart(3, '0');
		return `${hours}:${minutes}:${seconds}.${ms}`;
	}

	function formatHex(hex: string, maxLength: number = 32): string {
		if (hex.length <= maxLength) {
			return hex;
		}
		return hex.substring(0, maxLength) + '...';
	}

	function handleMouseEnter(packet: Packet, event: MouseEvent) {
		hoveredPacket = packet;
		hoveredPosition = { x: event.clientX, y: event.clientY };
	}

	function handleMouseLeave() {
		hoveredPacket = null;
	}

	function jumpToFirstError() {
		const firstError = packets.find(p => p.error);
		if (firstError) {
			const element = document.getElementById(`packet-${packets.indexOf(firstError)}`);
			element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
		}
	}

	$: errorCount = packets.filter(p => p.error).length;
</script>

<div class="flex flex-col h-full bg-white dark:bg-gray-900">
	<!-- Header -->
	<div class="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
		<div class="flex items-center gap-2">
			<svg class="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
				      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
			</svg>
			<span class="text-sm font-medium text-gray-700 dark:text-gray-300">Packet Timeline</span>
			<span class="text-xs text-gray-500 dark:text-gray-400">({packets.length} packets)</span>
			{#if errorCount > 0}
				<span class="px-2 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 rounded-full">
					{errorCount} {errorCount === 1 ? 'error' : 'errors'}
				</span>
			{/if}
		</div>
		
		{#if errorCount > 0}
			<button
				onclick={jumpToFirstError}
				class="px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200
				       focus:outline-none focus:ring-2 focus:ring-red-500 rounded transition-colors"
				aria-label="Jump to first error"
			>
				Jump to First Error
			</button>
		{/if}
	</div>

	<!-- Timeline -->
	<div class="flex-1 overflow-auto p-4">
		{#if packets.length === 0}
			<div class="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
				<div class="text-center">
					<svg class="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
						      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					<p class="text-lg font-medium">No packets captured yet</p>
					<p class="text-sm mt-2">Run protocol discovery to see packet timeline</p>
				</div>
			</div>
		{:else if useVirtualScroll}
			<!-- Virtual scrolling for large lists -->
			<div class="relative">
				<!-- Timeline line -->
				<div class="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-300 dark:bg-gray-700"></div>

				<VirtualScroll items={packets} itemHeight={120}>
					<div
						slot="default"
						let:item={packet}
						let:index={i}
						id="packet-{i}"
						class="relative pl-16 cursor-pointer mb-4"
						onclick={() => onPacketClick(packet)}
						onkeydown={(e) => e.key === 'Enter' && onPacketClick(packet)}
						onmouseenter={(e) => handleMouseEnter(packet, e)}
						onmouseleave={handleMouseLeave}
						role="button"
						tabindex="0"
					>
						<!-- Timeline dot -->
						<div
							class="absolute left-6 w-5 h-5 rounded-full border-2 border-white dark:border-gray-900
							       {packet.error
								? 'bg-red-500'
								: packet.direction === 'sent'
								? 'bg-blue-500'
								: 'bg-green-500'}"
						></div>

						<!-- Packet card -->
						<div
							class="p-3 rounded-lg border transition-colors
							       {packet.error
								? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20'
								: packet.direction === 'sent'
								? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30'
								: 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30'}"
						>
							<div class="flex items-start justify-between mb-2">
								<div class="flex items-center gap-2">
									{#if packet.direction === 'sent'}
										<svg class="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
											      d="M7 11l5-5m0 0l5 5m-5-5v12" />
										</svg>
										<span class="text-sm font-medium text-blue-900 dark:text-blue-100">Sent</span>
									{:else}
										<svg class="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
											      d="M17 13l-5 5m0 0l-5-5m5 5V6" />
										</svg>
										<span class="text-sm font-medium text-green-900 dark:text-green-100">Received</span>
									{/if}
								</div>
								<div class="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
									<span>{formatTimestamp(packet.timestamp)}</span>
									<span>{packet.length} bytes</span>
								</div>
							</div>

							{#if packet.error}
								<div class="flex items-start gap-2 text-sm text-red-900 dark:text-red-100">
									<svg class="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
										      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
									<span>{packet.error}</span>
								</div>
							{:else if packet.parsed}
								<div class="text-sm">
									<span class="font-medium text-gray-900 dark:text-gray-100">
										{packet.parsed.type}
									</span>
									<div class="mt-1 text-xs text-gray-600 dark:text-gray-400 font-mono">
										{JSON.stringify(packet.parsed.fields, null, 2)}
									</div>
								</div>
							{:else}
								<div class="text-xs font-mono text-gray-600 dark:text-gray-400">
									{formatHex(packet.hex)}
								</div>
							{/if}
						</div>
					</div>
				</VirtualScroll>
			</div>
		{:else}
			<!-- Regular rendering for small lists -->
			<div class="relative">
				<!-- Timeline line -->
				<div class="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-300 dark:bg-gray-700"></div>

				<!-- Packets -->
				<div class="space-y-4">
					{#each packets as packet, i}
						<div
							id="packet-{i}"
							class="relative pl-16 cursor-pointer"
							onclick={() => onPacketClick(packet)}
							onkeydown={(e) => e.key === 'Enter' && onPacketClick(packet)}
							onmouseenter={(e) => handleMouseEnter(packet, e)}
							onmouseleave={handleMouseLeave}
							role="button"
							tabindex="0"
						>
							<!-- Timeline dot -->
							<div
								class="absolute left-6 w-5 h-5 rounded-full border-2 border-white dark:border-gray-900
								       {packet.error
									? 'bg-red-500'
									: packet.direction === 'sent'
									? 'bg-blue-500'
									: 'bg-green-500'}"
							></div>

							<!-- Packet card -->
							<div
								class="p-3 rounded-lg border transition-colors
								       {packet.error
									? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20'
									: packet.direction === 'sent'
									? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30'
									: 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30'}"
							>
								<div class="flex items-start justify-between mb-2">
									<div class="flex items-center gap-2">
										{#if packet.direction === 'sent'}
											<svg class="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
												      d="M7 11l5-5m0 0l5 5m-5-5v12" />
											</svg>
											<span class="text-sm font-medium text-blue-900 dark:text-blue-100">Sent</span>
										{:else}
											<svg class="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
												      d="M17 13l-5 5m0 0l-5-5m5 5V6" />
											</svg>
											<span class="text-sm font-medium text-green-900 dark:text-green-100">Received</span>
										{/if}
									</div>
									<div class="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
										<span>{formatTimestamp(packet.timestamp)}</span>
										<span>{packet.length} bytes</span>
									</div>
								</div>

								{#if packet.error}
									<div class="flex items-start gap-2 text-sm text-red-900 dark:text-red-100">
										<svg class="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
											      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
										</svg>
										<span>{packet.error}</span>
									</div>
								{:else if packet.parsed}
									<div class="text-sm">
										<span class="font-medium text-gray-900 dark:text-gray-100">
											{packet.parsed.type}
										</span>
										<div class="mt-1 text-xs text-gray-600 dark:text-gray-400 font-mono">
											{JSON.stringify(packet.parsed.fields, null, 2)}
										</div>
									</div>
								{:else}
									<div class="text-xs font-mono text-gray-600 dark:text-gray-400">
										{formatHex(packet.hex)}
									</div>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- Hex preview tooltip -->
{#if hoveredPacket}
	<div
		class="fixed z-50 p-3 bg-gray-900 dark:bg-gray-800 text-white rounded-lg shadow-lg max-w-md"
		style="left: {hoveredPosition.x + 10}px; top: {hoveredPosition.y + 10}px;"
	>
		<div class="text-xs font-semibold mb-2">Hex Preview</div>
		<pre class="text-xs font-mono whitespace-pre-wrap break-all">{hoveredPacket.hex}</pre>
	</div>
{/if}
