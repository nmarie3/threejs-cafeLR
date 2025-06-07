import { atom, useAtom } from "jotai";
import { useEffect } from "react";

const pictures = [
  "coverback",
  "page1",
  "page2",
  "page3",
  "page4",
  "page5",
  "blank",
  "blank",
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

  //audio flipping
  useEffect(() => {
    const audio = new Audio("/audios/page-flip.mp3");
    audio.play();
  }, [page]);

  return (
    <>
      <main className="pointer-events-none select-none z-10 fixed  inset-0  flex justify-between flex-col">
        <div className="grid grid-cols-[30%_70%]">
          <a
            className="pointer-events-auto mt-10 ml-10"
            href="https://lycoris-recoil.com/cafe_lyco_reco/"
          >
            <img className="w-30 h-20 hover:scale-105" src="/images/logo.png" />
          </a>
          <div className="bg-white/40 rounded-xl p-3 mt-5 mr-5">
            <h2 className="text-black text-xs">
              Hi! This is an interactive project inspired by episode 3 of Lycoris Recoil Short Movies! For the meantime, you can flip through the pages of Chisato's original draft menu. I have future plans to add a comment section on the blank pages for fans to leave messages, but until I figure out how to implement that, feel free to flip through!<br />
              *Hold the SHIFT key and click+hold the mouse to move the position of the book.<br />
              *Click+hold the mouse to rotate book.<br />
              *Click the book or buttons to flip through pages.<br />
              *Use the mouse scroll to zoom in and out.<br />
              (TIP: click+hold outside the book to avoid page auto-flip on release)
            </h2>
          </div>
        </div>
        <div className="w-full overflow-auto pointer-events-auto flex justify-center">
          <div className="overflow-auto flex items-center gap-4 max-w-full p-10">
            {[...pages].map((_, index) => (
              <button
                key={index}
                className={`border-transparent hover:border-white transition-all duration-300  px-4 py-3 rounded-full  text-lg uppercase shrink-0 border ${
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
              className={`border-transparent hover:border-white transition-all duration-300  px-4 py-3 rounded-full  text-lg uppercase shrink-0 border ${
                page === pages.length
                  ? "bg-white/90 text-black"
                  : "bg-black/30 text-white"
              }`}
              onClick={() => setPage(pages.length)}
            >
              Back Cover
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
