import { writable, get } from 'svelte/store';

export interface AnimationTask {
	id: string;
	type: 'node' | 'edge';
	nodeId?: string;
	edgeId?: string;
	duration: number; // milliseconds
	direction?: 'forward' | 'backward';
}

interface AnimationQueueState {
	queue: AnimationTask[];
	isProcessing: boolean;
	activeAnimations: Set<string>;
}

function createAnimationQueue() {
	const { subscribe, update } = writable<AnimationQueueState>({
		queue: [],
		isProcessing: false,
		activeAnimations: new Set()
	});

	return {
		subscribe,

		enqueue(task: AnimationTask) {
			update((state) => ({
				...state,
				queue: [...state.queue, task]
			}));

			// Start processing if not already running
			const currentState = get({ subscribe });
			if (!currentState.isProcessing) {
				this.processQueue();
			}
		},

		async processQueue() {
			update((state) => ({ ...state, isProcessing: true }));

			while (true) {
				const state = get({ subscribe });
				if (state.queue.length === 0) break;

				const task = state.queue[0];

				// Mark as active
				update((s) => ({
					...s,
					activeAnimations: new Set([...s.activeAnimations, task.id])
				}));

				// Execute animation
				await this.executeAnimation(task);

				// Remove from queue and active set
				update((s) => ({
					...s,
					queue: s.queue.slice(1),
					activeAnimations: new Set([...s.activeAnimations].filter((id) => id !== task.id))
				}));
			}

			update((state) => ({ ...state, isProcessing: false }));
		},

		async executeAnimation(task: AnimationTask): Promise<void> {
			return new Promise((resolve) => {
				// Use requestAnimationFrame to ensure DOM update happens before timer starts
				requestAnimationFrame(() => {
					if (task.type === 'node') {
						// Trigger node animation via DOM
						this.animateNode(task.nodeId!, task.duration);
					} else if (task.type === 'edge') {
						// Trigger edge animation
						this.animateEdge(task.edgeId!, task.duration, task.direction);
					}

					// Wait for animation to complete after DOM update
					setTimeout(resolve, task.duration);
				});
			});
		},

		animateNode(nodeId: string, duration: number) {
			// Implementation will add/remove CSS classes
			const element = document.querySelector(`[data-node-id="${nodeId}"]`);
			if (element) {
				requestAnimationFrame(() => {
					element.classList.add('animate-pulse-glow');
					setTimeout(() => {
						element.classList.remove('animate-pulse-glow');
					}, duration);
				});
			}
		},

		animateEdge(edgeId: string, duration: number, direction?: string) {
			// Target the actual path element within the edge
			const edgeElement = document.querySelector(`[data-edge-id="${edgeId}"]`) as HTMLElement;
			if (edgeElement) {
				// Find the path element within the edge
				const pathElement = edgeElement.querySelector('path') as SVGPathElement;
				if (pathElement) {
					requestAnimationFrame(() => {
						// Add class to parent for arrowhead styling
						edgeElement.classList.add('animate-edge-active');
						pathElement.classList.add('animate-edge-flow');
						if (direction === 'backward') {
							pathElement.classList.add('reverse');
						}
						setTimeout(() => {
							edgeElement.classList.remove('animate-edge-active');
							pathElement.classList.remove('animate-edge-flow', 'reverse');
							// Restore original stroke properties
							const originalStroke = pathElement.getAttribute('data-original-stroke');
							const originalStrokeWidth = pathElement.getAttribute('data-original-stroke-width');
							if (originalStroke) {
								pathElement.setAttribute('stroke', originalStroke);
							}
							if (originalStrokeWidth) {
								pathElement.setAttribute('stroke-width', originalStrokeWidth);
							}
							// Clear inline styles
							pathElement.style.filter = '';
							pathElement.style.strokeDasharray = '';
							pathElement.style.strokeDashoffset = '';
						}, duration);
					});
				}
			}
		},

		clear() {
			update(() => ({
				queue: [],
				isProcessing: false,
				activeAnimations: new Set()
			}));
		}
	};
}

export const animationQueue = createAnimationQueue();
