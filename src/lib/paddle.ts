// Paddle v2 API integration
// Uses client-side token for initialization and price IDs for checkout
const PADDLE_SRC = 'https://cdn.paddle.com/paddle/v2/paddle.js';

let isLoaded = false;
let isInitialized = false;
let loadPromise: Promise<void> | null = null;

function loadPaddleScript(): Promise<void> {
  if (isLoaded) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = PADDLE_SRC;
    script.async = true;
    script.onload = () => {
      isLoaded = true;
      
      // Set sandbox environment immediately after script loads
      // This MUST happen before Initialize
      const env = import.meta.env as unknown as Record<string, string | undefined>;
      const sandboxMode = env.VITE_PADDLE_SANDBOX === 'true';
      const win = window as unknown as Window & { Paddle?: PaddleGlobal };
      
      if (sandboxMode && win.Paddle && win.Paddle.Environment) {
        win.Paddle.Environment.set('sandbox');
        console.log('[Paddle] Sandbox mode enabled');
      } else if (sandboxMode) {
        console.log('[Paddle] Sandbox mode requested but Paddle.Environment not available yet');
      }
      
      resolve();
    };
    script.onerror = () => reject(new Error('Failed to load Paddle script'));
    document.head.appendChild(script);
  });

  return loadPromise;
}

type PaddleGlobal = {
  Initialize: (opts: { token: string; pwCustomer?: Record<string, unknown> }) => Promise<void>;
  Checkout?: { open: (opts: Record<string, unknown>) => void };
  Environment?: { set: (env: string) => void };
};

async function setupPaddle(): Promise<void> {
  if (isInitialized) return;

  const env = import.meta.env as unknown as Record<string, string | undefined>;
  const clientToken = env.VITE_PADDLE_CLIENT_TOKEN || (window as unknown as Window & { VITE_PADDLE_CLIENT_TOKEN?: string }).VITE_PADDLE_CLIENT_TOKEN;
  if (!clientToken) {
    console.warn('[Paddle] VITE_PADDLE_CLIENT_TOKEN not set. Paddle will not be initialised.');
    return;
  }

  const win = window as unknown as Window & { Paddle?: PaddleGlobal };
  if (!win.Paddle) {
    console.warn('[Paddle] Script not found on window when attempting to setup.');
    return;
  }

  try {
    console.log('[Paddle] Initializing with client token:', clientToken.substring(0, 10) + '...');
    await win.Paddle.Initialize({ token: clientToken });
    isInitialized = true;
    console.log('[Paddle] Initialized successfully');
  } catch (err) {
    console.error('[Paddle] Initialize threw an error:', err);
    throw err;
  }
}

export async function ensurePaddle(): Promise<void> {
  await loadPaddleScript();
  await setupPaddle();
}

export async function openCheckout(priceId: string, options: Record<string, unknown> = {}): Promise<void> {
  await ensurePaddle();

  if (!priceId) {
    throw new Error('Price ID is required to open checkout');
  }

  const win = window as unknown as Window & { Paddle?: PaddleGlobal };
  const Paddle = win.Paddle;
  if (!Paddle || !Paddle.Checkout) {
    throw new Error('Paddle.Checkout is not available');
  }

  try {
    // Paddle v2 requires items array with priceId
    const checkoutOptions = {
      items: [
        {
          priceId,
          quantity: 1,
        },
      ],
      ...options,
    };

    console.log('[Paddle] Opening checkout with price ID:', priceId);
    console.log('[Paddle] Environment:', import.meta.env.VITE_PADDLE_SANDBOX === 'true' ? 'sandbox' : 'production');
    console.log('[Paddle] Checkout options:', checkoutOptions);
    
    // Open checkout - Paddle v2 will validate the priceId and token
    Paddle.Checkout.open(checkoutOptions);
    
    console.log('[Paddle] Checkout opened successfully');
  } catch (err) {
    console.error('[Paddle] Error opening checkout:', err);
    throw err;
  }
}

export default {
  ensurePaddle,
  openCheckout,
};
