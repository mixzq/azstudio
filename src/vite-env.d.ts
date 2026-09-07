/// <reference types="vite/client" />

interface Window {
  gtag?: (...args: unknown[]) => void;
  dataLayer?: unknown[];
  _uxa?: unknown[] & {
    push: (...args: unknown[]) => number;
  };
}
