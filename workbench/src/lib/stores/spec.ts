import { writable } from 'svelte/store';
import { exampleVariations } from './example-variations';

/**
 * Store for the current YAML specification
 */
// Default to the first demo variation
const defaultSpec = exampleVariations.demo[0];

function createSpecStore() {
  const { subscribe, set, update } = writable<string>(defaultSpec);

  return {
    subscribe,
    set,
    update,
    loadExample: (name: keyof typeof exampleVariations) => {
      const variations = exampleVariations[name];
      if (variations && variations.length > 0) {
        const randomSpec = variations[Math.floor(Math.random() * variations.length)];
        set(randomSpec);
      } else {
        console.error(`No variations found for example: ${name}`);
      }
    }
  };
}

export const spec = createSpecStore();
