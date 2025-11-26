import { writable } from 'svelte/store';

export interface TimelinePacket {
	direction: 'sent' | 'received';
	timestamp: number;
	length: number;
	hex: string;
	parsed?: any;
}

export const timeline = writable<TimelinePacket[]>([]);
