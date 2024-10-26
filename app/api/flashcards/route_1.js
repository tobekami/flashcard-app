// Import necessary modules from 'next/server' and Firebase Firestore
import { NextRequest, NextResponse } from 'next/server';
import { createApi } from 'unsplash-js';  // Unsplash API for fetching background images
import fetch from 'node-fetch';  // Fetch API for server-side requests
import { db } from '@/lib/firebase';  // Firebase configuration (importing Firestore instance)
import { collection, addDoc, doc, setDoc, updateDoc, arrayUnion, getDoc, arrayRemove } from 'firebase/firestore';  // Firebase Firestore methods

// Define the structure of a flashcard (interface helps with TypeScript type safety)
interface Flashcard {
  id: string;  // Unique identifier for the flashcard
  question: string;  // Flashcard question
  answer: string;  // Flashcard answer
  backgroundImage: string;  // URL of the background image for the flashcard
}

// Initialize OpenRouter API with the API key from environment variables
const openRouterApiKey = process.env.OPENROUTER_API_KEY as string;

// Initialize Unsplash API for fetching background images for the flashcards
const unsplash = createApi({
  accessKey: process.env.UNSPLASH_ACCESS_KEY as string,  // Unsplash API access key from environment
  fetch: fetch as unknown as typeof window.fetch,  // Ensures Unsplash API uses server-side fetch (node-fetch)
});

// Helper function to fetch a background image from Unsplash API based on a query (subject or location)
async function fetchBackgroundImage(query: string): Promise<string> {
  const response = await unsplash.photos.getRandom({
      query,  // Query string based on subject or location
      featured: true,  // Fetch featured images
      orientation: 'portrait',  // Fetch portrait-oriented images
  });

  // Check if the response contains a valid image and return its URL
  if (Array.isArray(response.response)) {
    return response.response[0]?.urls?.regular || "";  // Get the first image URL
  } else {
    return response.response?.urls?.regular || "";  // Fallback if the response is not an array
  }
}

// Function to generate flashcards using OpenRouter AI API
async function generateFlashcards(subject: string, count: number = 5): Promise<Flashcard[]> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openRouterApiKey}`,  // API key for OpenRouter
      'HTTP-Referer': `${process.env.NEXT_PUBLIC_APP_URL}`,  // Your app's referer URL (for rate limiting)
      'X-Title': 'Flashcard App',  // Optional header indicating the app title
      'Content-Type': 'application/json'  // Request content type
    },
    body: JSON.stringify({
      model: [
        "nousresearch/hermes-3-llama-3.1-405b:free",  // List of AI models used for fallback
        "meta-llama/llama-3.1-8b-instruct:free"
      ],
      route: "fallback",  // Instructs OpenRouter to use fallback models in case one fails
      messages: [
        { role: 'system', content: 'You are a helpful assistant that generates flashcards.' },  // Instruction for the AI
        { role: 'user', content: `Generate ${count} flashcards about ${subject}. Format each flashcard as "Question: [your question] Answer: [your answer]". Put each flashcard on a newline. Do not include any other text or comments.` },  // User prompt for generating flashcards
      ],
      max_tokens: 500,  // Increased token limit to ensure multiple flashcards fit
    }),
  });

  // Check if the API call was successful, throw an error if not
  if (!response.ok) {
    const errorBody = await response.text();
    console.error('OpenRouter API error:', errorBody);  // Log error details for debugging
    throw new Error(`OpenRouter API request failed with status ${response.status}`);
  }

  const data = await response.json();  // Parse the JSON response from OpenRouter API
  console.log('OpenRouter API response:', JSON.stringify(data, null, 2));  // Log the API response for debugging

  const messageContent = data.choices?.[0]?.message?.content?.trim();  // Extract the content of the flashcards

  // If no valid content is returned, create a fallback flashcard with an apology message
  if (!messageContent) {
    console.error('Failed to retrieve flashcards from OpenRouter response');
    return [{
      id: 'temp_fallback',
      question: `What is an interesting fact about ${subject}?`,  // Fallback question
      answer: `I'm sorry, but I couldn't generate specific flashcards about ${subject} at this time. Please try again later.`,  // Fallback answer
      backgroundImage: ''
    }];
  }

  // Split the message content into individual flashcards based on the format "Question: ... Answer: ..."
  const flashcards = messageContent.split('\n\n').map((card: string, index: number) => {
    const [questionPart, answerPart] = card.split('\nAnswer: ');  // Split each flashcard at "Answer: "
    const question = questionPart.replace('Question: ', '').trim();  // Extract the question part
    const answer = answerPart?.trim() || 'Answer not provided';  // Extract the answer part or provide a default
    return { id: `temp_${index}`, question, answer, backgroundImage: '' };  // Return the flashcard with a temporary ID
  });

  return flashcards;  // Return the generated flashcards
}

// Function to generate trivia for a traveler based on location using OpenRouter AI
async function generateTrivia(location: string): Promise<Flashcard> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openRouterApiKey}`,  // API key for OpenRouter
      'HTTP-Referer': `${process.env.NEXT_PUBLIC_APP_URL}`,  // Referer URL
      'X-Title': 'Flashcard App',
      'Content-Type': 'application/json'  // JSON request
    },
    body: JSON.stringify({
      model: [
        "nousresearch/hermes-3-llama-3.1-405b:free",  // AI models used for fallback
        "meta-llama/llama-3.1-8b-instruct:free"
      ],
      route: "fallback",  // Fallback route for model selection
      messages: [
        { role: 'system', content: 'You are a helpful assistant that generates trivia questions.' },  // Instruction for the AI to generate trivia
        { role: 'user', content: `Generate a trivia question and answer about ${location}. Format the response as "Question: [your question] Answer: [your answer]" do not include any other text or comments` },  // User prompt
      ],
      max_tokens: 150,  // Max tokens limited for a single trivia response
    }),
  });

  // Handle potential API errors
  if (!response.ok) {
    const errorBody = await response.text();
    console.error('OpenRouter API error:', errorBody);
    throw new Error(`OpenRouter API request failed with status ${response.status}`);
  }

  const data = await response.json();  // Parse the response JSON
  console.log('OpenRouter API response:', JSON.stringify(data, null, 2));  // Log the response for debugging

  const messageContent = data.choices?.[0]?.message?.content?.trim();  // Extract the trivia content

  // Fallback in case no valid content is retrieved
  if (!messageContent) {
    console.error('Failed to retrieve trivia from OpenRouter response');
    return {
      id: 'temp_fallback',  // Temporary ID for fallback trivia
      question: `What is an interesting fact about ${location}?`,  // Fallback question
      answer: `I'm sorry, but I couldn't generate a specific trivia question about ${location} at this time. Please try again later.`,  // Fallback answer
      backgroundImage: ''
    };
  }

  // Split the trivia content into question and answer
  const [questionPart, answerPart] = messageContent.split('Answer:');
  const question = questionPart.replace('Question:', '').trim();  // Extract and clean the question
  const answer = answerPart?.trim() || 'Answer not provided';  // Extract and clean the answer

  return { id: 'temp_trivia', question, answer, backgroundImage: '' };  // Return the trivia flashcard object
}

