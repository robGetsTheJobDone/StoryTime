import { signIn, useSession } from 'next-auth/react';
import React, { useState, useEffect, useRef } from 'react';
import { css } from '@emotion/react';
import { PulseLoader } from 'react-spinners';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { NextPageWithLayout } from './_app';
import KaraokePlayer from '~/components/AudioVis';
import { useRouter } from 'next/router';

const App: NextPageWithLayout = () => {
  const router = useRouter();

  const [story, setStory] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('Cooking up your story... 🥣');

  const loadingMessages = [
    'Adding some magic... 🎩✨',
    'Stirring in some adventure... 🏞️🎒',
    'Sprinkling a dash of fun... 🎠🎈',
    'Adding a splash of imagination... 💭🌈',
    'Mixing in some excitement... 🎢🚀',
    'Baking with a touch of mystery... 🕵️‍♀️🔍',
    'Serving a spoonful of surprises... 🎁🎊',
    'Topping it with laughs... 😂🤣',
    'Garnishing with some twists and turns... 🌀🔀',
    'Sprinkling a pinch of joy... 😊💖',
    'Shaking up a blend of emotions... 😢😃😡😂',
    'Pouring in a dose of lessons... 📚👩‍🎓',
    'Infusing some sweet endings... 🏁🏆',
    'Stirring up a bunch of fun characters... 🧙‍♀️🤖👸🤠',
    'And voila! Your story is ready... 📜✨',
  ];

  useEffect(() => {
    let currentMsgIndex = 0;
    if (loading) {
      const interval = setInterval(() => {
        currentMsgIndex = (currentMsgIndex + 1) % loadingMessages.length;
        // @ts-ignore
        setLoadingMsg(loadingMessages[currentMsgIndex]);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [loading]);

  const makeStory = async () => {
    setLoading(true);
    toast.success(loadingMsg);
    const response = await fetch('http://localhost:8000/transcribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: story }),
    });
    const data = await response.json();
    router.push(`/karaoke?timestamp=${data.timestamp}`);

    setLoading(false);
    // Do something with the response
  };

  const override = css`
    display: block;
    margin: 0 auto;
    border-color: red;
  `;

  return (
    <div className='min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-blue-400 to-pink-500 text-white'>
      <h1 className='text-6xl font-bold mb-4'>Story Time</h1>
      <h2 className='text-2xl mb-8'>Outline a basic story and let our magic do the rest.</h2>

      <textarea
        className='w-1/2 h-1/2 p-4 mb-8 text-black rounded-md bg-white opacity-90 resize-none'
        placeholder='Type your story here...'
        value={story}
        onChange={e => setStory(e.target.value)}
      />

      <button
        className='bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded'
        onClick={makeStory}
        disabled={loading}
      >
        Make Story
      </button>

      {loading && (
        <div className='mt-4 text-xl flex flex-col items-center'>
          <PulseLoader color={'#ffffff'} loading={loading} css={override} size={15} />
          <p className='mt-2'>{loadingMsg}</p>
        </div>
      )}
    </div>
  );
};

export default App;
