const RAW = Symbol("raw");

export interface RawHtml {
  [RAW]: true;
  value: string;
}

export function raw(value: string): RawHtml {
  return { [RAW]: true, value };
}

export function isRaw(value: unknown): value is RawHtml {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as RawHtml)[RAW] === true
  );
}

export function escape(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (isRaw(value)) return value.value;
  if (Array.isArray(value)) return value.map(escape).join("");
  const s = String(value);
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    switch (ch) {
      case 38: // &
        out += "&amp;";
        break;
      case 60: // <
        out += "&lt;";
        break;
      case 62: // >
        out += "&gt;";
        break;
      case 34: // "
        out += "&quot;";
        break;
      case 39: // '
        out += "&#39;";
        break;
      default:
        out += s[i];
    }
  }
  return out;
}

export function html(
  strings: TemplateStringsArray,
  ...values: unknown[]
): RawHtml {
  let out = "";
  for (let i = 0; i < strings.length; i++) {
    out += strings[i];
    if (i < values.length) {
      out += escape(values[i]);
    }
  }
  return raw(out);
}

export function render(value: RawHtml | string): string {
  if (typeof value === "string") return escape(value);
  return value.value;
}
