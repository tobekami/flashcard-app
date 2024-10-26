"use client"

import { useEffect, useState, useCallback } from 'react'
import { collection, getDocs, deleteDoc, doc, getDoc } from 'firebase/firestore'
import { db, auth } from '@/lib/firebase'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import CreateSetModal from '../../components/CreateSetModal'
import SetManagementModal from '../../components/SetManagementModal'
import DashboardFlashcardModal from '../../components/DashboardFlashcardModal'
import { Plus, Trash, Share2, Download, Settings, Layers, X } from 'lucide-react'

type FlashcardSet = {
  id: string
  collectionName: string
  cards: string[]
  name: string
}

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [flashcardSets, setFlashcardSets] = useState<FlashcardSet[]>([])
  const [userType, setUserType] = useState<string | null>(null)
  const [showCreateSetModal, setShowCreateSetModal] = useState(false)
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null)
  const [showSetManagementModal, setShowSetManagementModal] = useState(false)
  const [mergeMode, setMergeMode] = useState(false)
  const [selectedSetsForMerge, setSelectedSetsForMerge] = useState<string[]>([])
  const [selectedSet, setSelectedSet] = useState<FlashcardSet | null>(null)
  const [showDashboardFlashcardModal, setShowDashboardFlashcardModal] = useState(false)

  const fetchFlashcardSets = useCallback(async () => {
    if (!user) {
      router.push('/login')
      return
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid))
      const fetchedUserType = userDoc.data()?.userType
      setUserType(fetchedUserType)

      const setsRef = collection(db, 'users', user.uid, `${fetchedUserType}_collections`)
      const snapshot = await getDocs(setsRef)
      const fetchedSets = snapshot.docs.map(setDoc => ({
        id: setDoc.id,
        ...setDoc.data()
      } as FlashcardSet))
      setFlashcardSets(fetchedSets)
    } catch (error) {
      console.error('Error fetching flashcard sets:', error)
    }
  }, [user, router])

  useEffect(() => {
    if (!loading) {
      fetchFlashcardSets()
    }
  }, [fetchFlashcardSets, loading])

  const handleShareSet = (setId: string) => {
    console.log('Share set:', setId)
  }

  const handleDownloadSet = (set: FlashcardSet) => {
    console.log('Download set:', set)
  }

  const handleGenerateMore = () => {
    router.push('/flashcards')
  }

  const handleCreateSet = () => {
    setShowCreateSetModal(true)
  }

  const handleDeleteSet = async (setId: string) => {
    if (!user || !userType) return

    try {
      await deleteDoc(doc(db, 'users', user.uid, `${userType}_collections`, setId))
      setFlashcardSets(prevSets => prevSets.filter(set => set.id !== setId))
    } catch (error) {
      console.error('Error deleting flashcard set:', error)
    }
  }

  const handleSetCreated = () => {
    fetchFlashcardSets()
  }

  const handleManageSet = (setId: string) => {
    setSelectedSetId(setId)
    setShowSetManagementModal(true)
  }

  const handleMergeSets = async () => {
    console.log('Merge sets:', selectedSetsForMerge)
  }

  const toggleSetForMerge = (setId: string) => {
    setSelectedSetsForMerge(prev => 
      prev.includes(setId) ? prev.filter(id => id !== setId) : [...prev, setId]
    )
  }

  const handleViewFlashcards = (set: FlashcardSet) => {
    setSelectedSet(set)
    setShowDashboardFlashcardModal(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-blue-100 to-purple-100">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!user) {
    router.push('/login')
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-purple-100">
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8 text-gray-800">Your Flashcard Dashboard</h1>
        <div className="flex flex-wrap gap-4 mb-8">
          <button 
            onClick={handleGenerateMore}
            className="flex items-center bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition duration-200"
          >
            <Plus className="mr-2" /> Generate More Flashcards
          </button>
          <button 
            onClick={handleCreateSet}
            className="flex items-center bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition duration-200"
          >
            <Plus className="mr-2" /> Create New Set
          </button>
          <button 
            onClick={() => setMergeMode(!mergeMode)}
            className={`flex items-center ${mergeMode ? 'bg-red-600 hover:bg-red-700' : 'bg-purple-600 hover:bg-purple-700'} text-white py-2 px-4 rounded-md transition duration-200`}
          >
            {mergeMode ? <X className="mr-2" /> : <Layers className="mr-2" />}
            {mergeMode ? 'Cancel Merge' : 'Merge Sets'}
          </button>
          {mergeMode && (
            <button 
              onClick={handleMergeSets}
              className="flex items-center bg-yellow-600 text-white py-2 px-4 rounded-md hover:bg-yellow-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={selectedSetsForMerge.length < 2}
            >
              <Layers className="mr-2" /> Merge Selected Sets
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {flashcardSets.map((set) => (
            <div key={set.id} className="bg-white p-6 rounded-lg shadow-md relative cursor-pointer hover:shadow-lg transition duration-200" onClick={() => handleViewFlashcards(set)}>
              <h3 className="text-lg text-gray-600 mb-4">{set.collectionName}</h3>
              <p className="mb-4 text-gray-700">{set.cards.length} flashcards</p>
              <div className="flex flex-wrap gap-2">
                {mergeMode ? (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleSetForMerge(set.id)
                    }}
                    className={`flex items-center ${selectedSetsForMerge.includes(set.id) ? 'bg-green-600' : 'bg-gray-600'} text-white py-1 px-2 rounded-md text-sm transition duration-200`}
                  >
                    {selectedSetsForMerge.includes(set.id) ? 'Selected' : 'Select'}
                  </button>
                ) : (
                  <>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteSet(set.id)
                      }}
                      className="flex items-center bg-red-600 text-white py-1 px-2 rounded-md text-sm hover:bg-red-700 transition duration-200"
                    >
                      <Trash className="mr-1 h-4 w-4" /> Delete
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        handleShareSet(set.id)
                      }}
                      className="flex items-center bg-green-600 text-white py-1 px-2 rounded-md text-sm hover:bg-green-700 transition duration-200"
                    >
                      <Share2 className="mr-1 h-4 w-4" /> Share
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDownloadSet(set)
                      }}
                      className="flex items-center bg-purple-600 text-white py-1 px-2 rounded-md text-sm hover:bg-purple-700 transition duration-200"
                    >
                      <Download className="mr-1 h-4 w-4" /> Download
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        handleManageSet(set.id)
                      }}
                      className="flex items-center bg-blue-600 text-white py-1 px-2 rounded-md text-sm hover:bg-blue-700 transition duration-200"
                    >
                      <Settings className="mr-1 h-4 w-4" /> Manage
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
      {showSetManagementModal && selectedSetId && (
        <SetManagementModal
          setId={selectedSetId}
          onClose={() => setShowSetManagementModal(false)}
          onUpdate={fetchFlashcardSets}
        />
      )}
      {showCreateSetModal && (
        <CreateSetModal
          onClose={() => setShowCreateSetModal(false)}
          onSetCreated={handleSetCreated}
        />
      )}
      {showDashboardFlashcardModal && selectedSet && userType && user && (
        <DashboardFlashcardModal
          set={selectedSet}
          userType={userType}
          userId={user.uid}
          onClose={() => {
            setShowDashboardFlashcardModal(false)
            fetchFlashcardSets()
          }}
          onUpdate={fetchFlashcardSets}
        />
      )}
    </div>
  )
}