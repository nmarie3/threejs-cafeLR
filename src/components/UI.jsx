import { atom, useAtom } from "jotai";
import { useEffect, useRef, useState } from "react";
import { GiSpeaker, GiSpeakerOff } from "react-icons/gi";
import { Howl } from 'howler';

const pictures = [
  "coverback",
  "firstpage",
  "page1",
  "page2",
  "page3",
  "page4",
  "blank",
  "page5",
  "blank",
  "coverback",
];

export const pageAtom = atom(0);
export const pages = [
  {
    front: "cover",
    back: pictures[0],
  },
];
for (let i = 1; i < pictures.length - 1; i += 2) {
  pages.push({
    front: pictures[i % pictures.length],
    back: pictures[(i + 1) % pictures.length],
  });
}

pages.push({
  front: pictures[pictures.length - 1],
  back: "back",
});

export const UI = () => {
  const [page, setPage] = useAtom(pageAtom);
  const flipAudio = useRef(null);
  const bgAudio = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);

  //audio flipping
  useEffect(() => {
    if (!flipAudio.current) {
      flipAudio.current = new Howl({
        src: ['/audio/page-flip.mp3'],
        volume: 0.25,
      });
    }

    flipAudio.current.play();
  }, [page]);


  //bg audio
  useEffect(() => { //if statement here only creates audio once
    if(!bgAudio.current) {
      bgAudio.current = new Audio("/audio/hana_no_tou.mp3");
      bgAudio.current.loop = true;
      bgAudio.current.volume = 0.1;
      bgAudio.current.muted = false;
    }

    bgAudio.current.play()
    .then(() => {
      setIsPlaying(!bgAudio.current.muted); //this updates the icon to play state on autoplay.
    })
    .catch((err) => { //chrome and safari usually block audio unless user interacts with site (click, scroll, etc.), so this error throws a promise if play fails.
      console.warn("Autoplay blocked", err);
      setIsPlaying(false); //fallback if fails
    });

    return () => { //this return is for cleanup. needed for things that will be play/pause, has intervals, persists, re-runs or unmounts effect, avoid component from playing when user navigates away etc. in short: it auto plays, then if you click somthing it plays again on top of the first one and so on if it's not cleaned up.
      bgAudio.current.pause();
    };
  }, ); //don't add a [] at the end here, it breaks the audio.

  const toggleMute = () => {
    if (!bgAudio.current) return;

    const newMutedState = !bgAudio.current.muted;
    bgAudio.current.muted = newMutedState;
    setIsPlaying(!newMutedState);
  };

  return (
    <>
      <main className="pointer-events-none select-none z-10 fixed  inset-0  flex justify-between flex-col">
        {/*mobile only*/}
        <div className="block md:hidden">

            <div className="flex">
                <a
                  className="pointer-events-auto p-3"
                  href="https://lycoris-recoil.com/cafe_lyco_reco/"
                >
                  <img className="h-10 md:h-20 hover:scale-105" src="/images/logo.png" />
                </a>
                {/*audio buttons*/}
                <div className="flex p-3 items-center text-white cursor-pointer">
                  <button onClick={toggleMute} className="border-2 border-white rounded-full p-1  pointer-events-auto text-3xl bg-black/30">
                    {isPlaying ? <GiSpeaker /> : <GiSpeakerOff />}
                  </button>
                  <h2 className="pl-4 text-xs"><span className="text-xs">Play/Mute<br /></span>Hana no Tou (Soseki D&B remix)</h2>
                </div>
            </div>


              <div className="m-2 bg-white/75 rounded-xl p-3 mt-2">
                <h2 className="text-black text-xs">
                  Hi! This is an interactive fan project inspired by episode 3 of Lycoris Recoil Short Movies! Flip through the pages of Chisato's original draft menu!<br /><br />Ideally I'd like to also add a comment section on the blank pages for fans to leave messages, but until I figure out how to implement that, feel free to flip through!<br /><br />
                  *Hold the SHIFT key and click+hold the mouse to move the position of the book.<br />
                  *Click+hold the mouse to rotate book.<br />
                  *Click the book or buttons to flip through pages.<br />
                  *Use the mouse scroll to zoom in and out.<br />
                  (TIP: click+hold outside the book to avoid page auto-flip on release)
                </h2>
              </div>
        </div>

        {/*PC only*/}
        <div className="hidden md:block">
          <div className="flex">
                <a
                  className="pointer-events-auto mt-10 ml-10"
                  href="https://lycoris-recoil.com/cafe_lyco_reco/"
                >
                  <img className="h-10 md:h-20 hover:scale-105" src="/images/logo.png" />
                </a>
                {/*audio buttons*/}
                <div className="flex mt-12 p-3 items-center text-white cursor-pointer">
                  <button onClick={toggleMute} className="border-2 border-white rounded-full p-1 pointer-events-auto text-5xl hover:bg-black/30">
                    {isPlaying ? <GiSpeaker /> : <GiSpeakerOff />}
                  </button>
                  <h2 className="pl-4 text-xl"><span className="text-sm">Play/Mute<br /></span>Hana no Tou (Soseki D&B remix)</h2>
                </div>
            </div>

          <div className="w-80 bg-white/75 rounded-xl p-3 ml-10 mt-5">
            <h2 className="text-black text-xs">
              Hi! This is an interactive fan project inspired by episode 3 of Lycoris Recoil Short Movies! Flip through the pages of Chisato's original draft menu!<br /><br />Ideally I'd like to also add a comment section on the blank pages for fans to leave messages, but until I figure out how to implement that, feel free to flip through!<br /><br />
              *Hold the SHIFT key and click+hold the mouse to move the position of the book.<br />
              *Click+hold the mouse to rotate book.<br />
              *Click the book or buttons to flip through pages.<br />
              *Use the mouse scroll to zoom in and out.<br />
              (TIP: click+hold outside the book to avoid page auto-flip on release)
            </h2>
          </div>
        </div>

        {/*////////mobile and PC mix////////////*/}
        {/*page buttons*/}
        <div className="w-full overflow-auto pointer-events-auto flex justify-center">
          <div className="flex justify-center items-center flex-wrap gap-1.5 md:gap-4 md:max-w-full p-2 md:p-10">
            {[...pages].map((_, index) => (
              <button
                key={index}
                className={`border-transparent hover:border-white transition-all duration-300 px-3 md:px-4 py-3 rounded-full text-sm  md:text-lg uppercase shrink-0 border ${
                  index === page
                    ? "bg-white/90 text-black"
                    : "bg-black/30 text-white"
                }`}
                onClick={() => setPage(index)}
              >
                {index === 0 ? "Cover" : `Page ${index}`}
              </button>
            ))}
            <button
              className={`border-transparent hover:border-white transition-all duration-300  px-4 py-3 rounded-full  text-sm md:text-lg uppercase shrink-0 border ${
                page === pages.length
                  ? "bg-white/90 text-black"
                  : "bg-black/30 text-white"
              }`}
              onClick={() => setPage(pages.length)}
            >
              Back
            </button>
          </div>
        </div>
      </main>
              {/*scrolling slider*/}
      <div className="fixed inset-0 flex items-center -rotate-2 select-none hidden">
        <div className="relative">
          <div className="bg-white/0  animate-horizontal-scroll flex items-center gap-8 w-max px-8">
            <h1 className="shrink-0 text-white text-10xl font-black ">
              Welcome
            </h1>
            <h2 className="shrink-0 text-white text-8xl italic font-light">
              to
            </h2>
            <h2 className="shrink-0 text-white text-12xl font-bold">
              Cafe
            </h2>
            <h2 className="shrink-0 text-transparent text-12xl font-bold italic outline-text">
              LycoReco
            </h2>
          </div>
          <div className="absolute top-0 left-0 bg-white/0 animate-horizontal-scroll-2 flex items-center gap-8 px-8 w-max">
            <h1 className="shrink-0 text-white text-10xl font-black ">
              Welcome
            </h1>
            <h2 className="shrink-0 text-white text-8xl italic font-light">
              to
            </h2>
            <h2 className="shrink-0 text-white text-12xl font-bold">
              Cafe
            </h2>
            <h2 className="shrink-0 text-transparent text-12xl font-bold italic outline-text">
              LycoReco
            </h2>
          </div>
        </div>
      </div>
    </>
  );
};
