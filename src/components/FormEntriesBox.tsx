import { TeamFormEntry } from "@/types/Competition";
import { formatMatchDate } from "@/types/Match";
import Link from "next/link";
import { Dispatch, SetStateAction, useState } from "react";

export function FormEntriesBox(props: {
  formEntries: TeamFormEntry[],
  setHighlightedTeamsIds: Dispatch<SetStateAction<string[]>> | undefined
}) {
  return (
    <>
      {props.formEntries.map((entry, i) => {
        return <FormEntry key={i} entry={entry} setHighlightedTeamsIds={props.setHighlightedTeamsIds} />
      })}
    </>
  )
}

function FormEntry(props: {
  entry: TeamFormEntry,
  setHighlightedTeamsIds: Dispatch<SetStateAction<string[]>> | undefined,
}) {
  const [detailsVisible, setDetailsVisible] = useState<boolean>(false);

  const entry = props.entry;
  let color = "bg-gray";
  if (entry.form === "W") {
    color = "bg-green";
  } else if (entry.form === "L") {
    color = "bg-red";
  }
  const score = `${entry.matchDetails.scoreInfo.homeGoals}:${entry.matchDetails.scoreInfo.awayGoals}`;
  const teams = `${entry.matchDetails.homeTeam?.name} vs ${entry.matchDetails.awayTeam?.name}`;

  function entryMouseOver() {
    setDetailsVisible(true)
    if (props.setHighlightedTeamsIds !== undefined) {
      const homeTeamId = props.entry.matchDetails.homeTeam!.id;
      const awayTeamId = props.entry.matchDetails.awayTeam!.id;
      props.setHighlightedTeamsIds([homeTeamId, awayTeamId])
    }
  }

  function entryMouseLeave() {
    setDetailsVisible(false)
    if (props.setHighlightedTeamsIds !== undefined) {
      props.setHighlightedTeamsIds([])
    }
  }

  return (
    <>
      <div className="flex">
        <div
          className="basis-full pl-2 py-1"
          onMouseOver={() => entryMouseOver()}
          onMouseLeave={() => entryMouseLeave()}
        >
          <Link key={props.entry.matchDetails.id} href={`/match/${encodeURIComponent(props.entry.matchDetails.id)}`}>
            <span
              key={props.entry.matchDetails.id}
              className={`${color} px-2 py-1 font-extrabold rounded-lg text-white hover:underline hover:cursor-pointer`}
            >{props.entry.form}</span>
          </Link>
        </div>
        <div className="relative">
          <div className={`w-52 absolute top-12 right-0 z-50 text-center rounded-lg bg-gray ${detailsVisible ? "" : "hidden"} `}>
            <div className="flex">
              <div className="basis-full px-1 py-1">
                <p className="text-sm font-extrabold pb-1">{score}</p>
                <p className="text-xs font-extralight pb-2">{teams}</p>
                <p className="text-sm font-extralight">{formatMatchDate(entry.matchDetails.startTimeUTC)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
