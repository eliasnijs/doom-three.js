import path from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
	resolve: {
		alias: {
			'imgui-js': path.resolve(__dirname, 'node_modules/imgui-js/dist/imgui.umd.js'),
			'imgui_impl.js': path.resolve(
				__dirname,
				'node_modules/imgui-js/dist/imgui_impl.umd.js',
			),
		},
	},
})
