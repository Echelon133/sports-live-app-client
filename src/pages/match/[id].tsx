import { useRouter } from "next/router"
import Image from 'next/image'
import getConfig from "next/config";
import { useEffect, useState } from "react";
import { FullMatchInfo, MatchStatus } from "@/types/Match";
import { Competition } from "@/types/Competition";

const { publicRuntimeConfig } = getConfig();

type AllMatchInfo = {
  match: FullMatchInfo,
  competition: Competition
}

export default function Match() {
  const router = useRouter();
  const [allMatchInformation, setAllMatchInformation] = useState<AllMatchInfo | undefined>(undefined);

  const matchId = router.query.id;
  const matchInformation = allMatchInformation?.match;
  const competitionLogoUrl = allMatchInformation?.competition.logoUrl;
  const homeCrestUrl = matchInformation?.homeTeam?.crestUrl;
  const awayCrestUrl = matchInformation?.awayTeam?.crestUrl;
  const fullTimeScore = `${matchInformation?.scoreInfo.homeGoals}:${matchInformation?.scoreInfo.awayGoals}`;
  const matchDate = formatMatchDate(matchInformation?.startTimeUTC);
  const matchStatus = formatMatchStatus(matchInformation?.status);

  useEffect(() => {
    if (matchId === undefined) {
      return;
    }
    const matchUrl = `${publicRuntimeConfig.MATCHES_BASE_URL}/${router.query.id}`;
    fetchFullMatchInfo(matchUrl)
      .then(async (matchInfo) => {
        const competitionUrl = `${publicRuntimeConfig.COMPETITIONS_BASE_URL}/${matchInfo.competitionId}`;
        await fetch(competitionUrl)
          .then((res) => res.json())
          .then((data) => {
            const competition: Competition = data;
            setAllMatchInformation({ match: matchInfo, competition: competition });
          });
      })
      .catch(() => setAllMatchInformation(undefined));
  }, [matchId]);

  return (
    <div className="flex flex-row bg-rose-200 items-center justify-center">
      <div className="mt-10 basis-full">
        <div className="pl-4 bg-rose-500 py-3">
          <Image
            className="float-left mr-2"
            width="20"
            height="20"
            src={competitionLogoUrl ? competitionLogoUrl : "../../placeholder-competition-logo.svg"}
            alt="Competition name" />
          <a className="font-extrabold hover:underline" href="#">{allMatchInformation?.competition.name}</a>
          <span className="font-extralight text-sm text-gray-500 ml-2">({allMatchInformation?.competition.season})</span>
        </div>
        <div className="flex flex-col bs-rose-200">
          <div className="basis-full mt-8 text-center">
            <span className="font-mono text-sm">{matchDate}</span>
          </div>
          <div className="flex flex-row basis-full">
            <div className="basis-1/3 bg-yellow-100">
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
                  <span className="font-extrabold">{matchInformation?.homeTeam?.name}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col basis-1/3 bg-red-100 text-center">
              <div className="basis-full pt-5">
                <span className="text-5xl">{fullTimeScore}</span>
              </div>
              <div className="basis-full">
                <span className="font-extrabold text-sm">{matchStatus}</span>
              </div>
            </div>
            <div className="basis-1/3 bg-yellow-100">
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
                  <span className="font-extrabold">{matchInformation?.awayTeam?.name}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

async function fetchFullMatchInfo(matchUrl: string): Promise<FullMatchInfo> {
  return new Promise(async (resolve, reject) => {
    await fetch(matchUrl)
      .then((res) => res.text())
      .catch(() => reject(Error("fetching match failed")))
      .then(async (data) => {
        const d: FullMatchInfo = FullMatchInfo.fromJSON(data);
        resolve(d);
      })
      .catch(() => reject(Error("deserialization of the match failed")));
  });
}

// Format date as yyyy/mm/dd hh:MM
function formatMatchDate(d?: Date): string {
  if (d === undefined) return "";
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }
  return d.toLocaleDateString(undefined, options);
}

function formatMatchStatus(status?: MatchStatus): string {
  if (status === undefined) return "";
  return MatchStatus[status];
}
