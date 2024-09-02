import { Html, Head, Main, NextScript } from "next/document";
import Nav from "@/components/Nav";

export default function Document() {
  return (
    <Html lang="en">
      <Head />
      <body className="bg-c0 text-white">
        <Nav />
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
