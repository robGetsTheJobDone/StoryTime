import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

const StoriesMenu: React.FC = () => {
    const [stories, setStories] = useState<{ description: string, title: string, id: string }[]>([
        {
            description: 'sample description',
            title: 'sample title',
            id: '1',
        },

    ]);
    const router = useRouter();

    // useEffect(() => {
    //     const fetchStories = async () => {
    //         const response = await fetch('http://localhost:8000/stories', {
    //             method: 'GET',
    //             headers: {
    //                 'Content-Type': 'application/json',
    //             },
    //         });
    //         const data = await response.json();
    //         setStories(data);
    //     };

    //     fetchStories();
    // }, []);

    const handleClick = (id: string) => {
        router.push(`/story/${id}`);
    };

    return (
        <div className='min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-blue-400 to-pink-500 text-white'>
            <h1 className='text-6xl font-bold mb-4'>My Stories</h1>
            <h2 className='text-2xl mb-8'>Explore your crafted stories.</h2>

            <div className='w-1/2 p-4 mb-8 text-black rounded-md bg-white opacity-90 resize-none'>
                {stories.length > 0 ? (
                    stories.map((story, index) => (
                        <div key={index} className='my-2 cursor-pointer' onClick={() => handleClick(story.id)}>
                            <h3 className='text-xl font-bold'>{story.title}</h3>
                            <p>{story.description}</p>
                        </div>
                    ))
                ) : (
                    <p>No stories yet...</p>
                )}
            </div>
        </div>
    );
};

export default StoriesMenu;