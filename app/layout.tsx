import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nutrition Dashboard",
  description: "Personal nutrition and calorie trend dashboard",
  applicationName: "Nutrition Dashboard",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Nutrition",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  // Vinext currently serializes `width` verbatim but omits Next's viewportFit field.
  // Keeping viewport-fit here ensures Mobile Safari actually receives the directive.
  width: "device-width, viewport-fit=cover",
  initialScale: 1,
  themeColor: "#07100f",
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
            __html: `try{var t=localStorage.getItem("nutrition-dashboard-theme");if(t==="instrument")document.documentElement.dataset.visualTheme="instrument";var u=new URL(location.href),p=u.searchParams,l=localStorage.getItem("nutrition-dashboard-language");if(!l&&t){l="zh";localStorage.setItem("nutrition-dashboard-language",l)}if(!p.has("lang")&&l==="zh"){p.set("lang","zh");location.replace(u.toString())}else if(p.get("lang")==="en"||p.get("lang")==="zh"){localStorage.setItem("nutrition-dashboard-language",p.get("lang"))}}catch(e){}`,
          }}
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
