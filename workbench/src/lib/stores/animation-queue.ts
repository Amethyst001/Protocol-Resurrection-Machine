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
			// Implementation will animate edge with traveling gradient
			const element = document.querySelector(`[data-edge-id="${edgeId}"]`);
			if (element) {
				requestAnimationFrame(() => {
					element.classList.add('animate-edge-flow');
					if (direction === 'backward') {
						element.classList.add('reverse');
					}
					setTimeout(() => {
						element.classList.remove('animate-edge-flow', 'reverse');
					}, duration);
				});
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
