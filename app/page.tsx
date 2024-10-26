"use client"

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { GraduationCap, Plane, ArrowRight, LogOut } from 'lucide-react'

export default function Home() {
  const { user, loading, logout } = useAuth()
  const router = useRouter()

  useEffect(() => {
    const fetchUserType = async () => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        if (userDoc.exists()) {
          const userType = userDoc.data().userType
          localStorage.setItem('lastUserType', userType)
        }
      }
    }

    fetchUserType()
  }, [user])

  const setUserTypeFirestore = async (type: 'traveler' | 'student') => {
    if (user) {
      await setDoc(doc(db, 'users', user.uid), { userType: type }, { merge: true })
      localStorage.setItem('lastUserType', type)
    }
  }

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-blue-100 to-purple-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto px-4 py-16">
        <h1 className="text-5xl font-bold mb-6 text-center text-gray-800 dark:text-white">Welcome to FlashCard AI</h1>
        <p className="text-xl text-center mb-12 text-gray-600 dark:text-gray-300">
          Supercharge your learning with AI-powered flashcards for students and travelers
        </p>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <GraduationCap className="mr-2" />
                For Students
              </CardTitle>
              <CardDescription>Ace your exams with smart flashcards</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">Create flashcards for any subject and boost your grades</p>
              {user ? (
                <Button className="w-full" onClick={() => {
                  setUserTypeFirestore('student')
                  router.push('/flashcards')
                }}>
                  Start Learning <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button className="w-full" onClick={() => router.push('/login')}>
                  Login to Start <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Plane className="mr-2" />
                For Travelers
              </CardTitle>
              <CardDescription>Learn about the world on the go</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">Master exciting trivia for your next adventure and beyond</p>
              {user ? (
                <Button className="w-full" onClick={() => {
                  setUserTypeFirestore('traveler')
                  router.push('/flashcards')
                }}>
                  Start Exploring <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button className="w-full" onClick={() => router.push('/login')}>
                  Login to Start <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {user && (
          <div className="mt-12 text-center">
            <Button variant="outline" onClick={() => router.push('/dashboard')}>
              Go to Dashboard
            </Button>
          </div>
        )}
      </main>

      {user && (
        <Button
          variant="ghost"
          className="absolute top-4 right-4"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" /> Logout
        </Button>
      )}
    </div>
  )
}