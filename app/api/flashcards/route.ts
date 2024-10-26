// app/api/flashcards/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createApi } from 'unsplash-js';
import fetch from 'node-fetch';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, setDoc, updateDoc, arrayUnion, getDoc, arrayRemove } from 'firebase/firestore';

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  backgroundImage: string;
}

// Initialize OpenRouter API
const openRouterApiKey = process.env.OPENROUTER_API_KEY as string;

// Initialize Unsplash API
const unsplash = createApi({
  accessKey: process.env.UNSPLASH_ACCESS_KEY as string,
  fetch: fetch as unknown as typeof window.fetch,
});

// Helper function to get a background image from Unsplash
async function fetchBackgroundImage(query: string): Promise<string> {
  const response = await unsplash.photos.getRandom({
      query,
      featured: true,
      orientation: 'portrait',
  });

  if (Array.isArray(response.response)) {
    return response.response[0]?.urls?.regular || "";
  } else {
    return response.response?.urls?.regular || "";
  }
}

// Function to generate flashcards
async function generateFlashcards(subject: string, count: number = 5): Promise<Flashcard[]> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openRouterApiKey}`,
      'HTTP-Referer': `${process.env.NEXT_PUBLIC_APP_URL}`,
      'X-Title': 'Flashcard App',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: [
        "nousresearch/hermes-3-llama-3.1-405b:free",
        "meta-llama/llama-3.1-8b-instruct:free"
      ],
      route: "fallback",
      messages: [
        { role: 'system', content: 'You are a helpful assistant that generates flashcards.' },
        { role: 'user', content: `Generate ${count} flashcards about ${subject}. Format each flashcard as "Question: [your question] Answer: [your answer]". Put each flashcard on a newline. Do not include any other text or comments.` },
      ],
      max_tokens: 500, // Increased to accommodate multiple flashcards
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('OpenRouter API error:', errorBody);
    throw new Error(`OpenRouter API request failed with status ${response.status}`);
  }

  const data = await response.json();
  console.log('OpenRouter API response:', JSON.stringify(data, null, 2));

  const messageContent = data.choices?.[0]?.message?.content?.trim();

  if (!messageContent) {
    console.error('Failed to retrieve flashcards from OpenRouter response');
    return [{
      id: 'temp_fallback',
      question: `What is an interesting fact about ${subject}?`,
      answer: `I'm sorry, but I couldn't generate specific flashcards about ${subject} at this time. Please try again later.`,
      backgroundImage: ''
    }];
  }

  const flashcards = messageContent.split('\n\n').map((card: string, index: number) => {
    const [questionPart, answerPart] = card.split('\nAnswer: ');
    const question = questionPart.replace('Question: ', '').trim();
    const answer = answerPart?.trim() || 'Answer not provided';
    return { id: `temp_${index}`, question, answer, backgroundImage: '' };
  });

  return flashcards;
}

// Function to generate trivia
async function generateTrivia(location: string): Promise<Flashcard> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openRouterApiKey}`,
      'HTTP-Referer': `${process.env.NEXT_PUBLIC_APP_URL}`,
      'X-Title': 'Flashcard App',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: [
        "nousresearch/hermes-3-llama-3.1-405b:free",
        "meta-llama/llama-3.1-8b-instruct:free"
      ],
      route: "fallback",
      messages: [
        { role: 'system', content: 'You are a helpful assistant that generates trivia questions.' },
        { role: 'user', content: `Generate a trivia question and answer about ${location}. Format the response as "Question: [your question] Answer: [your answer]" do not include any other text or comments` },
      ],
      max_tokens: 150,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('OpenRouter API error:', errorBody);
    throw new Error(`OpenRouter API request failed with status ${response.status}`);
  }

  const data = await response.json();
  console.log('OpenRouter API response:', JSON.stringify(data, null, 2)); // Add this line for debugging

  const messageContent = data.choices?.[0]?.message?.content?.trim();

  if (!messageContent) {
    console.error('Failed to retrieve trivia from OpenRouter response');
    return {
      id: 'temp_fallback',
      question: `What is an interesting fact about ${location}?`,
      answer: `I'm sorry, but I couldn't generate a specific trivia question about ${location} at this time. Please try again later.`,
      backgroundImage: ''
    };
  }

  const [questionPart, answerPart] = messageContent.split('Answer:');
  const question = questionPart.replace('Question:', '').trim();
  const answer = answerPart?.trim() || 'Answer not provided';

  return { id: 'temp_trivia', question, answer, backgroundImage: '' };
}

// Define the POST request handler
export async function POST(req: NextRequest) {
  const { subject, location, userType, userId, collectionName = 'default' } = await req.json();

  try {
    let flashcards: Flashcard[] = [];
    let backgroundImage: string = '';

    // Generate flashcards based on user type
    if (userType === 'traveler') {
      backgroundImage = await fetchBackgroundImage(location);
      const trivia = await generateTrivia(location);
      flashcards = [{ ...trivia, backgroundImage }];
    } else if (userType === 'student') {
      backgroundImage = await fetchBackgroundImage(subject);
      flashcards = await generateFlashcards(subject, 5);
      flashcards = flashcards.map(card => ({ ...card, backgroundImage }));
    }

    // Save flashcards to Firebase under the user's specified collection
    const userRef = doc(db, 'users', userId);
    const cardsRef = collection(userRef, `${userType}_cards`);
    
    // Dynamic collection (user-specified or default)
    const collectionRef = doc(userRef, `${userType}_collections`, collectionName);

    // If the specified collection does not exist, create it (either default or another one)
    const collectionDoc = await getDoc(collectionRef);
    if (!collectionDoc.exists()) {
      await setDoc(collectionRef, {
        collectionName: collectionName === 'default' ? 'Default Collection' : collectionName,
        cards: []
      });
    }

    // Add the flashcards and keep track of their IDs
    const cardIds: string[] = [];
    for (const card of flashcards) {
      const cardRef = await addDoc(cardsRef, {
        question: card.question,
        answer: card.answer,
        picture: card.backgroundImage
      });
      cardIds.push(cardRef.id);
      card.id = cardRef.id; // Update the flashcard with its Firebase ID
    }

    // Add card IDs to the user-specified collection
    await updateDoc(collectionRef, {
      cards: arrayUnion(...cardIds)
    });

    // Remove card IDs from the default collection, if they exist there
    // const defaultCollectionRef = doc(userRef, `${userType}_collections`, 'default');
    // const defaultCollectionDoc = await getDoc(defaultCollectionRef);

    // if (defaultCollectionDoc.exists()) {
    //   await updateDoc(defaultCollectionRef, {
    //     cards: arrayRemove(...cardIds)  // Remove the card IDs from the default collection
    //   });
    // }

    // Respond with the generated flashcards and their IDs
    return NextResponse.json({ flashcards, cardIds });

  } catch (error) {
    console.error('Error generating flashcards:', error);
    return NextResponse.json(
      { error: 'Failed to generate flashcards', details: (error as Error).message },
      { status: 500 }
    );
  }
}


