import Script from "next/script";
import { MARKUP } from "./markup";

export default function Home() {
  return (
    <>
      <div id="root" dangerouslySetInnerHTML={{ __html: MARKUP }} suppressHydrationWarning />
      <Script src="/app.js" strategy="afterInteractive" />
    </>
  );
}
