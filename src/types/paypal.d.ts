/** PayPal JS SDK v6 (browser) and the <paypal-button> custom element. */

type PayPalApproveData = { orderId: string; payerId?: string };

type PayPalOneTimeSession = {
  start: (
    options: { presentationMode?: "auto" | "popup" | "modal" | "redirect"; fullPageOverlay?: { enabled: boolean } },
    order: Promise<{ orderId: string }>
  ) => Promise<void>;
  cancel?: () => void;
  destroy?: () => void;
};

type PayPalSdkInstance = {
  createPayPalOneTimePaymentSession: (opts: {
    onApprove: (data: PayPalApproveData) => void | Promise<void>;
    onCancel?: (data: unknown) => void;
    onError?: (err: unknown) => void;
    onComplete?: (data: unknown) => void;
  }) => PayPalOneTimeSession;
  findEligibleMethods?: (opts?: { currencyCode?: string }) => Promise<{ isEligible: (m: string) => boolean }>;
};

interface Window {
  paypal?: {
    createInstance: (opts: {
      clientId?: string;
      clientToken?: string;
      components: string[];
      pageType?: string;
      locale?: string;
    }) => Promise<PayPalSdkInstance>;
  };
}

declare namespace React.JSX {
  interface IntrinsicElements {
    "paypal-button": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & { type?: string };
  }
}
