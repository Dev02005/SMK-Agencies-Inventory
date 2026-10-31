/**
 * The SKA mark drawn for next/og, so the PNG icons match public/icon.svg.
 * `rounded` gives the desktop/Android "any" icon its corners; phones mask the full-bleed versions themselves.
 */
export function AppIconArt({ size, rounded }: { size: number; rounded: boolean }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0071e3",
        borderRadius: rounded ? size * 0.22 : 0,
        color: "#ffffff",
        fontSize: size * 0.3,
        fontWeight: 700,
        letterSpacing: size * 0.014,
        // The built-in og font has no bold; a white outline thickens the letters to match the SVG logo.
        WebkitTextStroke: `${size * 0.011}px #ffffff`,
      }}
    >
      SKA
    </div>
  );
}
