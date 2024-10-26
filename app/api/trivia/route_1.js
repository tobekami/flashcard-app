//app/api/trivia/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createApi } from 'unsplash-js';
import fetch from 'node-fetch';

// Initialize OpenRouter API
const openRouterApiKey = process.env.OPENROUTER_API_KEY as string;

// Initialize Unsplash API
const unsplash = createApi({
  accessKey: process.env.UNSPLASH_ACCESS_KEY as string,
  fetch: fetch as unknown as typeof window.fetch,
});

// Define the POST request handler
export async function POST(req: NextRequest) {
  try {
    const { location } = await req.json();
    console.log('Received location:', location);

    // Fetch trivia using OpenRouter's API
    const triviaResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'nousresearch/hermes-3-llama-3.1-405b:extended',
        messages: [
          { role: 'user', content: `Generate a trivia question and answer about ${location}. Format the response as "Question: [your question] Answer: [your answer]"` },
        ],
      }),
    });

    if (!triviaResponse.ok) {
      throw new Error(`OpenRouter API request failed with status ${triviaResponse.status}`);
    }

    const triviaData = await triviaResponse.json();
    console.log('OpenRouter API response:', JSON.stringify(triviaData, null, 2));

    const messageContent = triviaData.choices?.[0]?.message?.content?.trim();

    if (!messageContent) {
      console.error('Unexpected OpenRouter response format:', triviaData);
      throw new Error('Failed to retrieve trivia from OpenRouter response');
    }

    console.log('Retrieved message content:', messageContent);

    const [questionPart, answerPart] = messageContent.split('Answer:');
    const question = questionPart.replace('Question:', '').trim();
    const answer = answerPart?.trim() || 'Answer not provided';

    console.log('Parsed question:', question);
    console.log('Parsed answer:', answer);

    // Fetch background image from Unsplash
    const imageResponse = await unsplash.photos.getRandom({
      query: location,
      featured: true,
      orientation: 'portrait',
    });

    let imageUrl: string = '';

    if (imageResponse?.response) {
      if (Array.isArray(imageResponse.response)) {
        imageUrl = imageResponse.response[0]?.urls?.regular || '';
      } else {
        imageUrl = imageResponse.response.urls?.regular || '';
      }
    }
    console.log(imageUrl)

    if (!imageUrl) {
      console.warn('No image URL found for the given location');
    }

    return NextResponse.json({
      trivia: {
        question,
        answer,
      },
      backgroundImage: imageUrl,
    });
  } catch (error) {
    console.error('Error fetching trivia or image:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trivia or image', details: (error as Error).message },
      { status: 500 }
    );
  }
}