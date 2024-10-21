import { useRouter } from "next/router"
import Image from 'next/image'
import getConfig from "next/config";
import { useEffect, useState } from "react";
import { FullMatchInfo, MatchStatus, Score, formatMatchDate } from "@/types/Match";
import { CompetitionInfo } from "@/types/Competition";
import MatchEventsSummary from "@/components/MatchEventsSummary";
import FilterMenu, { FilterMenuInfo, FilterOption, FilterOptionKey } from "@/components/FilterMenu";
import MatchLineupListing from "@/components/MatchLineupListing";
import Link from "next/link";

const { publicRuntimeConfig } = getConfig();

type AllMatchInfo = {
  match: FullMatchInfo,
  competition: CompetitionInfo,
}

export type UpdateableMatchInfo = {
  fullTimeScore: {
    value: Score,
    highlight: boolean
  },
  status: {
    value: MatchStatus,
    highlight: boolean
  },
}

const INITIAL_MATCH_INFO = {
  fullTimeScore: {
    value: { homeGoals: 0, awayGoals: 0 },
    highlight: false
  },
  status: {
    value: MatchStatus.NOT_STARTED,
    highlight: false
  }
};

export default function Match() {
  const [matchInfoContentLoaded, setMatchInfoContentLoaded] = useState<boolean>(false);

  const router = useRouter();

  // setup the filter menu with two options: SUMMARY and LINEUPS 
  const DEFAULT_MATCH_FILTER: FilterOptionKey = "summary";
  const matchFilterOptions: Map<FilterOptionKey, FilterOption> = new Map([
    [DEFAULT_MATCH_FILTER, { displayName: "SUMMARY", isSelected: true }],
    ["lineups", { displayName: "LINEUPS", isSelected: false }],
  ]);
  const [selectedMatchInfoOption, setSelectedMatchInfoOption] = useState<string>(DEFAULT_MATCH_FILTER);
  const filterMenuInfo: FilterMenuInfo = {
    options: matchFilterOptions,
    currentlySelected: selectedMatchInfoOption,
    setCurrentlySelected: setSelectedMatchInfoOption
  };

  const [allMatchInformation, setAllMatchInformation] = useState<AllMatchInfo | undefined>(undefined);

  // match info which can change as the match progresses (in case new match events are received
  // via socket.io AFTER the initial render of the page)
  const [updateableMatchInfo, setUpdateableMatchInfo] = useState<UpdateableMatchInfo>(INITIAL_MATCH_INFO);

  useEffect(() => {
    if (router.query.id === undefined) {
      return;
    }
    const matchUrl = `${publicRuntimeConfig.MATCHES_BASE_URL}/${router.query.id}`;
    fetchFullMatchInfo(matchUrl)
      .then(async (matchInfo) => {
        const competitionUrl = `${publicRuntimeConfig.COMPETITIONS_BASE_URL}/${matchInfo.competitionId}`;
        await fetch(competitionUrl)
          .then((res) => res.json())
          .then(async (data) => {
            const competition: CompetitionInfo = data;
            setAllMatchInformation({ match: matchInfo, competition: competition });
            setUpdateableMatchInfo({
              fullTimeScore: {
                value: matchInfo.scoreInfo,
                highlight: false
              },
              status: {
                value: matchInfo.status,
                highlight: false
              }
            });
            setMatchInfoContentLoaded(true);
          });
      })
      .catch((error) => {
        if (error.message === "404") {
          router.push("/404")
        } else {
          setAllMatchInformation(undefined)
        }
      });
  }, [router.query.id]);


  return (
    <div className="flex flex-row items-center justify-center">
      <div className="mt-10 basis-full">
        {matchInfoContentLoaded && (allMatchInformation !== undefined) ?
          <MatchInfoContent
            allMatchInformation={allMatchInformation}
            updateableMatchInfo={updateableMatchInfo} />
          :
          <MatchInfoContentSkeleton />
        }
        <div className="ml-10 mt-5">
          <FilterMenu filter={filterMenuInfo} />
        </div>
        {selectedMatchInfoOption === "summary" &&
          <MatchEventsSummary
            matchId={router.query.id?.toString()}
            homeTeamId={allMatchInformation?.match.homeTeam?.id}
            matchFinished={allMatchInformation?.match.status === MatchStatus.FINISHED}
            setUpdateableMatchInfo={setUpdateableMatchInfo} />
        }
        {selectedMatchInfoOption === "lineups" &&
          <MatchLineupListing matchId={router.query.id?.toString()} />
        }
      </div>
    </div>
  )
}

