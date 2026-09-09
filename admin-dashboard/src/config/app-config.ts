import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "NIRIKSHAN-AI",
  version: packageJson.version,
  copyright: `© ${currentYear}, NIRIKSHAN-AI.`,
  meta: {
    title: "NIRIKSHAN-AI - MPLADS Risk Intelligence",
    description:
      "NIRIKSHAN-AI is an explainable MPLADS risk-intelligence workspace that helps officials find which works need attention first, and why.",
  },
};
