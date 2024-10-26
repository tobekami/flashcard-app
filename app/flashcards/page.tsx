"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { auth, db } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'
import FlashcardModal from '@/components/FlashcardModal'
import withAuth from '../../components/WithAuth'
import { GraduationCap, Plane, Book, ArrowRight } from 'lucide-react'

function FlashcardGeneratorPage() {
  const [input, setInput] = useState("")
  const [userType, setUserType] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [generatedFlashcards, setGeneratedFlashcards] = useState([])
  const router = useRouter()

  useEffect(() => {
    const checkUserType = async () => {
      if (auth.currentUser) {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid))
        if (userDoc.exists()) {
          setUserType(userDoc.data().userType)
        } else {
          router.push('/')
        }
      }
    }

    checkUserType()
  }, [router])

  const handleGenerateFlashcards = async () => {
    if (input && userType) {
      setLoading(true)
      try {
        const res = await fetch("/api/flashcards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            [userType === "traveler" ? "location" : "subject"]: input,
            userType,
            userId: auth.currentUser?.uid,
          }),
        })

        if (!res.ok) {
          const errorText = await res.text()
          console.error('Error response:', errorText)
          throw new Error(`HTTP error! status: ${res.status}`)
        }

        const data = await res.json()
        setGeneratedFlashcards(data.flashcards)
        setShowModal(true)
      } catch (error) {
        console.error('Error:', error)
        alert('Failed to generate flashcards. Please try again.')
      } finally {
        setLoading(false)
      }
    }
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setGeneratedFlashcards([])
  }

  const handleViewDashboard = () => {
    router.push("/dashboard")
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-purple-100 flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-800 flex items-center justify-center">
          {userType === "traveler" ? (
            <>
              <Plane className="mr-2" />
              Traveler Trivia
            </>
          ) : (
            <>
              <GraduationCap className="mr-2" />
              Student Flashcards
            </>
          )}
        </h1>
        <div className="mb-6">
          <label htmlFor="input" className="block text-sm font-medium text-gray-700 mb-2">
            {userType === "traveler" ? "Enter your location" : "Enter a subject (e.g., Biology)"}
          </label>
          <input
            id="input"
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            type="text"
            placeholder={userType === "traveler" ? "e.g., Paris, France" : "e.g., Biology"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </div>
        <button 
          onClick={handleGenerateFlashcards} 
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 flex items-center justify-center"
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating...
            </span>
          ) : (
            <>
              Generate Flashcards
              <Book className="ml-2" />
            </>
          )}
        </button>
        <button 
          onClick={handleViewDashboard}
          className="w-full mt-4 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition duration-200 flex items-center justify-center"
        >
          View Dashboard
          <ArrowRight className="ml-2" />
        </button>
      </div>
      <p className="mt-4 text-sm text-gray-600">Current user type: {userType}</p>
      {showModal && (
        <FlashcardModal 
          flashcards={generatedFlashcards} 
          onClose={handleCloseModal}
          userType={userType || ''}
        />
      )}
    </div>
  )
}

export default withAuth(FlashcardGeneratorPage)