function MatchInfoContent(props: {
  allMatchInformation: AllMatchInfo,
  updateableMatchInfo: UpdateableMatchInfo,
}) {
  const matchInformation = props.allMatchInformation?.match;
  const competitionLogoUrl = props.allMatchInformation?.competition.logoUrl;
  const homeCrestUrl = matchInformation?.homeTeam?.crestUrl;
  const awayCrestUrl = matchInformation?.awayTeam?.crestUrl;
  const matchDate = formatMatchDate(matchInformation?.startTimeUTC);

  return (
    <>
      <div className="pl-4 bg-c2 py-3">
        <Image
          className="bg-white p-1 rounded-sm float-left mr-2"
          width="25"
          height="25"
          src={competitionLogoUrl ? competitionLogoUrl : "../../placeholder-competition-logo.svg"}
          alt="Competition name" />
        <Link href={`/competition/${props.allMatchInformation.competition.id}`}>
          <span className="font-extrabold hover:underline text-c4">{props.allMatchInformation?.competition.name}</span>
        </Link>
        <span className="font-extralight text-sm text-c3 ml-2">({props.allMatchInformation?.competition.season})</span>
      </div>
      <div className="flex flex-col bg-c1 pb-4">
        <div className="basis-full mt-8 text-center">
          <span className="font-mono text-sm text-c3">{matchDate}</span>
        </div>
        <div className="flex flex-row basis-full">
          <div className="basis-1/3">
            <div className="flex flex-col items-end">
              <div className="basis-full">
                <Image
                  className="h-24 w-24"
                  width="100"
                  height="100"
                  src={homeCrestUrl ? homeCrestUrl : "../../placeholder-club-logo.svg"}
                  alt="Home team crest" />
              </div>
              <div className="basis-full">
                <Link href={`/team/${matchInformation.homeTeam?.id}`}>
                  <span className="font-extrabold hover:underline">{matchInformation?.homeTeam?.name}</span>
                </Link>
              </div>
            </div>
          </div>
          <div className="flex flex-col basis-1/3 text-center">
            <div className="basis-full pt-5">
              <span className={`text-5xl ${props.updateableMatchInfo.fullTimeScore.highlight ? "text-red" : ""}`}>
                {Score.format(props.updateableMatchInfo.fullTimeScore.value)}
              </span>
            </div>
            <div className="basis-full">
              <span className={`font-extrabold text-sm ${props.updateableMatchInfo.status.highlight ? "text-red" : ""}`}>
                {MatchStatus.format(props.updateableMatchInfo.status.value)}
              </span>
            </div>
            <div className="flex basis-full items-center justify-center pt-5">
              <Image
                className="pr-2"
                width="30"
                height="30"
                src="../../whistle.svg"
                alt="Referee"
                title="Referee" />
              <p className="font-extrabold text-xs">{matchInformation?.referee?.name}</p>
            </div>
            {matchInformation?.venue &&
              <div className="flex basis-full items-center justify-center">
                <Image
                  className="pr-2"
                  width="30"
                  height="30"
                  src="../../stadium.svg"
                  alt="Stadium"
                  title="Stadium" />
                <div className="">
                  <p className="font-extrabold text-xs">{matchInformation.venue.name}</p>
                  {matchInformation.venue.capacity &&
                    <p className="font-extrabold text-xs"> (capacity {matchInformation.venue.capacity})</p>
                  }
                </div>
              </div>
            }
          </div>
          <div className="basis-1/3">
            <div className="flex flex-col items-start">
              <div className="basis-full">
                <Image
                  className="h-24 w-24"
                  width="100"
                  height="100"
                  src={awayCrestUrl ? awayCrestUrl : "../../placeholder-club-logo.svg"}
                  alt="Away team crest" />
              </div>
              <div className="basis-full">
                <Link href={`/team/${matchInformation.awayTeam?.id}`}>
                  <span className="font-extrabold hover:underline">{matchInformation?.awayTeam?.name}</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function MatchInfoContentSkeleton() {
  return (
    <>
      <div className="animate-pulse h-12 bg-c2">
      </div>
      <div className="flex flex-col bg-c1 pb-8">
        <div className="basis-full mt-8"></div>
        <div className="flex flex-row basis-full">
          <div className="animate-pulse basis-1/3">
            <Image
              className="bg-white p-2 rounded-xl float-right animate-pulse"
              width="100"
              height="100"
              src="../../placeholder-club-logo.svg"
              alt="Club name" />
          </div>
          <div className="flex flex-col basis-1/3 text-center">
            <div className="basis-full pt-5">
              <span className="animate-pulse text-5xl text-white">-</span>
            </div>
          </div>
          <div className="animate-pulse basis-1/3">
            <Image
              className="bg-white p-2 rounded-xl float-left animate-pulse"
              width="100"
              height="100"
              src="../../placeholder-club-logo.svg"
              alt="Club name" />
          </div>
        </div>
      </div>
    </>
  )
}

async function fetchFullMatchInfo(matchUrl: string): Promise<FullMatchInfo> {
  return new Promise(async (resolve, reject) => {
    await fetch(matchUrl)
      .then((res) => {
        if (res.status !== 200) {
          reject(Error(res.status.toString()))
        }
        return res
      })
      .then((res) => res.text())
      .then(async (data) => {
        const d: FullMatchInfo = FullMatchInfo.fromJSON(data);
        resolve(d);
      })
  });
}
