import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import legacy from "@vitejs/plugin-legacy";
import react from "@vitejs/plugin-react";
import { minify } from "html-minifier-terser";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { colorSchemes } from "./src/data/colorSchemes";

const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));

let commitHash = "unknown";
let commitDate = "";
try {
	commitHash = execSync("git rev-parse --short HEAD").toString().trim();
	commitDate = execSync("git log -1 --format=%cI").toString().trim();
} catch {
	// Not a git checkout (e.g. source archive, CI without .git)
}

export default defineConfig({
	resolve: {
		tsconfigPaths: true,
	},
	define: {
		__APP_VERSION__: JSON.stringify(pkg.version),
		__COMMIT_HASH__: JSON.stringify(commitHash),
		__COMMIT_DATE__: JSON.stringify(commitDate),
	},
	plugins: [
		// Inject inline script to apply persisted theme/color scheme before first paint (prevents FOUC)
		{
			name: "anti-fouc",
			transformIndexHtml(html) {
				const schemeMap: Record<string, Record<string, string>> = {};
				for (const scheme of colorSchemes) {
					// Skip default scheme — its values are already in CSS @theme
					if (scheme.id === "indigo") continue;
					schemeMap[scheme.id] = scheme.colors;
				}
				const script = `<script>(function(){try{var s=localStorage.getItem("kana-snap-storage");if(!s)return;var t=JSON.parse(s).state;if(!t)return;var m=t.theme;document.documentElement.setAttribute("data-theme",m==="dark"||m==="light"?m:window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");var c=${JSON.stringify(schemeMap)}[t.colorScheme];if(c){var r=document.documentElement;for(var p in c)r.style.setProperty(p,c[p])}}catch(e){}})()</script>`;
				return html.replace("</head>", `${script}\n</head>`);
			},
		},
		tanstackRouter({
			routesDirectory: "./src/routes",
			generatedRouteTree: "./src/routeTree.gen.ts",
		}),
		react(),
		tailwindcss(),
		VitePWA({
			registerType: "autoUpdate",
			includeAssets: ["icon.svg", "apple-touch-icon-180x180.png"],
			manifest: {
				name: "KanaSnap",
				short_name: "KanaSnap",
				description:
					"Interactive Japanese Kana learning app with charts, quizzes, and analytics",
				theme_color: "#6366f1",
				background_color: "#ffffff",
				display: "standalone",
				scope: "/",
				start_url: "/",
				icons: [
					{
						src: "pwa-192x192.png",
						sizes: "192x192",
						type: "image/png",
					},
					{
						src: "pwa-512x512.png",
						sizes: "512x512",
						type: "image/png",
					},
					{
						src: "pwa-512x512.png",
						sizes: "512x512",
						type: "image/png",
						purpose: "any maskable",
					},
				],
			},
			workbox: {
				globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
				runtimeCaching: [
					{
						urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
						handler: "CacheFirst",
						options: {
							cacheName: "google-fonts-cache",
							expiration: {
								maxEntries: 10,
								maxAgeSeconds: 60 * 60 * 24 * 365,
							},
							cacheableResponse: {
								statuses: [0, 200],
							},
						},
					},
				],
			},
		}),
		legacy({
			targets: ["defaults", "not IE 11"],
		}),
		{
			name: "htmlMinify",
			enforce: "post",
			apply: "build",
			transformIndexHtml: async (html: string) =>
				await minify(html, {
					collapseWhitespace: true,
					removeComments: true,
					minifyJS: true,
					minifyCSS: true,
				}),
		},
	],
	build: {
		minify: "terser",
	},
});
