import {
  JetBrains_Mono,
  Inter,
  Space_Grotesk,
  DM_Sans,
  Fira_Code,
  Outfit,
  Plus_Jakarta_Sans,
  Playfair_Display,
  Source_Sans_3,
} from "next/font/google";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });
const firaCode = Fira_Code({
  subsets: ["latin"],
  variable: "--font-fira-code",
});
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
});
const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});
const sourceSans3 = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
});

export const metadata = {
  title: "Assessment Pipeline",
  description: "Candidate assessment pipeline dashboard",
};

export default function LandingPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const fontVars = [
    jetbrainsMono.variable,
    inter.variable,
    spaceGrotesk.variable,
    dmSans.variable,
    firaCode.variable,
    outfit.variable,
    plusJakarta.variable,
    playfairDisplay.variable,
    sourceSans3.variable,
  ].join(" ");

  return <div className={fontVars}>{children}</div>;
}
