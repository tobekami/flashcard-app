"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth'
import { auth, googleProvider, githubProvider } from '@/lib/firebase'
import { FaGoogle, FaGithub } from 'react-icons/fa'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSignIn = async (provider: 'email' | 'google' | 'github') => {
    try {
      if (provider === 'email') {
        await signInWithEmailAndPassword(auth, email, password)
      } else if (provider === 'google') {
        await signInWithPopup(auth, googleProvider)
      } else if (provider === 'github') {
        await signInWithPopup(auth, githubProvider)
      }
      router.push('/')
    } catch (error: any) {
      console.error('Error signing in:', error)
      setError(error.message)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-purple-100 flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">Sign In to FlashCard AI</h1>
        <div className="space-y-4 mb-6">
          <button
            onClick={() => handleSignIn('google')}
            className="w-full flex items-center justify-center bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600 transition duration-200"
          >
            <FaGoogle className="mr-2" /> Sign in with Google
          </button>
          <button
            onClick={() => handleSignIn('github')}
            className="w-full flex items-center justify-center bg-gray-800 text-white py-2 px-4 rounded hover:bg-gray-900 transition duration-200"
          >
            <FaGithub className="mr-2" /> Sign in with GitHub
          </button>
        </div>
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or continue with</span>
          </div>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); handleSignIn('email'); }} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              id="email"
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm shadow-sm placeholder-gray-400
                         focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              id="password"
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm shadow-sm placeholder-gray-400
                         focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Sign In
          </button>
        </form>
      </div>
      <p className="mt-8 text-center text-sm text-gray-600">
      Don&apos;t have an account?{' '}
        <span
          className="font-medium text-blue-600 hover:text-blue-500 cursor-pointer"
          onClick={() => router.push('/signup')}
        >
          Sign Up
        </span>
      </p>
    </div>
  )
}