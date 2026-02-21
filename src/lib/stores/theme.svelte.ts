import { browser } from '$app/environment';

export const THEMES = ['marquee', 'newsprint', 'arcade', 'coffeehouse'] as const;
export type ThemeName = (typeof THEMES)[number];

export const THEME_LABELS: Record<ThemeName, string> = {
	marquee: 'Marquee',
	newsprint: 'Newsprint',
	arcade: 'Arcade',
	coffeehouse: 'Coffeehouse'
};

const STORAGE_KEY = 'dpf-theme';

function isValidTheme(value: unknown): value is ThemeName {
	return typeof value === 'string' && THEMES.includes(value as ThemeName);
}

function readSavedTheme(): ThemeName {
	if (!browser) return 'marquee';
	const saved = localStorage.getItem(STORAGE_KEY);
	return isValidTheme(saved) ? saved : 'marquee';
}

let current = $state<ThemeName>(readSavedTheme());

function applyThemeClass(theme: ThemeName) {
	if (!browser) return;
	const html = document.documentElement;
	for (const t of THEMES) {
		html.classList.remove(`theme-${t}`);
	}
	// marquee is the default (no class needed), but add it for consistency
	html.classList.add(`theme-${theme}`);
	document.body.className = document.body.className
		.replace(/\btheme-\w+\b/g, '')
		.trim();
	document.body.classList.add(`theme-${theme}`);
}

export function getTheme(): ThemeName {
	return current;
}

export function setTheme(theme: ThemeName) {
	current = theme;
	applyThemeClass(theme);
	if (browser) {
		localStorage.setItem(STORAGE_KEY, theme);
	}
}

export function cycleTheme() {
	const idx = THEMES.indexOf(current);
	const next = THEMES[(idx + 1) % THEMES.length];
	setTheme(next);
}

export function initTheme() {
	const saved = readSavedTheme();
	current = saved;
	applyThemeClass(saved);
}

export const theme = {
	get current() {
		return current;
	}
};
