"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from '@/hooks/useAuth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function StudentPage() {
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    const checkUserType = async () => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().userType !== 'student') {
          router.push('/'); // Redirect to home if not a student
        }
      }
    };

    if (!authLoading) {
      checkUserType();
    }
  }, [user, authLoading, router]);

  const handleGenerateFlashcards = async () => {
    if (subject) {
      setLoading(true);
      try {
        // Generate flashcards and get a collection ID
        const res = await fetch("/api/flashcards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject, userType: "student" }),
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Failed to generate flashcards');

        router.push(`/flashcards?collection=${data.collectionId}`);
      } catch (error) {
        console.error('Error:', error);
        alert('Failed to generate flashcards. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleUpload = () => {
    router.push("/student/upload");
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
      <h1 className="text-3xl font-bold mb-6 text-white">Student Flashcard Generator</h1>
      <input
        className="p-2 border border-gray-300 rounded mb-4 text-black"
        type="text"
        placeholder="Enter a subject (e.g., Biology)"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
      />
      <button 
        onClick={handleGenerateFlashcards} 
        className="bg-green-500 text-white py-2 px-4 rounded mb-4"
        disabled={loading}
      >
        {loading ? 'Generating...' : 'Generate Flashcards'}
      </button>
      <button onClick={handleUpload} className="bg-blue-500 text-white py-2 px-4 rounded">
        Upload Textbook
      </button>
    </main>
  );
}