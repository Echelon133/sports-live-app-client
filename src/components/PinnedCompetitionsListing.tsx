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
          <h2 className="pl-2">Pinned Competitions</h2>
        </div>
        <ul className="flex flex-col mt-5">
          {competitions.map(c => {
            return (
              <li key={c.id} className="pl-4 mb-4">
                <Image
                  className="bg-white p-1 rounded-sm float-left mr-2"
                  width="25"
                  height="25"
                  src={c.logoUrl ?? "placeholder-competition-logo.svg"}
                  alt={c.name ?? "Competition's logo"} />
                <Link
                  href={`/competition/${c.id}`}
                  onClick={props.togglePinnedCompetitions}>
                  <span className="font-extrabold hover:underline text-c4">{c.name}</span>
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
