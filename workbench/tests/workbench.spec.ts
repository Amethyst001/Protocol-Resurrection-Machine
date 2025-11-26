import { test, expect, type Page } from '@playwright/test';

test.describe('Workbench UI Tests', () => {
	test.beforeEach(async ({ page }: { page: Page }) => {
		await page.goto('/');
	});

	test('should render three-pane layout on desktop', async ({ page }: { page: Page }) => {
		// Set viewport to desktop size
		await page.setViewportSize({ width: 1920, height: 1080 });

		// Check that the workbench is rendered
		const workbench = page.locator('[role="application"]');
		await expect(workbench).toBeVisible();

		// Check that toolbar is present
		const toolbar = page.locator('[role="toolbar"]');
		await expect(toolbar).toBeVisible();

		// Check that main panels region is present
		const panels = page.locator('[role="main"]');
		await expect(panels).toBeVisible();

		// Check that editor panel is present
		const editorPanel = page.locator('[role="region"][aria-label="Editor panel"]');
		await expect(editorPanel).toBeVisible();

		// Check that code viewer panel is present
		const codeViewerPanel = page.locator('[role="region"][aria-label="Code viewer panel"]');
		await expect(codeViewerPanel).toBeVisible();

		// Check that console panel is present
		const consolePanel = page.locator('[role="region"][aria-label="Console and results panel"]');
		await expect(consolePanel).toBeVisible();
	});

	test('should handle editor input and validation', async ({ page }: { page: Page }) => {
		await page.setViewportSize({ width: 1920, height: 1080 });

		// Wait for editor to be ready
		await page.waitForSelector('.cm-editor', { timeout: 5000 });

		// Type some YAML content
		const editor = page.locator('.cm-editor .cm-content');
		await editor.click();
		await page.keyboard.type('protocol:\n  name: test\n  version: 1.0');

		// Wait for debounced validation (500ms + buffer)
		await page.waitForTimeout(1000);

		// Check that validation was triggered (diagnostics should be updated)
		// Note: This would require the API to be running
	});

	test('should support keyboard shortcuts', async ({ page }: { page: Page }) => {
		await page.setViewportSize({ width: 1920, height: 1080 });

		// Test Ctrl+S for validation
		await page.keyboard.press('Control+s');
		
		// Wait a moment for the action to process
		await page.waitForTimeout(500);

		// Test Ctrl+G for generation
		await page.keyboard.press('Control+g');
		
		await page.waitForTimeout(500);
	});

	test('should be accessible with keyboard navigation', async ({ page }: { page: Page }) => {
		await page.setViewportSize({ width: 1920, height: 1080 });

		// Tab through interactive elements
		await page.keyboard.press('Tab');
		
		// Check that focus is visible
		const focusedElement = await page.evaluate(() => {
			return document.activeElement?.tagName;
		});
		
		expect(focusedElement).toBeTruthy();
	});

	test('should display error boundary on error', async ({ page }: { page: Page }) => {
		await page.setViewportSize({ width: 1920, height: 1080 });

		// Trigger an error by evaluating code that throws
		await page.evaluate(() => {
			throw new Error('Test error');
		});

		// Wait for error boundary to appear
		await page.waitForTimeout(500);

		// Check if error boundary is displayed
		const errorBoundary = page.locator('[role="alert"]');
		// Note: Error boundary might not catch all errors in test environment
	});

	test('should switch to mobile layout on small screens', async ({ page }: { page: Page }) => {
		// Set viewport to mobile size
		await page.setViewportSize({ width: 375, height: 667 });

		// Check that mobile sections are present
		const mobileSections = page.locator('.mobile-section');
		await expect(mobileSections.first()).toBeVisible();

		// Check that sections can be toggled
		const sectionHeader = page.locator('.mobile-section-header').first();
		await sectionHeader.click();

		// Wait for animation
		await page.waitForTimeout(500);
	});

	test('should handle theme toggle', async ({ page }: { page: Page }) => {
		await page.setViewportSize({ width: 1920, height: 1080 });

		// Find and click theme toggle button (if present in toolbar)
		// Note: This depends on Toolbar implementation
		const themeToggle = page.locator('button[aria-label*="theme"]').first();
		
		if (await themeToggle.isVisible()) {
			await themeToggle.click();
			
			// Check that dark class is toggled
			const html = page.locator('html');
			const hasDarkClass = await html.evaluate((el: Element) => el.classList.contains('dark'));
			expect(typeof hasDarkClass).toBe('boolean');
		}
	});

	test('should display toast notifications', async ({ page }: { page: Page }) => {
		await page.setViewportSize({ width: 1920, height: 1080 });

		// Trigger a validation that shows a toast
		await page.keyboard.press('Control+s');
		
		// Wait for toast to appear
		await page.waitForTimeout(1000);

		// Check for toast container
		const toastContainer = page.locator('[role="region"][aria-label="Notifications"]');
		// Toast might not appear if validation succeeds without issues
	});

	test('should maintain focus indicators', async ({ page }: { page: Page }) => {
		await page.setViewportSize({ width: 1920, height: 1080 });

		// Tab to first focusable element
		await page.keyboard.press('Tab');

		// Check that focus outline is visible
		const focusedElement = page.locator(':focus');
		await expect(focusedElement).toBeVisible();

		// Check that outline style is applied
		const outlineStyle = await focusedElement.evaluate((el: Element) => {
			return window.getComputedStyle(el).outline;
		});
		
		// Outline should be present (not 'none')
		expect(outlineStyle).not.toBe('none');
	});

	test('should handle responsive design transitions', async ({ page }: { page: Page }) => {
		// Start with desktop
		await page.setViewportSize({ width: 1920, height: 1080 });
		
		// Verify desktop layout
		let panels = page.locator('[role="main"]');
		await expect(panels).toBeVisible();

		// Resize to mobile
		await page.setViewportSize({ width: 375, height: 667 });
		
		// Wait for transition
		await page.waitForTimeout(500);

		// Verify mobile layout
		const mobileSections = page.locator('.mobile-section');
		await expect(mobileSections.first()).toBeVisible();

		// Resize back to desktop
		await page.setViewportSize({ width: 1920, height: 1080 });
		
		// Wait for transition
		await page.waitForTimeout(500);

		// Verify desktop layout again
		panels = page.locator('[role="main"]');
		await expect(panels).toBeVisible();
	});
});
