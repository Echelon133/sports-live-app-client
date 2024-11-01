import DatePicker from "@/components/DatePicker";
import getConfig from "next/config";
import GroupedMatchInfo from "@/components/GroupedMatchInfo";
import { useEffect, useState } from "react";
import { CompetitionInfo, CompetitionGroupedMatches, CompetitionIdGroupedMatches } from "@/types/Competition";
import { CompactMatchInfo } from "@/types/Match";
import GroupedMatchInfoSkeleton from "@/components/GroupedMatchInfoSkeleton";
import { Socket, io } from "socket.io-client";

const { publicRuntimeConfig } = getConfig();

const UTC_OFFSET = '+01:00';

export default function Home() {
  const [groupedMatchesContentLoaded, setGroupedMatchesContentLoaded] = useState<boolean>(false);
  const [selectedDateKey, setSelectedDateKey] = useState<string | undefined>(undefined);
  const [competitionGroupedMatches, setCompetitionGroupedMatches] =
    useState<CompetitionGroupedMatches>(new Map());
  const [globalUpdatesSocket, setGlobalUpdatesSocket] = useState<Socket | undefined>(undefined);

  useEffect(() => {
    // do not fetch any data until the picker initializes
    // itself with either a default date or a date restored from
    // a cookie
    if (selectedDateKey === undefined) {
      return;
    }

    const httpParams = new URLSearchParams({
      date: selectedDateKey,
      utcOffset: UTC_OFFSET,
    });

    fetchGroupedMatches(httpParams)
      .then((competitionGroupedMatches) => {
        setCompetitionGroupedMatches(competitionGroupedMatches);
        setGroupedMatchesContentLoaded(true);
      });
  }, [selectedDateKey]);

  // connect to a websocket which broadcasts global match events
  useEffect(() => {
    const connectionUrl = `${publicRuntimeConfig.GLOBAL_MATCH_EVENTS_WS_URL}`;
    // only connectionUrl is required, since these events are global, and not match specific
    const socket = io(connectionUrl);
    setGlobalUpdatesSocket(socket);

    return () => {
      socket.disconnect();
    }
  }, []);

  return (
    <main>
      <DatePicker selectedDateKey={selectedDateKey} setSelectedDateKey={setSelectedDateKey} />
      {groupedMatchesContentLoaded ?
        <GroupedMatchesContent
          competitionGroupedMatches={competitionGroupedMatches}
          globalUpdatesSocket={globalUpdatesSocket}
        />
        :
        <GroupedMatchInfoSkeleton />
      }
    </main>
  );
}

function GroupedMatchesContent(props: {
  competitionGroupedMatches: CompetitionGroupedMatches,
  globalUpdatesSocket: Socket | undefined
}) {
  return (
    <>
      {props.competitionGroupedMatches.size > 0 ?
        <div className="mt-8 h-full">
          {
            Array.from(props.competitionGroupedMatches).map(([competitionInfo, matches]) => {
              return <GroupedMatchInfo
                competitionInfo={competitionInfo}
                matches={matches}
                globalUpdatesSocket={props.globalUpdatesSocket}
              />
            })
          }
        </div>
        :
        < div className="mt-8 py-40 text-center">
          <span className="font-mono text-2xl font-extrabold text-c4">No matches available</span>
        </div >
      }
    </>
  )
}

async function fetchGroupedMatches(httpParams: URLSearchParams): Promise<CompetitionGroupedMatches> {
  return new Promise(async (resolve) => {
    const matchesUrl = `${publicRuntimeConfig.MATCHES_BASE_URL}?${httpParams.toString()}`;
    await fetch(matchesUrl)
      .then((res) => res.text())
      .then(async (data) => {
        // rebuild request's body into our custom type
        const d: CompetitionIdGroupedMatches = CompetitionIdGroupedMatches.fromJSON(data);

        type CompetitionMatchesEntry = { competition: CompetitionInfo, matches: CompactMatchInfo[] };
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
  });
}
