import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	optimizeDeps: {
		exclude: [
			'langium',
			'vscode-languageserver-types',
			'vscode-jsonrpc',
			'@chevrotain/regexp-to-ast'
		]
	},
	ssr: {
		noExternal: ['@xyflow/svelte']
	}
});
