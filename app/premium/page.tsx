"use client"

import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

export default function PremiumPage() {
  const handleCheckout = async () => {
    const stripe = await stripePromise;
    const { sessionId } = await fetch('/api/checkout', {
      method: 'POST',
    }).then(res => res.json());

    await stripe?.redirectToCheckout({ sessionId });
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-black">
      <h1 className="text-3xl font-bold mb-6">Go Premium</h1>
      <p className="mb-4">Unlock unlimited flashcards and other premium features.</p>
      <button onClick={handleCheckout} className="bg-yellow-500 text-white py-2 px-4 rounded">
        Upgrade Now
      </button>
    </main>
  );
}
