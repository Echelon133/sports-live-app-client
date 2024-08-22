import { useState } from 'react';
import Image from 'next/image'
import { CompactMatchInfo, MatchStatus } from '@/types/Match';
import { CompetitionInfo } from '@/types/Competition';
import Link from 'next/link';


export default function GroupedMatchInfo(props: {
  competitionInfo: CompetitionInfo,
  matches: CompactMatchInfo[]
}) {
  const [matchListVisible, setMatchListVisible] = useState<boolean>(true);
  const competitionLogoUrl = props.competitionInfo.logoUrl;

  function toggleMatchListVisibility() {
    setMatchListVisible(prev => !prev);
  }

  return (
    <>
      <div className="flex flex-row bg-rose-200 items-center justify-center">
        <div className="mt-2 basis-full">
          <div className="bg-rose-300 shadow-sm shadow-black">
            <div className="p-3 pl-10">
              <Image
                className="float-left mr-2"
                width="20"
                height="20"
                src={competitionLogoUrl ? competitionLogoUrl : "placeholder-competition-logo.svg"}
                alt={props.competitionInfo.name} />
              <Link href={`/competition/${props.competitionInfo.id}`}>
                <span className="font-extrabold hover:underline">{props.competitionInfo.name}</span>
              </Link>
              <span className="font-extralight text-sm text-gray-500 ml-2">({props.competitionInfo.season})</span>
              <button onClick={toggleMatchListVisibility} className="font-light text-sm flex float-right">
                {matchListVisible ?
                  <Image
                    className="float-left"
                    width="30"
                    height="30"
                    src="/chevron-up.svg"
                    title="Hide all grouped"
                    alt="Hide all grouped" />
                  :
                  <Image
                    className="float-left"
                    width="30"
                    height="30"
                    src="/chevron-down.svg"
                    title="Show all grouped"
                    alt="Show all grouped" />
                }
              </button>
            </div>
          </div>
          <div className={`${matchListVisible ? "" : "hidden"} `} >
            {props.matches.length === 0 &&
              <div className="flex flex-row bg-rose-100 h-14 shadow-sm shadow-gray-400 items-center justify-center">
                <span className="font-extrabold text-xl">No matches</span>
              </div>
            }
            {props.matches.map(m => {
              return <Link href={`/match/${encodeURIComponent(m.id)}`}> <SingleMatchInfo matchInfo={m} /></Link>
            })}
          </div>
        </div>
      </div >
    </>
  );
}

function SingleMatchInfo(props: { matchInfo: CompactMatchInfo }) {
  const matchInfo: string = evaluateMatchInfo(props.matchInfo.status, props.matchInfo.startTimeUTC);
  const homeCrestUrl: string | undefined = props.matchInfo.homeTeam?.crestUrl;
  const awayCrestUrl: string | undefined = props.matchInfo.awayTeam?.crestUrl;
  const displayMatchDate = props.matchInfo.status === MatchStatus.NOT_STARTED ||
    props.matchInfo.status === MatchStatus.FINISHED;

  return (
    <div className="mb-1 flex flex-row bg-rose-100 h-14 shadow-sm shadow-gray-400 items-center justify-center hover:bg-rose-200 hover:cursor-pointer">
      <div className="basis-2/12 text-center">
        <div className="flex flex-col">
          <span className={`${matchInfo === "Live" ? "text-red-500" : ""} text-sm`}>{matchInfo}</span>
          {displayMatchDate &&
            <span className="text-gray-700 text-xs">{formatFinishedMatchDate(props.matchInfo.startTimeUTC)}</span>
          }
        </div>
      </div>
      <div className="basis-10/12 flex flex-col">
        <div className="flex">
          <div className="basis-10/12">
            <Image
              className="float-left"
              width="18"
              height="18"
              src={homeCrestUrl ? homeCrestUrl : "placeholder-club-logo.svg"}
              alt="Home team crest" />
            <span className="font-mono ml-2">{props.matchInfo.homeTeam?.name}</span>
          </div>
          <div className="basis-2/12">
            <span title="Score at fulltime" className="font-extrabold">{props.matchInfo.scoreInfo.homeGoals}</span>
            <span title="Score at halftime" className="ml-5 text-gray-500 font-extralight">{props.matchInfo.halfTimeScoreInfo.homeGoals}</span>
          </div>
        </div>
        <div className="flex">
          <div className="basis-10/12">
            <Image
              className="float-left"
              width="18"
              height="18"
              src={awayCrestUrl ? awayCrestUrl : "placeholder-club-logo.svg"}
              alt="Away team crest" />
            <span className="font-mono ml-2">{props.matchInfo.awayTeam?.name}</span>
          </div>
          <div className="basis-2/12">
            <span title="Score at fulltime" className="font-extrabold">{props.matchInfo.scoreInfo.awayGoals}</span>
            <span title="Score at halftime" className="ml-5 text-gray-500 font-extralight">{props.matchInfo.halfTimeScoreInfo.awayGoals}</span>
          </div>
        </div>
      </div>
    </div>

  );
}

function evaluateMatchInfo(status: MatchStatus, startTimeUTC: Date): string {
  let matchInfo = "";
  switch (status) {
    case MatchStatus.NOT_STARTED:
      // convert UTC to local time
      matchInfo = startTimeUTC.toTimeString().substring(0, 5);
      break;
    case MatchStatus.FIRST_HALF:
    case MatchStatus.SECOND_HALF:
    case MatchStatus.EXTRA_TIME:
    case MatchStatus.PENALTIES:
      matchInfo = "Live";
      break;
    case MatchStatus.HALF_TIME:
      matchInfo = "HT";
      break;
    case MatchStatus.FINISHED:
      matchInfo = "Finished";
      break;
    case MatchStatus.POSTPONED:
      matchInfo = "Postponed";
      break;
    case MatchStatus.ABANDONED:
      matchInfo = "Abandoned";
      break;
  }
  return matchInfo;
}

function formatFinishedMatchDate(d: Date): string {
  if (d === undefined) return ""
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }
  return d.toLocaleDateString(undefined, options);
}
