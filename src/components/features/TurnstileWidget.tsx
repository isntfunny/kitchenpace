'use client';

/**
 * Cloudflare Turnstile Widget Component
 * Renders an invisible captcha challenge on registration
 * Injects a token into a hidden form field when complete
 */

import { useCallback, useEffect, useRef } from 'react';

interface TurnstileWidgetProps {
  /**
   * Callback fired when the challenge completes (token available)
   */
  onVerify?: (token: string) => void;

  /**
   * Callback fired if challenge times out or fails
   */
  onError?: (error: Error) => void;
}

export function TurnstileWidget({ onVerify, onError }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tokenRef = useRef<string>('');

  const renderTurnstile = useCallback(() => {
    if (!window.turnstile || !containerRef.current) return;

    window.turnstile.render(containerRef.current, {
      sitekey: process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY || '',
      theme: 'light',
      callback: (token: string) => {
        tokenRef.current = token;
        // Inject token into hidden form field
        const hiddenInput = document.getElementById('cf-turnstile-response') as HTMLInputElement;
        if (hiddenInput) {
          hiddenInput.value = token;
        }
        if (onVerify) {
          onVerify(token);
        }
      },
      'error-callback': () => {
        const error = new Error('Turnstile challenge failed');
        if (onError) {
          onError(error);
        }
      },
      'expired-callback': () => {
        const error = new Error('Turnstile token expired');
        if (onError) {
          onError(error);
        }
      },
    });
  }, [onVerify, onError]);

  useEffect(() => {
    // Load Turnstile script
    if (!window.turnstile) {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);

      script.onload = () => {
        renderTurnstile();
      };
    } else {
      renderTurnstile();
    }

    const containerElement = containerRef.current;

    return () => {
      // Reset Turnstile on unmount
      if (window.turnstile && containerElement) {
        window.turnstile.reset();
      }
    };
  }, [renderTurnstile]);

  return (
    <>
      {/* Visible Turnstile container */}
      <div ref={containerRef} className="cf-turnstile" />

      {/* Hidden form field for token submission */}
      <input
        type="hidden"
        id="cf-turnstile-response"
        name="cf-turnstile-response"
        defaultValue=""
      />
    </>
  );
}

/**
 * Type augmentation for Turnstile API
 */
declare global {
  interface Window {
    turnstile: {
      render(container: string | HTMLElement, options: Record<string, any>): void;
      reset(containerId?: string): void;
      remove(containerId?: string): void;
      getResponse(containerId?: string): string;
    };
  }
}
