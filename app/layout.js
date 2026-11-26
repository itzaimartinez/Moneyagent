import "./globals.css";

export const metadata = {
  title: "moneyagent",
  description: "Anota tus gastos en segundos, organiza tu quincena, paga tus tarjetas a tiempo y junta para tus metas. Funciona sin internet.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "moneyagent", statusBarStyle: "default" },
  icons: { icon: "/icon-192.png", apple: "/apple-touch-icon.png" },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F3F5F7" },
    { media: "(prefers-color-scheme: dark)", color: "#0C1220" },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="es-MX">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Figtree:wght@400;500;600;700&display=swap" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body>{children}</body>
    </html>
  );
}
