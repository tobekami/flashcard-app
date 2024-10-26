// components/CreateSetModal.tsx

import { useState } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

interface CreateSetModalProps {
  onClose: () => void;
  onSetCreated: () => void;
}

export default function CreateSetModal({ onClose, onSetCreated }: CreateSetModalProps) {
  const [setName, setSetName] = useState('');

  const handleCreateSet = async () => {
    if (!auth.currentUser) return;

    try {
      const setsRef = collection(db, 'users', auth.currentUser.uid, 'flashcardCollections');
      await addDoc(setsRef, {
        name: setName,
        createdAt: new Date(),
      });
      onSetCreated();
      onClose();
    } catch (error) {
      console.error('Error creating set:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg">
        <h2 className="text-2xl font-bold mb-4">Create New Set</h2>
        <input
          type="text"
          value={setName}
          onChange={(e) => setSetName(e.target.value)}
          placeholder="Enter set name"
          className="w-full p-2 border border-gray-300 rounded mb-4"
        />
        <div className="flex justify-end">
          <button onClick={onClose} className="mr-2 bg-gray-500 text-white py-2 px-4 rounded">
            Cancel
          </button>
          <button onClick={handleCreateSet} className="bg-blue-500 text-white py-2 px-4 rounded">
            Create Set
          </button>
        </div>
      </div>
    </div>
  );
}