import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc, arrayUnion, arrayRemove, addDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  picture: string;
}

interface FlashcardSet {
  id: string;
  name: string;
  cards: string[];
}

interface DashboardFlashcardModalProps {
  set: FlashcardSet;
  userType: string;
  userId: string;
  onClose: () => void;
  onUpdate: () => Promise<void>;
}

const DashboardFlashcardModal: React.FC<DashboardFlashcardModalProps> = ({ set, userType, userId, onClose, onUpdate }) => {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealedCards, setRevealedCards] = useState<Set<string>>(new Set());
  const [collections, setCollections] = useState<FlashcardSet[]>([]);
  const [mode, setMode] = useState<'view' | 'select' | 'move' | 'delete'>('view');
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [selectedCollection, setSelectedCollection] = useState<string>('');
  const [newCollectionName, setNewCollectionName] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const cardsRef = collection(db, 'users', userId, `${userType}_cards`);
        const cardSnapshot = await getDocs(cardsRef);
        const fetchedCards = cardSnapshot.docs
          .filter(doc => set.cards.includes(doc.id))
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          } as Flashcard));
        setFlashcards(fetchedCards);

        const collectionsRef = collection(db, 'users', userId, `${userType}_collections`);
        const collectionsSnapshot = await getDocs(collectionsRef);
        const fetchedCollections = collectionsSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name || doc.data().collectionName,
          cards: doc.data().cards || []
        } as FlashcardSet));
        setCollections(fetchedCollections);

        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [set, userType, userId]);

  const toggleReveal = (cardId: string) => {
    setRevealedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  };

  const toggleCardSelection = (cardId: string) => {
    setSelectedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  };

  const moveCards = async () => {
    if (!selectedCollection && !newCollectionName) return;

    try {
      let targetCollectionId = selectedCollection;

      if (newCollectionName) {
        const collectionsRef = collection(db, 'users', userId, `${userType}_collections`);
        const newCollectionRef = await addDoc(collectionsRef, {
          collectionName: newCollectionName,
          name: newCollectionName,
          cards: Array.from(selectedCards)
        });
        targetCollectionId = newCollectionRef.id;

        setCollections([...collections, { id: newCollectionRef.id, name: newCollectionName, cards: Array.from(selectedCards) }]);
      } else {
        const targetCollectionRef = doc(db, 'users', userId, `${userType}_collections`, targetCollectionId);
        await updateDoc(targetCollectionRef, {
          cards: arrayUnion(...Array.from(selectedCards))
        });

        setCollections(collections.map(c => 
          c.id === targetCollectionId 
            ? { ...c, cards: [...c.cards, ...Array.from(selectedCards)] }
            : c
        ));
      }

      const sourceCollectionRef = doc(db, 'users', userId, `${userType}_collections`, set.id);
      await updateDoc(sourceCollectionRef, {
        cards: arrayRemove(...Array.from(selectedCards))
      });

      setFlashcards(prev => prev.filter(card => !selectedCards.has(card.id)));
      setSelectedCards(new Set());
      setMode('view');
      setNewCollectionName('');
      setSelectedCollection('');

      onClose();
    } catch (error) {
      console.error('Error moving cards:', error);
    }
  };

  const deleteCards = async () => {
    try {
      const batch = writeBatch(db);

      // Remove cards from the current set
      const sourceCollectionRef = doc(db, 'users', userId, `${userType}_collections`, set.id);
      await updateDoc(sourceCollectionRef, {
        cards: arrayRemove(...Array.from(selectedCards))
      });

      // Delete the cards
      selectedCards.forEach(cardId => {
        const cardRef = doc(db, 'users', userId, `${userType}_cards`, cardId);
        batch.delete(cardRef);
      });

      await batch.commit();

      // Update local state
      setFlashcards(prev => prev.filter(card => !selectedCards.has(card.id)));
      setSelectedCards(new Set());
      setMode('view');

      // Notify parent component to update
      onClose();
    } catch (error) {
      console.error('Error deleting cards:', error);
    }
  };

  const renderHeader = () => {
    switch (mode) {
      case 'select':
        return 'Select cards to move';
      case 'move':
        return 'Select or create a collection';
      case 'delete':
        return 'Select cards to delete';
      default:
        return set.name;
    }
  };

  const renderBody = () => {
    if (mode === 'move') {
      return (
        <div className="space-y-4">
          <select 
            className="w-full p-2 border rounded text-gray-700"
            value={selectedCollection}
            onChange={(e) => setSelectedCollection(e.target.value)}
          >
            <option value="">Select a collection</option>
            {collections.filter(c => c.id !== set.id).map(collection => (
              <option key={collection.id} value={collection.id}>
                {collection.name}
              </option>
            ))}
          </select>
          <div className="flex space-x-2">
            <input
              type="text"
              className="flex-grow p-2 border rounded text-gray-700"
              placeholder="New collection name"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
            />
          </div>
          <button 
            className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors w-full"
            onClick={moveCards}
            disabled={(!selectedCollection && !newCollectionName) || selectedCards.size === 0}
          >
            {newCollectionName ? 'Create and Move Cards' : 'Move Cards'}
          </button>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[70vh] overflow-y-auto">
        {flashcards.map((card) => (
          <div 
            key={card.id} 
            className={`relative h-64 rounded-lg overflow-hidden cursor-pointer ${
              (mode === 'select' || mode === 'delete') && selectedCards.has(card.id) ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => (mode === 'select' || mode === 'delete') ? toggleCardSelection(card.id) : toggleReveal(card.id)}
          >
            <img 
              src={card.picture || '/default-image.jpg'} 
              alt="Flashcard background" 
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col justify-center items-center p-4 text-white">
              <p className="text-lg font-semibold mb-2 text-center">
                {revealedCards.has(card.id) ? card.answer : card.question}
              </p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderButtons = () => {
    switch (mode) {
      case 'view':
        return (
          <>
            <button 
              onClick={onClose} 
              className="bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600 transition-colors"
            >
              Close
            </button>
            <button 
              onClick={() => setMode('select')} 
              className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors"
            >
              Move Cards
            </button>
            <button 
              onClick={() => setMode('delete')} 
              className="bg-yellow-500 text-white py-2 px-4 rounded hover:bg-yellow-600 transition-colors"
            >
              Delete Cards
            </button>
          </>
        );
      case 'select':
        return (
          <>
            <button 
              onClick={() => {
                setMode('view');
                setSelectedCards(new Set());
              }} 
              className="bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={() => setMode('move')} 
              className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors"
              disabled={selectedCards.size === 0}
            >
              Select Cards ({selectedCards.size})
            </button>
          </>
        );
      case 'move':
        return (
          <button 
            onClick={() => setMode('select')} 
            className="bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600 transition-colors"
          >
            Back
          </button>
        );
      case 'delete':
        return (
          <>
            <button 
              onClick={() => {
                setMode('view');
                setSelectedCards(new Set());
              }} 
              className="bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={deleteCards} 
              className="bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600 transition-colors"
              disabled={selectedCards.size === 0}
            >
              Delete Selected ({selectedCards.size})
            </button>
          </>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white p-6 rounded-lg w-full max-w-4xl m-4">
        <h2 className="text-2xl text-black font-bold mb-4">{renderHeader()}</h2>
        {loading ? (
          <p>Loading flashcards...</p>
        ) : (
          renderBody()
        )}
        <div className="mt-6 flex justify-between">
          {renderButtons()}
        </div>
      </div>
    </div>
  );
};

export default DashboardFlashcardModal;