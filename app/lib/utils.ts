export function toHex(code: number, padding = 4): string {
  return code.toString(16).toUpperCase().padStart(padding, "0");
}

export function copyToClipboard(text: string): void {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(() => {
      fallbackCopyToClipboard(text);
    });
  } else {
    fallbackCopyToClipboard(text);
  }
}

function fallbackCopyToClipboard(text: string): void {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

export function getCodeSnippets(charCode: number): Array<{ label: string; val: string }> {
  const char = String.fromCodePoint(charCode);
  const hex = toHex(charCode);
  const dec = charCode.toString();

  return [
    { label: "HTML ENTITY", val: `&#x${hex};` },
    { label: "HTML DEC", val: `&#${dec};` },
    { label: "CSS / JS", val: `\\${hex}` },
    { label: "JSON", val: `\\u${hex.padStart(4, "0")}` },
    { label: "PYTHON", val: `u"\\u${hex.padStart(4, "0")}"` },
    { label: "URL ENC", val: encodeURIComponent(char) },
  ];
}
