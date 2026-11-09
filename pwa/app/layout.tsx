import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Registro de entrenamiento",
  description: "Registra tus sesiones y compártelas con tu entrenador AI.",
  manifest: "/app/manifest.webmanifest",
  icons: {
    icon: "/app/icon-192.png",
    apple: "/app/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
