import { TeamFormEntry } from "@/types/Competition";
import Link from "next/link";

export function FormEntriesBox(props: { formEntries: TeamFormEntry[] }) {
  return (
    <>
      {props.formEntries.map((entry, i) => {
        let color = "bg-gray-500";
        if (entry.form === "W") {
          color = "bg-green-500";
        } else if (entry.form === "L") {
          color = "bg-red-500";
        }
        const score = `${entry.matchDetails.scoreInfo.homeGoals}:${entry.matchDetails.scoreInfo.awayGoals}`;
        const desc = `${entry.matchDetails.homeTeam?.name} ${score} ${entry.matchDetails.awayTeam?.name}`;
        return (
          <>
            <Link key={i} href={`/match/${encodeURIComponent(entry.matchDetails.id)}`}>
              <span
                key={i}
                className={`${color} px-2 py-1 font-extrabold rounded-lg text-white hover:underline hover:cursor-pointer`}
                title={desc}
              >{entry.form}</span>
            </Link>
          </>
        )
      })}
    </>
  )
}
