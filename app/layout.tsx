import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "饮食 Dashboard",
  description: "私人饮食与营养趋势看板",
  applicationName: "饮食 Dashboard",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "饮食",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hans">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("nutrition-dashboard-theme");if(t==="instrument")document.documentElement.dataset.visualTheme="instrument"}catch(e){}`,
          }}
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
