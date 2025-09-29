import { Html, Head, Main, NextScript } from 'next/document';
import clsx from 'clsx';
import { Footer, NavigationBar } from '@/components';

const Document = () => {
  return (
    <Html lang="en">
      <Head />
      <body className={clsx('min-h-screen bg-background font-sans antialiased')}>
        <NavigationBar/>
        <Main />
        <Footer/>
        <NextScript />
      </body>
    </Html>
  );
};

export default Document;
