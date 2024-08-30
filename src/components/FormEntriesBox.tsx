import { TeamFormEntry } from "@/types/Competition";
import { formatMatchDate } from "@/types/Match";
import Link from "next/link";
import { useState } from "react";

export function FormEntriesBox(props: { formEntries: TeamFormEntry[] }) {
  return (
    <>
      {props.formEntries.map((entry) => {
        return <FormEntry entry={entry} />
      })}
    </>
  )
}

function FormEntry(props: { entry: TeamFormEntry }) {
  const [detailsVisible, setDetailsVisible] = useState<boolean>(false);

  const entry = props.entry;
  let color = "bg-gray-500";
  if (entry.form === "W") {
    color = "bg-green-500";
  } else if (entry.form === "L") {
    color = "bg-red-500";
  }
  const score = `${entry.matchDetails.scoreInfo.homeGoals}:${entry.matchDetails.scoreInfo.awayGoals}`;
  const teams = `${entry.matchDetails.homeTeam?.name} vs ${entry.matchDetails.awayTeam?.name}`;

  return (
    <>
      <div className="flex">
        <div
          className="basis-full pl-1"
          onMouseOver={() => setDetailsVisible(true)}
          onMouseLeave={() => setDetailsVisible(false)}
        >
          <Link key={props.entry.matchDetails.id} href={`/match/${encodeURIComponent(props.entry.matchDetails.id)}`}>
            <span
              key={props.entry.matchDetails.id}
              className={`${color} px-2 py-1 font-extrabold rounded-lg text-white hover:underline hover:cursor-pointer`}
            >{props.entry.form}</span>
          </Link>
        </div>
        <div className="relative basis-full">
          <div className={`absolute top-7 right-0 z-50 text-center text-white rounded-lg bg-rose-500 ${detailsVisible ? "" : "hidden"} `}>
            <div className="flex flex-col">
              <div className="basis-full px-2 py-2">
                <p>
                  <span className="text-sm font-extrabold">{score}</span>
                  <span className="text-xs font-extralight"> ({teams})</span>
                </p>
                <p className="p-1">{formatMatchDate(entry.matchDetails.startTimeUTC)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
