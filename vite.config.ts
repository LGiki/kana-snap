import { execSync } from "node:child_process";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { minify } from "html-minifier-terser";
import { optimize } from "svgo";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { STORAGE_KEY } from "./src/constants";
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
					schemeMap[scheme.id] = scheme.colors;
				}
				const script = `<script>(function(){try{var s=localStorage.getItem(${JSON.stringify(STORAGE_KEY)});var t=s?(JSON.parse(s).state||{}):{};var m=t.theme;var mode=m==="dark"||m==="light"?m:window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.setAttribute("data-theme",mode);var schemes=${JSON.stringify(schemeMap)};var c=schemes[t.colorScheme]||schemes.coral;if(c){var r=document.documentElement;for(var p in c)r.style.setProperty(p,c[p]);var meta=document.querySelector('meta[name="theme-color"]');if(!meta){meta=document.createElement("meta");meta.name="theme-color";document.head.appendChild(meta)}meta.content=mode==="dark"?c["--color-primary-900"]:c["--color-primary-500"]}}catch(e){}})()</script>`;
				return html.replace("</head>", `${script}\n</head>`);
			},
		},
		tanstackRouter({
			routesDirectory: "./src/routes",
			generatedRouteTree: "./src/routeTree.gen.ts",
			autoCodeSplitting: true,
		}),
		react(),
		tailwindcss(),
		VitePWA({
			registerType: "prompt",
			includeAssets: ["icon.svg", "apple-touch-icon-180x180.png"],
			manifest: {
				id: "/",
				name: "KanaSnap — Learn Japanese Kana",
				short_name: "KanaSnap",
				description:
					"Interactive Japanese Kana learning app. Master Hiragana and Katakana with charts, quizzes, stroke order animations, and smart analytics.",
				theme_color: "#f2709c",
				background_color: "#ffffff",
				display: "standalone",
				orientation: "portrait-primary",
				scope: "/",
				start_url: "/",
				lang: "en",
				categories: ["education", "productivity"],
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
						purpose: "maskable",
					},
				],
			},
			workbox: {
				globPatterns: ["**/*.{js,css,html,svg,png,woff2,wasm,onnx}"],
				maximumFileSizeToCacheInBytes: 13 * 1024 * 1024,
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
		{
			name: "svgMinify",
			apply: "build",
			closeBundle() {
				const outDir = "dist";
				const svgFiles: string[] = [];
				const collectSvgs = (dir: string) => {
					for (const entry of readdirSync(dir)) {
						const full = join(dir, entry);
						if (statSync(full).isDirectory()) {
							collectSvgs(full);
						} else if (entry.endsWith(".svg")) {
							svgFiles.push(full);
						}
					}
				};
				collectSvgs(outDir);
				let totalBefore = 0;
				let totalAfter = 0;
				for (const file of svgFiles) {
					const input = readFileSync(file, "utf-8");
					// Stroke SVGs are inlined into the same DOM (hiragana + katakana,
					// plus compound yoon like きゃ), so their IDs must stay unique
					// across files. The originals use Unicode-codepoint prefixes;
					// disable cleanupIds so SVGO doesn't collapse them all to a/b/c.
					const isStrokeSvg = file.includes(`${join(outDir, "strokesvg")}`);
					const result = optimize(input, {
						multipass: true,
						plugins: [
							{
								name: "preset-default",
								params: {
									overrides: isStrokeSvg ? { cleanupIds: false } : {},
								},
							},
						],
					});
					totalBefore += input.length;
					totalAfter += result.data.length;
					writeFileSync(file, result.data);
				}
				const saved = totalBefore - totalAfter;
				const pct =
					totalBefore > 0 ? ((saved / totalBefore) * 100).toFixed(1) : "0";
				console.log(
					`\n[svgMinify] Optimized ${svgFiles.length} SVGs: ${(totalBefore / 1024).toFixed(1)}KB → ${(totalAfter / 1024).toFixed(1)}KB (−${pct}%)`,
				);
			},
		},
	],
	build: {
		minify: "terser",
	},
});