// Define the POST request handler for handling flashcard generation requests
export async function POST(req: NextRequest) {
  const { subject, location, userType, userId, collectionName = 'default' } = await req.json();  // Parse incoming request

  try {
    let flashcards: Flashcard[] = [];
    let backgroundImage: string = '';

    // Generate flashcards or trivia based on user type
    if (userType === 'traveler') {
      backgroundImage = await fetchBackgroundImage(location);  // Fetch background image for traveler
      const trivia = await generateTrivia(location);  // Generate trivia for traveler
      flashcards = [{ ...trivia, backgroundImage }];  // Assign background image to trivia flashcard
    } else if (userType === 'student') {
      backgroundImage = await fetchBackgroundImage(subject);  // Fetch background image for student
      flashcards = await generateFlashcards(subject, 5);  // Generate flashcards for student
      flashcards = flashcards.map(card => ({ ...card, backgroundImage }));  // Assign background image to each flashcard
    }

    // Reference to the user's document in Firebase Firestore
    const userRef = doc(db, 'users', userId);
    const cardsRef = collection(userRef, `${userType}_cards`);  // Reference to the flashcards collection for the user
    
    // Reference to the user-specified collection or default
    const collectionRef = doc(userRef, `${userType}_collections`, collectionName);

    // Check if the user-specified collection exists; create it if it doesn't
    const collectionDoc = await getDoc(collectionRef);
    if (!collectionDoc.exists()) {
      await setDoc(collectionRef, {
        collectionName: collectionName === 'default' ? 'Default Collection' : collectionName,  // Default to 'Default Collection' if unspecified
        cards: []
      });
    }

    // Save each flashcard to the database and update their IDs
    const cardIds: string[] = [];
    for (const card of flashcards) {
      const cardRef = await addDoc(cardsRef, {
        question: card.question,  // Store flashcard question
        answer: card.answer,  // Store flashcard answer
        picture: card.backgroundImage  // Store flashcard background image
      });
      cardIds.push(cardRef.id);  // Keep track of generated card IDs
      card.id = cardRef.id;  // Assign the Firebase ID to each flashcard
    }

    // Add flashcards to the user-specified collection in Firestore
    await updateDoc(collectionRef, {
      cards: arrayUnion(...cardIds)  // Add flashcards to collection
    });

    // If flashcards exist in the default collection, remove them
    const defaultCollectionRef = doc(userRef, `${userType}_collections`, 'default');
    const defaultCollectionDoc = await getDoc(defaultCollectionRef);

    if (defaultCollectionDoc.exists()) {
      await updateDoc(defaultCollectionRef, {
        cards: arrayRemove(...cardIds)  // Remove cards from default collection
      });
    }

    // Respond with the generated flashcards and their IDs
    return NextResponse.json({ flashcards, cardIds });

  } catch (error) {
    // Log and return an error response in case of failure
    console.error('Error generating flashcards:', error);
    return NextResponse.json(
      { error: 'Failed to generate flashcards', details: (error as Error).message },  // Error message
      { status: 500 }  // HTTP 500 status for server error
    );
  }
}
