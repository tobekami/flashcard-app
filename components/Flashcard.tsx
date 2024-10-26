// components/Flashcard.tsx

"use client";
import { useState } from "react";

interface FlashcardProps {
  question: string;
  answer: string;
  backgroundImage: string;
}

export default function Flashcard({ question, answer, backgroundImage }: FlashcardProps) {
  const [showAnswer, setShowAnswer] = useState(false);

  return (
    <div
      className="relative h-64 rounded-lg overflow-hidden cursor-pointer"
      onClick={() => setShowAnswer(!showAnswer)}
    >
      <img 
        src={backgroundImage || '/default-image.jpg'} 
        alt="Flashcard background" 
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col justify-center items-center p-4 text-white">
        <p className="text-lg font-semibold mb-2 text-center">
          {showAnswer ? answer : question}
        </p>
      </div>
    </div>
  );
}