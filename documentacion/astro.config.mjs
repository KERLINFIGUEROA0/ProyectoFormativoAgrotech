// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import astroMermaid from 'astro-mermaid';

// https://astro.build/config
export default defineConfig({
	server: {
		port: 4321, // Puerto específico que estabamos utilizando
	},
	integrations: [
		starlight({
			title: 'Documentacion Agrotech',
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/withastro/starlight' }],
			sidebar: [
				{ label: 'Despliegue', slug: 'despliegue' },
				{
					label: 'Módulos',
					autogenerate: { directory: 'modulos' },
				},
				{ label: 'Arquitectura Backend', slug: 'arquitectura' },
				{ label: 'DTOs', slug: 'dtos' },
				{ label: 'Manual de Usuario Web', slug: 'manual-de-usuario' },
				{ label: 'Manual de Usuario Mobile', slug: 'manual-de-usuario-mobile' },

			],
		}),
		astroMermaid({
			mermaidConfig: {
				theme: 'default',
				themeVariables: {
					fontFamily: 'arial',
					fontSize: '14px',
				},
				flowchart: {
					useMaxWidth: true,
					htmlLabels: true,
				},
				er: {
					useMaxWidth: true,
				},
			},
		}),
	],
});
