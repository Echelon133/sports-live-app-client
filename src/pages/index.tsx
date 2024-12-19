import DatePicker from "@/components/DatePicker";
import getConfig from "next/config";
import GroupedMatchInfo from "@/components/GroupedMatchInfo";
import { useEffect, useState } from "react";
import { CompetitionInfo, CompetitionGroupedMatches, CompetitionIdGroupedMatches } from "@/types/Competition";
import { CompactMatchInfo } from "@/types/Match";
import GroupedMatchInfoSkeleton from "@/components/GroupedMatchInfoSkeleton";
import { Socket, io } from "socket.io-client";
import InfoMessage from "@/components/InfoMessage";

const { publicRuntimeConfig } = getConfig();

function calculateClientUTCOffset(): string {
  const now = new Date();
  const timezoneDiffInMinutes = now.getTimezoneOffset();

  // getTimezoneOffset returns how many minutes of difference there is between
  // a local timezone and UTC
  //
  // example: a UTC+9 timezone is represented as -540 minutes (i.e. -9 hours)
  // and our backend requires that offset represented as '+09:00', therefore we
  // need to flip the sign
  const diffHours = -1 * (timezoneDiffInMinutes / 60);
  const diffMinutes = Math.abs(timezoneDiffInMinutes % diffHours);

  // timezone offsets of timezones in front of the UTC need to start with a '+', whereas
  // timezones that trail the UTC need to start with a '-'
  //
  // examples:
  //    * a timezone that's 1 hour in front of the UTC is represented as '+01:00'
  //    * a timezone that's trails the UTC by 4 hours and 30 minutes is represented as '-04:30'
  const offsetSign = (diffHours >= 0) ? "+" : "-";

  // make sure there is no negative sign in the diffHours string before adding
  // the leading zeros
  const hoursWithPadding = (Math.abs(diffHours)).toString().padStart(2, "0");
  const minutesWithPadding = diffMinutes.toString().padStart(2, "0");
  return `${offsetSign}${hoursWithPadding}:${minutesWithPadding}`;
}

// When the client wants to fetch matches from a particular day, it must provide both the date
// and the offset between the user's timezone and the UTC. This makes sure that all
// fetched matches happen between 00:00AM and 11:59PM in that user's timezone.
const UTC_OFFSET = calculateClientUTCOffset();

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
    <>
      <div className="mt-10">
        <DatePicker selectedDateKey={selectedDateKey} setSelectedDateKey={setSelectedDateKey} />
        {groupedMatchesContentLoaded ?
          <GroupedMatchesContent
            competitionGroupedMatches={competitionGroupedMatches}
            globalUpdatesSocket={globalUpdatesSocket}
          />
          :
          <GroupedMatchInfoSkeleton />
        }
      </div>
    </>
  );
}

function GroupedMatchesContent(props: {
  competitionGroupedMatches: CompetitionGroupedMatches,
  globalUpdatesSocket: Socket | undefined
}) {
  return (
    <>
      {props.competitionGroupedMatches.size > 0 ?
        <div className="h-full">
          {
            Array.from(props.competitionGroupedMatches).map(([competitionInfo, matches], i) => {
              return <GroupedMatchInfo
                competitionInfo={competitionInfo}
                key={competitionInfo.id ?? i}
                matches={matches}
                globalUpdatesSocket={props.globalUpdatesSocket}
              />
            })
          }
        </div>
        :
        < div className="mt-8">
          <InfoMessage message="No results" />
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
