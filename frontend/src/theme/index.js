import { createTheme } from "@mui/material/styles";
import palette from "./palette";
import typography from "./typography";
import shape from "./shape";
import shadows from "./shadows";
import components from "./components";

const theme = createTheme({
  palette,
  typography,
  shape,
  shadows,
  components,
});

export default theme;
export * from "./tokens";
