import type { ReactElement } from "react";
import BackgroundPicker from "../background-picker";
import Keybindings from "../keybindings";
import ThemePicker from "../theme-picker";
import UnlockPicker from "../unlock-picker";
import type { ViewName } from "./core/routes";

// In-extension views the menu pushes for the rows in VIEW_OVERRIDES.
export const VIEWS: Record<ViewName, () => ReactElement> = {
  "theme-picker": ThemePicker,
  "background-picker": BackgroundPicker,
  "unlock-picker": UnlockPicker,
  keybindings: Keybindings,
};
