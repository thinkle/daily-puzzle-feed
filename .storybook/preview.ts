import type { Preview } from '@storybook/sveltekit';
import 'contain-css-svelte/themes/dark.css';
import 'contain-css-svelte/vars/defaults.css';
import '../src/lib/styles/fonts.css';
import '../src/lib/styles/contain-base.css';

const preview: Preview = {
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
