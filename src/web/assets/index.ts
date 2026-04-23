import htmxJs from "./htmx.min.js" with { type: "text" };
import appCss from "./app.css" with { type: "text" };
import appJs from "./app.js" with { type: "text" };

export const HTMX_JS = htmxJs as unknown as string;
export const APP_CSS = appCss as unknown as string;
export const APP_JS = appJs as unknown as string;
