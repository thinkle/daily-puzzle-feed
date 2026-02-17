import type { Preview } from '@storybook/sveltekit';
import ContainBase from '../src/lib/components/ContainBase.svelte';

const preview: Preview = {
	decorators: [
		(Story) => ({
			Component: ContainBase,
			slots: { default: Story }
		})
	],
	parameters: {
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i
			}
		},

		a11y: {
			// 'todo' - show a11y violations in the test UI only
			// 'error' - fail CI on a11y violations
			// 'off' - skip a11y checks entirely
			test: 'todo'
		}
	}
};

export default preview;
