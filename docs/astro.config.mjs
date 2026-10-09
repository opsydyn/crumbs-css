// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	site: 'https://opsydyn.github.io',
	base: '/crumbs-css',
	integrations: [
		starlight({
			title: 'crumbs-css',
			customCss: ['./src/styles/crumbs-theme.css'],
			logo: { src: './src/assets/crumbs-css-logo.png' },
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/opsydyn/crumbs-css' }],
			sidebar: [
				{
					label: 'Tutorials',
					items: [
						{ label: 'Get started', slug: 'tutorials/get-started' },
						{ label: 'Build a themed screen', slug: 'tutorials/build-a-themed-screen' },
						{ label: 'Build your first button recipe', slug: 'tutorials/build-your-first-button-recipe' },
					],
				},
				{
					label: 'How-to Guides',
					items: [
						{ label: 'Configure Metro', slug: 'how-to/configure-metro' },
						{ label: 'Use themes', slug: 'how-to/use-themes' },
                        { label: 'Use container conditions', slug: 'how-to/use-container-conditions' },
                        { label: 'Use native motion', slug: 'how-to/use-native-motion' },
                        { label: 'Derive colour and typography', slug: 'how-to/use-token-algebra' },
						{ label: 'Use typed helpers', slug: 'how-to/use-typed-helpers' },
						{ label: 'Use recipes and state variants', slug: 'how-to/use-recipes-and-state-variants' },
						{ label: 'Build a reference design system', slug: 'how-to/build-a-reference-design-system' },
						{ label: 'Enable strict diagnostics', slug: 'how-to/enable-strict-diagnostics' },
						{ label: 'Annotate design-system ownership', slug: 'how-to/annotate-design-system-ownership' },
						{ label: 'Use Storybook and Expo Dev Client', slug: 'how-to/use-storybook-and-expo-dev-client' },
					],
				},
				{
					label: 'Reference',
					items: [
						{ label: 'Package entrypoints and APIs', slug: 'reference/package-entrypoints-and-apis' },
						{ label: 'Compatibility', slug: 'reference/compatibility' },
						{ label: 'Runtime model and guarantees', slug: 'reference/runtime-model-and-guarantees' },
						{ label: 'Diagnostics', slug: 'reference/diagnostics' },
						{ label: 'Install prerequisites', slug: 'reference/install-prerequisites' },
					],
				},
				{
					label: 'Explanation',
					items: [
						{ label: 'Why crumbs-css exists', slug: 'explanation/why-crumbs-css-exists' },
						{ label: 'How the Metro transform works', slug: 'explanation/how-the-metro-transform-works' },
						{ label: 'Why themes resolve at runtime', slug: 'explanation/why-themes-resolve-at-runtime' },
						{ label: 'Architecture tradeoffs', slug: 'explanation/architecture-tradeoffs' },
					],
				},
			],
		}),
	],
});
