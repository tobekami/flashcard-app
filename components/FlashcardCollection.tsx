"use client";
import { useState, useEffect } from "react";
import Flashcard from "@/components/Flashcard"; // Import the Flashcard component

interface FlashcardData {
  question: string;
  answer: string;
  backgroundImage: string;
}

export default function FlashcardPage() {
  const [flashcards, setFlashcards] = useState<FlashcardData[]>([]);

  useEffect(() => {
    // Fetch flashcard data from your API
    const fetchFlashcards = async () => {
      const res = await fetch("/api/flashcards");
      const data = await res.json();
      setFlashcards(data.flashcards);
    };
    fetchFlashcards();
  }, []);

  const handleDelete = (index: number) => {
    const updatedFlashcards = flashcards.filter((_, i) => i !== index);
    setFlashcards(updatedFlashcards);
  };

  const handleDownload = () => {
    // Handle download functionality (e.g., create a PDF or image file)
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-3xl font-bold mb-6">Your Flashcards</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {flashcards.map((flashcard, index) => (
          <div key={index} className="relative">
            <Flashcard
              question={flashcard.question}
              answer={flashcard.answer}
              backgroundImage={flashcard.backgroundImage}
            />
            <div className="absolute inset-0 flex flex-col justify-center items-center opacity-0 hover:opacity-100 transition-opacity">
              <button
                onClick={() => handleDelete(index)}
                className="bg-red-500 text-white p-2 rounded mb-2"
              >
                Delete
              </button>
              <button
                onClick={handleDownload}
                className="bg-blue-500 text-white p-2 rounded"
              >
                Download
              </button>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={() => window.location.href = "/"}
        className="mt-6 bg-green-500 text-white py-2 px-4 rounded"
      >
        Generate More Flashcards
      </button>
    </main>
  );
}
