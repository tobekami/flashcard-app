// components/FlashcardModal.tsx

import { useState, useEffect } from 'react';
import Flashcard from './Flashcard';
import { collection, getDocs, updateDoc, doc, arrayUnion, arrayRemove, addDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';

interface FlashcardModalProps {
  flashcards: Array<{
    id: string;
    question: string;
    answer: string;
    backgroundImage: string;
  }>;
  onClose: () => void;
  userType: string;
}

export default function FlashcardModal({ flashcards, onClose, userType }: FlashcardModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [collections, setCollections] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedCollection, setSelectedCollection] = useState('Select a collection');
  const [newCollectionName, setNewCollectionName] = useState('');

  useEffect(() => {
    const fetchCollections = async () => {
      if (!auth.currentUser) return;
      
      const collectionsRef = collection(db, 'users', auth.currentUser.uid, `${userType}_collections`);
      const snapshot = await getDocs(collectionsRef);
      const fetchedCollections = snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().collectionName }));
      setCollections(fetchedCollections);
    };

    fetchCollections();
  }, [userType]);

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % flashcards.length);
  };

  const handlePrevious = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + flashcards.length) % flashcards.length);
  };

  const handleAddToCollection = async () => {
    if (!selectedCollection || !auth.currentUser) return;
  
    const userId = auth.currentUser.uid;
  
    try {
      const defaultCollectionRef = doc(db, 'users', userId, `${userType}_collections`, 'default');
      const defaultCollectionDoc = await getDoc(defaultCollectionRef);

    if (defaultCollectionDoc.exists()) {
      await updateDoc(defaultCollectionRef, {
        cards: arrayRemove(...flashcards.map(card => card.id))  // Remove the card IDs from the default collection
      });
    }
  
      // Then, add all flashcards to the selected collection
      const selectedCollectionRef = doc(db, 'users', userId, `${userType}_collections`, selectedCollection);
      await updateDoc(selectedCollectionRef, {
        cards: arrayUnion(...flashcards.map(card => card.id))
      });
  
      alert('All cards added to the selected collection successfully!');
    } catch (error) {
      console.error('Error updating collections:', error);
      alert('Failed to update collections. Please try again.');
    }
  };

  const handleCreateCollection = async () => {
    if (!newCollectionName || !auth.currentUser) return;

    try {
      const defaultCollectionRef = doc(db, 'users', auth.currentUser.uid, `${userType}_collections`, 'default');
      const defaultCollectionDoc = await getDoc(defaultCollectionRef);

      if (defaultCollectionDoc.exists()) {
        await updateDoc(defaultCollectionRef, {
          cards: arrayRemove(...flashcards.map(card => card.id))  // Remove the card IDs from the default collection
        });
      }

      const collectionsRef = collection(db, 'users', auth.currentUser.uid, `${userType}_collections`);
      const newCollectionRef = await addDoc(collectionsRef, {
        collectionName: newCollectionName,
        cards: flashcards.map(card => card.id) // Add all cards to the new collection
      });

      setCollections([...collections, { id: newCollectionRef.id, name: newCollectionName }]);
      setNewCollectionName('');
      setSelectedCollection(newCollectionRef.id); // Select the newly created collection
      alert('New collection created and all cards added successfully!');
    } catch (error) {
      console.error('Error creating new collection:', error);
      alert('Failed to create new collection. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white p-6 rounded-lg w-full max-w-4xl m-4">
        <h2 className="text-2xl font-bold mb-4">Generated Flashcards</h2>
        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-1/2">
            <Flashcard {...flashcards[currentIndex]} />
            <div className="flex justify-between mt-4">
              <button onClick={handlePrevious} className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors">
                Previous
              </button>
              <button onClick={handleNext} className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors">
                Next
              </button>
            </div>
          </div>
          <div className="w-full md:w-1/2 flex flex-col gap-4">
            <div>
              <select 
                value={selectedCollection} 
                onChange={(e) => setSelectedCollection(e.target.value)}
                className="w-full border text-gray-700 rounded p-2 mb-2"
              >
                <option value="">Select a collection</option>
                {collections.map((collection) => (
                  <option key={collection.id} value={collection.id}>{collection.name}</option>
                ))}
              </select>
              <button 
                onClick={handleAddToCollection} 
                className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 transition-colors"
                disabled={!selectedCollection}
              >
                Add Cards to Collection
              </button>
            </div>
            <div>
              <input
                type="text"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                placeholder="New collection name"
                className="w-full border text-gray-700 rounded p-2 mb-2"
              />
              <button
                onClick={handleCreateCollection}
                className="w-full bg-purple-500 text-white py-2 px-4 rounded hover:bg-purple-600 transition-colors"
                disabled={!newCollectionName}
              >
                Create New Collection
              </button>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="mt-6 bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600 transition-colors">
          Close
        </button>
      </div>
    </div>
  );
}
