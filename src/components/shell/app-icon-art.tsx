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
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#ffffff",
        borderRadius: rounded ? size * 0.22 : 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: size * 0.35,
          fontWeight: 900,
          letterSpacing: size * 0.01,
        }}
      >
        <span style={{ color: "#f37023" }}>S</span>
        <span style={{ color: "#7b2d8e" }}>K</span>
        <span style={{ color: "#00a8b5" }}>A</span>
      </div>
      <div
        style={{
          fontSize: size * 0.055,
          fontWeight: 800,
          letterSpacing: size * 0.01,
          color: "#000000",
          textTransform: "uppercase",
        }}
      >
        Sri Kameswari Agencies
      </div>
    </div>
  );
}
