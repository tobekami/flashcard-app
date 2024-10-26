// components/SetManagementModal.tsx

import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  backgroundImage: string;
}

interface SetManagementModalProps {
  setId: string;
  onClose: () => void;
  onUpdate: () => void;
}

export default function SetManagementModal({ setId, onClose, onUpdate }: SetManagementModalProps) {
  const [setName, setSetName] = useState('');
  const [newCardQuestion, setNewCardQuestion] = useState('');
  const [newCardAnswer, setNewCardAnswer] = useState('');
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);

  useEffect(() => {
    const fetchSet = async () => {
      if (!auth.currentUser) return;

      try {
        const setRef = doc(db, 'users', auth.currentUser.uid, 'flashcardCollections', setId);
        const setDoc = await getDoc(setRef);
        if (setDoc.exists()) {
          setSetName(setDoc.data().name);
          setFlashcards(setDoc.data().flashcards || []);
        }
      } catch (error) {
        console.error('Error fetching set:', error);
      }
    };

    fetchSet();
  }, [setId]);

  const handleRenameSet = async () => {
    if (!auth.currentUser) return;

    try {
      const setRef = doc(db, 'users', auth.currentUser.uid, 'flashcardCollections', setId);
      await updateDoc(setRef, { name: setName });
      onUpdate();
    } catch (error) {
      console.error('Error renaming set:', error);
    }
  };

  const handleAddCard = async () => {
    if (!auth.currentUser) return;

    const newCard: Flashcard = {
      id: Date.now().toString(), // Simple unique ID generation
      question: newCardQuestion,
      answer: newCardAnswer,
      backgroundImage: '', // You might want to add image upload functionality later
    };

    try {
      const setRef = doc(db, 'users', auth.currentUser.uid, 'flashcardCollections', setId);
      await updateDoc(setRef, {
        flashcards: arrayUnion(newCard)
      });
      setFlashcards([...flashcards, newCard]);
      setNewCardQuestion('');
      setNewCardAnswer('');
      onUpdate();
    } catch (error) {
      console.error('Error adding card:', error);
    }
  };

  const handleRemoveCard = async (cardId: string) => {
    if (!auth.currentUser) return;

    try {
      const setRef = doc(db, 'users', auth.currentUser.uid, 'flashcardCollections', setId);
      const cardToRemove = flashcards.find(card => card.id === cardId);
      if (cardToRemove) {
        await updateDoc(setRef, {
          flashcards: arrayRemove(cardToRemove)
        });
        setFlashcards(flashcards.filter(card => card.id !== cardId));
        onUpdate();
      }
    } catch (error) {
      console.error('Error removing card:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white p-6 rounded-lg max-w-2xl w-full">
        <h2 className="text-2xl font-bold mb-4">Manage Set</h2>
        <div className="mb-4">
          <input
            type="text"
            value={setName}
            onChange={(e) => setSetName(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
          />
          <button onClick={handleRenameSet} className="mt-2 bg-blue-500 text-white py-1 px-2 rounded">
            Rename Set
          </button>
        </div>
        <div className="mb-4">
          <h3 className="text-xl font-semibold mb-2">Add New Card</h3>
          <input
            type="text"
            placeholder="Question"
            value={newCardQuestion}
            onChange={(e) => setNewCardQuestion(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded mb-2"
          />
          <input
            type="text"
            placeholder="Answer"
            value={newCardAnswer}
            onChange={(e) => setNewCardAnswer(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded mb-2"
          />
          <button onClick={handleAddCard} className="bg-green-500 text-white py-1 px-2 rounded">
            Add Card
          </button>
        </div>
        <div className="mb-4">
          <h3 className="text-xl font-semibold mb-2">Flashcards</h3>
          {flashcards.map((card) => (
            <div key={card.id} className="flex justify-between items-center mb-2">
              <span>{card.question}</span>
              <button onClick={() => handleRemoveCard(card.id)} className="bg-red-500 text-white py-1 px-2 rounded">
                Remove
              </button>
            </div>
          ))}
        </div>
        <button onClick={onClose} className="bg-gray-500 text-white py-2 px-4 rounded">
          Close
        </button>
      </div>
    </div>
  );
}