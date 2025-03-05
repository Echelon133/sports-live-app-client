import DatePicker from "@/components/DatePicker";
import getConfig from "next/config";
import GroupedMatchInfo from "@/components/GroupedMatchInfo";
import { useEffect, useState } from "react";
import { GroupedMatches } from "@/types/Competition";
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
    useState<GroupedMatches[]>([]);
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

    const matchesUrl = `${publicRuntimeConfig.MATCHES_BASE_URL}/grouped?${httpParams.toString()}`;
    fetch(matchesUrl)
      .then((res) => res.text())
      .then((data) => {
        // rebuild request's body into our custom type
        const d: GroupedMatches[] = GroupedMatches.fromJSON(data);
        setCompetitionGroupedMatches(d);
        setGroupedMatchesContentLoaded(true);
      })
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
      <div className="mt-10 rounded-md border border-x-c2 border-t-0 border-b-c2">
        <DatePicker selectedDateKey={selectedDateKey} setSelectedDateKey={setSelectedDateKey} />
        <div className="rounded-b-md">
          {groupedMatchesContentLoaded ?
            <GroupedMatchesContent
              competitionGroupedMatches={competitionGroupedMatches}
              globalUpdatesSocket={globalUpdatesSocket}
            />
            :
            <GroupedMatchInfoSkeleton />
          }
        </div>
      </div>
    </>
  );
}

function GroupedMatchesContent(props: {
  competitionGroupedMatches: GroupedMatches[],
  globalUpdatesSocket: Socket | undefined
}) {
  return (
    <>
      {props.competitionGroupedMatches.length > 0 ?
        <div className="h-full">
          {
            props.competitionGroupedMatches.map((groupedMatches, i) => {
              return <GroupedMatchInfo
                competitionInfo={groupedMatches.competition}
                key={groupedMatches.competition.id ?? i}
                matches={groupedMatches.matches}
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
