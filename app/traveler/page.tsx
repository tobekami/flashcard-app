//app/traveler/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from '@/hooks/useAuth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function TravelerPage() {
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState<string | null>(null);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    const checkUserType = async () => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        if (userData) {
          setUserType(userData.userType);
        }
        if (userDoc.exists() && userData?.userType !== 'traveler') {
          router.push('/'); // Redirect to home if not a traveler
        }
      }
    };

    if (!authLoading) {
      checkUserType();
    }
  }, [user, authLoading, router]);

  const fetchTrivia = async () => {
    setLoading(true);
    try {
      console.log('Sending location:', location); // Debug log
  
      const res = await fetch("/api/trivia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location }),
      });
  
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Error response:', errorText);
        throw new Error(`HTTP error! status: ${res.status}`);
      }
  
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new TypeError("Oops, we haven't got JSON!");
      }
  
      const data = await res.json();
  
      // Generate flashcards
      const flashcardsRes = await fetch("/api/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location, trivia: data.trivia, userType: "traveler" }),
      });
  
      if (!flashcardsRes.ok) {
        const errorText = await flashcardsRes.text();
        console.error('Error response from flashcards:', errorText);
        throw new Error(`HTTP error! status: ${flashcardsRes.status}`);
      }
  
      const flashcardsData = await flashcardsRes.json();
  
      router.push(`/flashcards?collection=${flashcardsData.collectionId}`);
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to generate trivia flashcard. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-black">
      <h1 className="text-3xl font-bold mb-4 text-white">Traveler Trivia</h1>
      <input
        className="p-2 border border-gray-300 rounded mb-4 text-center text-black"
        type="text"
        placeholder="Enter your location"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
      />
      <button 
        onClick={fetchTrivia} 
        className="bg-blue-500 text-white py-2 px-4 rounded"
        disabled={loading}
      >
        {loading ? 'Loading...' : 'Get Trivia'}
      </button>
      <p className="text-white mb-4">
        Current user type: {userType || 'Unknown'}
      </p>
    </main>
  );
}