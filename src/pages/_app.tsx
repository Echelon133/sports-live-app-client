import Nav from "@/components/Nav";
import PinnedCompetitionListing from "@/components/PinnedCompetitionsListing";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useState } from "react";

export default function App({ Component, pageProps }: AppProps) {
  const [showPinnedCompetitions, setShowPinnedCompetitions] = useState(false);

  const togglePinnedCompetitions = () => {
    setShowPinnedCompetitions((prev) => !prev);
  }

  return (
    <>
      <Nav />
      { /* button toggling pinned competitions sidebar (available before md breakpoint) */}
      <div className={`absolute top-20 md:invisible ${showPinnedCompetitions ? "invisible" : "visible"}`}>
        <button
          onClick={togglePinnedCompetitions}
          className={`text-white bg-c0 hover:underline hover:cursor-pointer p-3 border border-white rounded-r-full`}
          title="Show Pinned Competitions"
        >&gt;</button>
      </div>
      { /* pinned competitions sidebar (dissapears after hitting the md breakpoint) */}
      <div className={`md:hidden fixed h-full top-0 ${showPinnedCompetitions ? "visible" : "invisible"}`}>
        <PinnedCompetitionListing togglePinnedCompetitions={togglePinnedCompetitions} />
      </div>
      <div className="flex justify-center">
        { /* pinned competitions div (appears after hitting the md breakpoint) */}
        <div className="hidden md:block">
          <PinnedCompetitionListing togglePinnedCompetitions={togglePinnedCompetitions} />
        </div>
        <div className="basis-full md:basis-[768px]">
          <Component {...pageProps} />
        </div>
      </div>
    </>
  )
}
