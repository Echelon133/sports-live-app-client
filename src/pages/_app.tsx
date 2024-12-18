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
      <div className={`absolute top-20 ${showPinnedCompetitions ? "invisible" : "visible"}`}>
        <button
          onClick={togglePinnedCompetitions}
          className="text-white bg-c0 hover:underline hover:cursor-pointer p-3 border border-white rounded-r-full"
          title="Show Pinned Competitions"
        >&gt;</button>
      </div>
      <PinnedCompetitionListing
        showPinnedCompetitions={showPinnedCompetitions}
        togglePinnedCompetitions={togglePinnedCompetitions}
      />
      <div className="flex justify-center">
        <div className="basis-full md:basis-[768px]">
          <Component {...pageProps} />
        </div>
      </div>
    </>
  )
}
