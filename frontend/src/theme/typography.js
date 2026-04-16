const fontFamily =
  '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const typography = {
  fontFamily,
  fontSize: 14,
  htmlFontSize: 16,
  fontWeightLight: 400,
  fontWeightRegular: 400,
  fontWeightMedium: 500,
  fontWeightBold: 700,
  h1: { fontFamily, fontSize: "2rem", fontWeight: 700, lineHeight: 1.2, letterSpacing: "-0.02em" },
  h2: { fontFamily, fontSize: "1.5rem", fontWeight: 700, lineHeight: 1.25, letterSpacing: "-0.01em" },
  h3: { fontFamily, fontSize: "1.25rem", fontWeight: 600, lineHeight: 1.3 },
  h4: { fontFamily, fontSize: "1.125rem", fontWeight: 600, lineHeight: 1.35 },
  h5: { fontFamily, fontSize: "1rem", fontWeight: 600, lineHeight: 1.4 },
  h6: { fontFamily, fontSize: "0.875rem", fontWeight: 600, lineHeight: 1.4 },
  subtitle1: { fontFamily, fontSize: "0.95rem", fontWeight: 500, lineHeight: 1.5 },
  subtitle2: { fontFamily, fontSize: "0.8125rem", fontWeight: 500, lineHeight: 1.5 },
  body1: { fontFamily, fontSize: "0.875rem", fontWeight: 400, lineHeight: 1.55 },
  body2: { fontFamily, fontSize: "0.8125rem", fontWeight: 400, lineHeight: 1.55 },
  caption: { fontFamily, fontSize: "0.75rem", fontWeight: 400, lineHeight: 1.4 },
  overline: {
    fontFamily,
    fontSize: "0.6875rem",
    fontWeight: 700,
    lineHeight: 1.6,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  button: {
    fontFamily,
    fontSize: "0.8125rem",
    fontWeight: 600,
    letterSpacing: "0.01em",
    textTransform: "none",
  },
};

export default typography;
