import { useRouter } from 'next/router';
import { useEffect, useState, useRef } from 'react';
import ReactPlayer from 'react-player';
import axios from 'axios';
import { motion } from 'framer-motion';
// @ts-expect-error
import AudioSpectrum from 'react-audio-spectrum';
import AudioVisualizer from '~/components/AudioVis';

interface Lyric {
  start: number;
  end: number;
  text: string;
}
interface ImageInfo {
  start: string;
  end: string;
  path: string;
}

interface KaraokeProps {
  lyrics: Lyric[];
  audioSrc: string;
  images: string[];
  image_info: ImageInfo[];
}

const KaraokePlayer = () => {
  const [data, setData] = useState<KaraokeProps | null>(null);
  const [currentImage, setCurrentImage] = useState<ImageInfo | null>(null);
  const [currentCaption, setCurrentCaption] = useState<Lyric | null>(null);
  const [playerProgress, setPlayerProgress] = useState<number>(0);
  const { query } = useRouter();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlay = () => {
    if (audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handlePause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleProgress = (state: { playedSeconds: number }) => {
    setPlayerProgress(state.playedSeconds);
  };

  useEffect(() => {
    if (!data?.lyrics) return;
    const caption = data.lyrics.find((caption, i) => {
      if (i === data.lyrics.length - 1) return true;
      return playerProgress >= caption.start && playerProgress < (data.lyrics[i + 1]?.start || Infinity);
    }) || null;
    setCurrentCaption(caption);

  }, [data?.lyrics, playerProgress]);

  const convertTimeToSeconds = (time: string) => {
    const [hours, minutes, seconds] = time.split(':').map(parseFloat);
    // @ts-expect-error
    return hours * 3600 + minutes * 60 + seconds;
  }
  useEffect(() => {
    if (!data?.image_info) return;
    const image = data.image_info.find((image, i) => {
      const startInSeconds = convertTimeToSeconds(image.start);
      const nextStartInSeconds = i < data.image_info.length - 1 ? convertTimeToSeconds(data.image_info[i + 1].start) : Infinity;
      return playerProgress >= startInSeconds && playerProgress < nextStartInSeconds;
    }) || null;
    console.log(image);
    setCurrentImage(image);
  }, [data?.image_info, playerProgress]);


  useEffect(() => {
    const fetchKaraokeData = async () => {
      const timestamp = query.timestamp as string;
      const response = await axios.get(`http://localhost:8000/convert_vtt/${timestamp}`);
      setData(response.data);
      setCurrentImage(response.data.image_info[0]);
    };

    fetchKaraokeData();
  }, [query.timestamp]);



  return (
    <div className="relative w-screen h-screen overflow-hidden bg-gradient-to-br from-purple-700 via-pink-500 to-red-500 text-white flex items-center justify-center">
      {data ? (
        <>
          <div className="absolute inset-0 z-10">

            {currentImage && <img className="absolute inset-0 w-full h-full object-cover opacity-50" src={currentImage.path} alt="karaoke" />}

          </div>

          <div className="absolute inset-0 flex items-center justify-center z-20 text-6xl sm:text-9xl font-semibold tracking-wide text-center">
            <motion.p
              className="text-white"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
            >
              {currentCaption?.text}
            </motion.p>
          </div>

          <div className="absolute bottom-0 left-0 w-full z-30">

            <audio
              ref={audioRef}
              controls
              crossOrigin="anonymous" // add this line
              src={data.audioSrc}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onTimeUpdate={() => setPlayerProgress(audioRef.current?.currentTime || 0)}
            />

            {/* {audioRef.current && isPlaying && <AudioVisualizer audioRef={audioRef} isPlaying={isPlaying} />} */}



          </div>
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-4xl text-white">Loading...</div>
      )}
    </div>
  );
};

export default KaraokePlayer;
