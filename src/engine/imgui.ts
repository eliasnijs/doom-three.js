import * as ImGui from "imgui-js";
import * as ImGui_Impl from "imgui_impl.js";
export { ImGui };
import { WebGLRenderer } from 'three'

export function imgui_end_frame() {
	ImGui.EndFrame();
}

export function imgui_render() {
	ImGui.Render();
	ImGui_Impl.RenderDrawData(ImGui.GetDrawData());
}

export function imgui_start_frame(time:number) {
	ImGui_Impl.NewFrame(time);
	ImGui.NewFrame();
}

export async function imgui_init(renderer:WebGLRenderer) {
	await ImGui.default();
	ImGui.CreateContext();
	ImGui.StyleColorsDark();
	ImGui_Impl.Init(renderer.domElement);
}

export function imgui_die() {
	ImGui_Impl.Shutdown();
	ImGui.DestroyContext();
}
