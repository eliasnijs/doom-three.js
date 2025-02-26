import { ImGui } from './engine/imgui.ts';

export function gui_debug_window(time_ms, state) {
	ImGui.SetNextWindowPos(new ImGui.Vec2(20, 20), ImGui.Cond.FirstUseEver);
	ImGui.Begin("General Controls");
	ImGui.Text(`Time: ${(time_ms/1000).toFixed(2)}s`)
	ImGui.Text(`dt:   ${((time_ms - state.last_time_ms)).toFixed(2)}ms`)
	ImGui.Text(`fps:  ${(1000/(time_ms - state.last_time_ms)).toFixed(2)}`)
	ImGui.Separator();
	ImGui.ColorEdit3("clear color", state.clear_color);
	ImGui.Separator();
	const cube = state.instances[0];
	if (cube) {
		ImGui.Text(`Cube: ${cube.uuid.toString()}`);
		ImGui.ColorEdit3("color", cube.material.color);
		ImGui.Checkbox("visible", (value = cube.visible) => cube.visible = value);
		ImGui.SliderFloat3("position", cube.position, -5, 5);
		ImGui.SliderFloat3("rotation", cube.rotation, -Math.PI, Math.PI);
		ImGui.SliderFloat3("scale", cube.scale, 0.1, 3);
	}
	ImGui.End();
}

