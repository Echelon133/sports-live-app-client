import DatePicker from "@/components/DatePicker";
import getConfig from "next/config";
import GroupedMatchInfo from "@/components/GroupedMatchInfo";
import { INITIAL_DATE_PICKER_KEY } from "@/components/DatePicker";
import { useEffect, useState } from "react";
import { Competition, CompetitionGroupedMatches, CompetitionIdGroupedMatches } from "@/types/Competition";
import { CompactMatchInfo } from "@/types/Match";

const { publicRuntimeConfig } = getConfig();

const UTC_OFFSET = '+01:00';

export default function Home() {
  const [selectedDateKey, setSelectedDateKey] = useState<string>(INITIAL_DATE_PICKER_KEY);
  const [competitionGroupedMatches, setCompetitionGroupedMatches] =
    useState<CompetitionGroupedMatches>(new Map());

  useEffect(() => {
    const httpParams = new URLSearchParams({
      date: selectedDateKey,
      utcOffset: UTC_OFFSET,
    });

    fetchGroupedMatches(httpParams)
      .then((competitionGroupedMatches) => setCompetitionGroupedMatches(competitionGroupedMatches))
      .catch(() => setCompetitionGroupedMatches(new Map()));
  }, [selectedDateKey]);


  return (
    <main>
      <DatePicker selectedDateKey={selectedDateKey} setSelectedDateKey={setSelectedDateKey} />
      {competitionGroupedMatches.size > 0 ?
        <div className="mt-8 h-full">
          {
            Array.from(competitionGroupedMatches).map(([competitionInfo, matches]) => {
              return <GroupedMatchInfo competitionInfo={competitionInfo} matches={matches} />
            })
          }
        </div>
        :
        <div className="mt-8 py-40 bg-rose-300 text-center">
          <span className="font-mono text-2xl font-extrabold">No matches available</span>
        </div>
      }
    </main>
  );
}

async function fetchGroupedMatches(httpParams: URLSearchParams): Promise<CompetitionGroupedMatches> {
  return new Promise(async (resolve, reject) => {
    const matchesUrl = `${publicRuntimeConfig.MATCHES_BASE_URL}?${httpParams.toString()}`;
    await fetch(matchesUrl)
      .then((res) => res.text())
      .catch(() => reject(Error("fetching matches failed")))
      .then(async (data) => {
        // rebuild request's body into our custom type
        const d: CompetitionIdGroupedMatches = CompetitionIdGroupedMatches.fromJSON(data);

        type CompetitionMatchesEntry = { competition: Competition, matches: CompactMatchInfo[] };
        // Asynchronously fetch information about every competition by that competition's id.
        // The initial request only gives us the id of the competition, which means that the rest
        // of the information needs to be fetched manually.
        let promises: Promise<CompetitionMatchesEntry>[] = [];
        d.forEach((matches, competitionId) => {
          const competitionUrl = `${publicRuntimeConfig.COMPETITIONS_BASE_URL}/${competitionId}`;
          const promise: Promise<CompetitionMatchesEntry> = fetch(competitionUrl)
            .then((res) => res.json())
            .then((data) => {
              return { competition: data, matches: matches };
            });
          promises.push(promise);
        });

        // wait for all to succeed, then on success set fetched matches to render the data
        Promise.all(promises)
          .then((arr) => {
            let competitionGroupedMatches: CompetitionGroupedMatches = new Map();
            arr.forEach((pair) => {
              competitionGroupedMatches.set(pair.competition, pair.matches);
            })
            resolve(competitionGroupedMatches);
          });
      })
      .catch(() => reject(Error("fetching information about competitions failed")))
  });
}
