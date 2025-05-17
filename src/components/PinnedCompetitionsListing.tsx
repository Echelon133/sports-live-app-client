import { CompetitionInfo } from "@/types/Competition";
import getConfig from "next/config";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import PinIcon from "./icons/PinIcon";

const { publicRuntimeConfig } = getConfig();

export default function PinnedCompetitionListing(props: {
  togglePinnedCompetitions?: () => void
}) {
  const [competitions, setCompetitions] = useState<CompetitionInfo[]>([]);

  useEffect(() => {
    const pinnedCompetitionsUrl = `${publicRuntimeConfig.COMPETITIONS_BASE_URL}/pinned`;
    fetch(pinnedCompetitionsUrl)
      .then((res) => res.json())
      .then((data) => {
        const d: CompetitionInfo[] = data;
        setCompetitions(d);
      });
  }, []);

  return (
    <>
      <div className="z-50 relative flex flex-col bg-c0 items-center text-c4 h-full px-5 pt-5">
        <div className="flex flex-row items-center pt-5 md:pt-12">
          <PinIcon />
          <h2 className="pl-2 text-sm">Pinned Competitions</h2>
        </div>
        <ul className="flex flex-col mt-5">
          {competitions.map(c => {
            return (
              <li key={c.id} className="mb-2 hover:bg-c1 px-2 py-1 rounded-md">
                <Link href={`/competition/${encodeURIComponent(c.id)}`} onClick={props.togglePinnedCompetitions}>
                  <div className="flex flex-row items-center gap-1">
                    <Image
                      className="bg-white p-[0.1rem] h-[23px] w-[23px] rounded-sm float-left mr-2"
                      width="23"
                      height="23"
                      src={c.logoUrl ?? "placeholder-competition-logo.svg"}
                      alt={c.name ?? "Competition's logo"} />
                    <span className="text-sm hover:underline text-c4">{c.name}</span>
                  </div>
                </Link>
              </li>
            );
          })
          }
        </ul>
      </div>
    </>
  );
}
