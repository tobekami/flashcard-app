"use client"

import { useState } from 'react';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db } from '@/lib/firebase';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    const storage = getStorage();
    const storageRef = ref(storage, `uploads/${file.name}`);
    
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed', 
      () => {}, 
      (error) => {
        console.error(error);
        setUploading(false);
        setMessage('Upload failed.');
      }, 
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        setUploading(false);
        setMessage('Upload successful! Processing...');
        
        // Here, you could call an API to process the file and generate flashcards
        // For simplicity, we're just logging the download URL
        console.log('File available at', downloadURL);
      }
    );
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-black">
      <h1 className="text-3xl font-bold mb-6">Upload Textbook</h1>
      <input type="file" onChange={handleFileChange} className="mb-4" />
      <button 
        onClick={handleUpload} 
        className={`bg-blue-500 text-white py-2 px-4 rounded ${uploading ? 'opacity-50' : ''}`}
        disabled={uploading}
      >
        {uploading ? 'Uploading...' : 'Upload'}
      </button>
      {message && <p className="mt-4">{message}</p>}
    </main>
  );
}
