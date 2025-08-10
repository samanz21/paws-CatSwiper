import React, { useEffect, useState, useRef } from "react";
import { useSpring, animated as a } from "@react-spring/web";
import { useDrag } from "@use-gesture/react";

const TOTAL_CATS = 10;
const SWIPE_THRESHOLD = 120;

// Utility: Fetch image and return as base64 data URL
async function fetchImageAsBase64(url) {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

export default function CatSwiper() {
  const hasFetched = useRef(false); // prevent multiple fetch calls
  const [cats, setCats] = useState([]);
  const [loadingCount, setLoadingCount] = useState(0); // track loaded images count
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedCats, setLikedCats] = useState([]);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (hasFetched.current) return;
      hasFetched.current = true;

      let loadedCount = 0;
      const images = [];

      const fetchWithProgress = async (url, index) => {
        try {
          const img = await fetchImageAsBase64(url);
          loadedCount += 1;
          setLoadingCount(loadedCount); // update loading progress
          return img;
        } catch (error) {
          console.warn(`Failed to fetch image ${index}, retrying...`, error);
          return null;
        }
      };

      // Prepare all fetch promises concurrently
      const promises = [];
      for (let i = 0; i < TOTAL_CATS; i++) {
        const url = `https://cataas.com/cat?position=center&width=600&height=800&${i}-${Date.now()}`;
        promises.push(fetchWithProgress(url, i));
      }

      // Wait all to finish
      const results = await Promise.all(promises);

      // Filter out any failed (null) results
      const validImages = results.filter((img) => img !== null);

      setCats(validImages);
    };

    fetchData();
  }, []);

  const [{ x, y, rot, scale }, api] = useSpring(() => ({
    // Initialize spring values for card position (x, y), rotation (rot), and scale
    x: 0,
    y: 0,
    rot: 0,
    scale: 1,
    config: { tension: 300, friction: 30 },
  }));

  const dragDirection = useRef(null); // store swipe direction ('left' or 'right') without causing re-render

  const bind = useDrag(({ active, movement: [mx, my], last }) => {
    if (finished) return;

    if (active) {
      // While dragging, update dragDirection and animate card position, rotation, and scale
      dragDirection.current = mx > 0 ? "right" : "left";
      api.start({
        x: mx,
        y: my,
        rot: mx / 20,
        scale: 1.05,
        immediate: true,
      });
    } else if (!active && last) {
      if (Math.abs(mx) > SWIPE_THRESHOLD) {
        api.start({
          x: mx > 0 ? 1000 : -1000,
          rot: mx > 0 ? 45 : -45,
          scale: 1,
          y: my,
          immediate: false,
          onRest: () => {
            if (mx > 0) {
              setLikedCats((prev) => [...prev, cats[currentIndex]]);
            }
            const nextIndex = currentIndex + 1;
            setCurrentIndex(nextIndex);
            if (nextIndex >= cats.length) {
              setFinished(true);
            }
            api.set({ x: 0, y: 0, rot: 0, scale: 1 });
            dragDirection.current = null;
          },
        });
      } else {
        api.start({ x: 0, y: 0, rot: 0, scale: 1, immediate: false });
        dragDirection.current = null;
      }
    }
  });

  // loading progress bar
  if (cats.length === 0) {
    const progressPercent = (loadingCount / TOTAL_CATS) * 100;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        <p className="mb-4 text-xl font-semibold">Loading cats...</p>
        <div className="w-64 h-4 bg-gray-300 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    );
  }

  const displayIndex = Math.min(currentIndex + 1, TOTAL_CATS);

  return (
    <div className="min-h-screen flex flex-col items-center p-4">
      {/* Header */}
      <h1 className="text-3xl font-bold mt-12 mb-4 text-center">
        Find Your Favourite Kitty
      </h1>
      <p className="mb-8 text-center text-gray-600">
        Swipe <span className="font-semibold text-red-500">left</span> to pass,
        swipe <span className="font-semibold text-green-500">right</span> if you
        loved it!
      </p>

      {/* Main swipe area */}
      {!finished ? (
        <div className="relative w-72 h-96 select-none">
          {/* Counter badge */}
          <div className="absolute top-2 right-2 z-20 bg-black bg-opacity-50 text-white text-sm px-3 py-1 rounded-full font-mono select-none">
            {displayIndex} / {TOTAL_CATS}
          </div>

          {/* No next cards rendered */}

          {/* Current swipeable card */}
          {currentIndex < cats.length && (
            <a.div
              {...bind()}
              key={currentIndex}
              className="absolute w-72 h-96 rounded-xl shadow-lg bg-white overflow-hidden cursor-grab touch-none flex flex-col justify-end"
              style={{
                x,
                y,
                rotateZ: rot,
                scale,
                willChange: "transform",
                zIndex: 10,
              }}
            >
              <img
                src={cats[currentIndex]}
                alt={`Cat #${displayIndex}`}
                className="w-full h-full object-cover absolute inset-0 pointer-events-none select-none rounded-xl"
                draggable={false}
              />
              <div
                className="relative w-full p-4 text-white"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.7) 100%)",
                }}
              >
                <h3 className="text-lg font-semibold">Cat #{displayIndex}</h3>
                <p className="text-sm opacity-80">Cute cat waiting for you!</p>
              </div>
            </a.div>
          )}
        </div>
      ) : (
        /* Finished screen */
        <div className="text-center max-w-md p-2 -mt-6">
          <h2 className="text-2xl font-semibold mb-6">
            You liked {likedCats.length} cats!
          </h2>
          {likedCats.length === 0 && <p>You didn't like any cats 😿</p>}
          <div className="grid grid-cols-2 gap-4">
            {likedCats.map((cat, i) => {
              const isLastOdd =
                likedCats.length % 2 === 1 && i === likedCats.length - 1;
              return (
                <img
                  key={i}
                  src={cat}
                  alt={`Liked cat ${i + 1}`}
                  className={`rounded-lg w-full aspect-[3/4] object-cover ${
                    isLastOdd
                      ? "col-span-2 justify-self-center max-w-[50%]"
                      : ""
                  }`}
                />
              );
            })}
          </div>
          <button
            className="mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={() => {
              setLikedCats([]);
              setFinished(false);
              setCurrentIndex(0);
            }}
          >
            Try Again
          </button>
          <p className="mt-2 mb-4 text-center text-sm italic text-gray-500">
            Try Again will show the same cats! <br />
            Want new cats? Just refresh the browser!
          </p>
        </div>
      )}
    </div>
  );
}
