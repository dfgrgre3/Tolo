import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="ar" dir="rtl">
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* تم حذف كود تعديل setAttribute نهائيًا */}
      </Head>
      <Main />
      <NextScript />
    </Html>
  );
}
