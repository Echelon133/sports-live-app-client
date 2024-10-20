import { useRouter } from "next/router";
import Image from 'next/image'
import { useEffect, useRef, useState } from "react";
import { FullTeamInfo, countryCodeToFlagEmoji } from "@/types/Team";
import getConfig from "next/config";
import FilterMenu, { FilterMenuInfo, FilterOption, FilterOptionKey } from "@/components/FilterMenu";
import GroupedMatchInfoSkeleton from "@/components/GroupedMatchInfoSkeleton";
import { CompetitionInfo, TeamFormEntries, TeamFormEntry } from "@/types/Competition";
import { CompactMatchInfo } from "@/types/Match";
import GroupedMatchInfo from "@/components/GroupedMatchInfo";
import { TeamPlayer } from "@/types/Lineup";
import { FormEntriesBox } from "@/components/FormEntriesBox";
import LoadMoreButton from "@/components/LoadMoreButton";
import { Socket, io } from "socket.io-client";

const { publicRuntimeConfig } = getConfig();

export default function Team() {
  const router = useRouter();

  const [teamInfoContentLoaded, setTeamInfoContentLoaded] = useState<boolean>(false);
  const [teamInformation, setTeamInformation] = useState<FullTeamInfo | undefined>(undefined);

  // setup the filter with three options: Results, Fixtures, Players 
  const DEFAULT_TEAM_FILTER: FilterOptionKey = "results";
  const teamFilterOptions: Map<FilterOptionKey, FilterOption> = new Map([
    [DEFAULT_TEAM_FILTER, { displayName: "RESULTS", isSelected: true }],
    ["fixtures", { displayName: "FIXTURES", isSelected: false }],
    ["players", { displayName: "PLAYERS", isSelected: false }],
  ]);
  const [selectedTeamInfoOption, setSelectedTeamInfoOption] = useState<string>(DEFAULT_TEAM_FILTER);
  const filterMenuInfo: FilterMenuInfo = {
    options: teamFilterOptions,
    currentlySelected: selectedTeamInfoOption,
    setCurrentlySelected: setSelectedTeamInfoOption
  };

  useEffect(() => {
    if (router.query.id === undefined) {
      return;
    }

    const teamUrl = `${publicRuntimeConfig.TEAMS_BASE_URL}/${router.query.id}`;
    fetch(teamUrl)
      .then((res) => res.json())
      .then((data) => {
        const d: FullTeamInfo = data;
        setTeamInformation(d);
        setTeamInfoContentLoaded(true);
      });

  }, [router.query.id]);


  return (
    <div className="flex flex-row items-center justify-center">
      <div className="mt-32 basis-full">
        {teamInfoContentLoaded ?
          <TeamInfoContent team={teamInformation} />
          :
          <TeamInfoContentSkeleton />
        }
        <div className="mt-12 flex flex-row justify-center">
          <div>
            <FilterMenu filter={filterMenuInfo} />
          </div>
        </div>
        <div className="mt-12 pb-32">
          {selectedTeamInfoOption === "results" &&
            <ResultsSummary team={teamInformation} />
          }
          {selectedTeamInfoOption === "fixtures" &&
            <FixturesSummary team={teamInformation} />
          }
          {selectedTeamInfoOption === "players" &&
            <TeamPlayersListing teamId={teamInformation?.id} />
          }
        </div>
      </div>
    </div>
  )
}

function TeamInfoContent(props: { team: FullTeamInfo | undefined }) {
  const teamCrestUrl = props.team?.crestUrl;
  const teamName = props.team?.name;
  const coachName = props.team?.coach?.name;

  return (
    <>
      <div className="flex flex-row">
        <div className="basis-1/3">
          <div className="flex flex-col items-end">
            <div className="basis-full">
              <Image
                className="bg-white p-2 rounded-xl"
                width="125"
                height="125"
                src={teamCrestUrl ? teamCrestUrl : "../../placeholder-club-logo.svg"}
                alt={teamName !== undefined ? teamName : ""} />
            </div>
            <div className="basis-full mt-2 w-[125px]">
              <div className="flex justify-center">
                <TeamGeneralForm teamId={props.team!.id} />
              </div>
            </div>
          </div>
        </div>
        <div className="basis-2/3 mt-6 pl-16">
          <p className="font-extrabold text-4xl text-c4">{props.team?.name}</p>
          {coachName !== undefined &&
            <p className="font-extralight text-xl pt-6 text-c3">Coach: {coachName}</p>
          }
        </div>
      </div>
    </>
  )
}

function TeamInfoContentSkeleton() {
  return (
    <>
      <div className="flex flex-row">
        <div className="basis-1/3">
          <Image
            className="bg-white p-2 rounded-xl float-right animate-pulse"
            width="120"
            height="120"
            src="../../placeholder-club-logo.svg"
            alt="Team name" />
        </div>
        <div className="basis-2/3 mt-6 pl-16">
          <div className="animate-pulse bg-c4 h-12 w-full"></div>
          <div className="animate-pulse bg-c3 mt-2 h-6 w-full"></div>
        </div>
      </div>
    </>
  )
}

function TeamGeneralForm(props: { teamId: string }) {
  const [teamForm, setTeamForm] = useState<TeamFormEntry[]>([]);
  const [formContentLoaded, setFormContentLoaded] = useState<boolean>(false);

  useEffect(() => {
    const formUrl =
      `${publicRuntimeConfig.TEAMS_BASE_URL}/${props.teamId}/form`;

    fetch(formUrl)
      .then((res) => res.text())
      .then((data) => {
        const d: TeamFormEntry[] = TeamFormEntries.fromJSON(data);
        setTeamForm(d);
        setFormContentLoaded(true);
      });
  }, [props.teamId])

  return (
    <>
      {formContentLoaded &&
        <FormEntriesBox formEntries={teamForm} setHighlightedTeamsIds={undefined} />
      }
    </>
  )
}

function ResultsSummary(props: { team: FullTeamInfo | undefined }) {
  const [resultsContentLoaded, setResultsContentLoaded] = useState<boolean>(false);
  const [groupedTeamMatches, setGroupedTeamMatches] = useState<CompetitionGroupedTeamMatches[]>([]);
  const pageNumber = useRef<number>(0);

  function fetchResultsPage(teamId: string, page: number) {
    const httpParams = new URLSearchParams({
      type: "results",
      page: page.toString(),
      size: "10",
    });

    fetchGroupedTeamMatches(teamId, httpParams)
      .then((res) => {
        setGroupedTeamMatches((prev) => [...prev, ...res]);
        setResultsContentLoaded(true);
      })
  }

  function fetchMoreResults(teamId: string) {
    pageNumber.current += 1;
    fetchResultsPage(teamId, pageNumber.current);
  }

  useEffect(() => {
    if (props.team === undefined) {
      return;
    }

    const teamId = props.team.id;
    fetchResultsPage(teamId, pageNumber.current);
  }, [props.team])

  return (
    <>
      {resultsContentLoaded && (props.team !== undefined) ?
        <>
          <GroupedTeamMatchesContent competitionGroupedTeamMatches={groupedTeamMatches} />
          {groupedTeamMatches.length !== 0 &&
            <div className="flex">
              <LoadMoreButton onClick={() => fetchMoreResults(props.team!.id)} />
            </div>
          }
        </>
        :
        <GroupedMatchInfoSkeleton />
      }
    </>
  )
}

function FixturesSummary(props: { team: FullTeamInfo | undefined }) {
  const [fixturesContentLoaded, setFixturesContentLoaded] = useState<boolean>(false);
  const [groupedTeamMatches, setGroupedTeamMatches] = useState<CompetitionGroupedTeamMatches[]>([]);
  const [globalUpdatesSocket, setGlobalUpdatesSocket] = useState<Socket | undefined>(undefined);
  const pageNumber = useRef<number>(0);

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


  function fetchFixturesPage(teamId: string, page: number) {
    const httpParams = new URLSearchParams({
      type: "fixtures",
      page: page.toString(),
      size: "10",
    });

    fetchGroupedTeamMatches(teamId, httpParams)
      .then((res) => {
        setGroupedTeamMatches((prev) => [...prev, ...res]);
        setFixturesContentLoaded(true);
      })
  }

  function fetchMoreFixtures(teamId: string) {
    pageNumber.current += 1;
    fetchFixturesPage(teamId, pageNumber.current);
  }

  useEffect(() => {
    if (props.team === undefined) {
      return;
    }

    const teamId = props.team.id;
    fetchFixturesPage(teamId, pageNumber.current);
  }, [props.team])

  return (
    <>
      {fixturesContentLoaded && (props.team !== undefined) ?
        <>
          <GroupedTeamMatchesContent
            competitionGroupedTeamMatches={groupedTeamMatches}
            globalUpdatesSocket={globalUpdatesSocket}
          />
          {groupedTeamMatches.length !== 0 &&
            <div className="flex">
              <LoadMoreButton onClick={() => fetchMoreFixtures(props.team!.id)} />
            </div>
          }
        </>
        :
        <GroupedMatchInfoSkeleton />
      }
    </>
  )
}

function GroupedTeamMatchesContent(props: {
  competitionGroupedTeamMatches: CompetitionGroupedTeamMatches[],
  globalUpdatesSocket?: Socket | undefined
}) {
  return (
    <>
      {props.competitionGroupedTeamMatches.length > 0 ?
        <div className="mt-8 h-full">
          {
            props.competitionGroupedTeamMatches.map((matchGroup) => {
              return <GroupedMatchInfo
                competitionInfo={matchGroup.competition}
                matches={matchGroup.matches}
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

type GroupedTeamMatches = {
  competitionId: string,
  matches: CompactMatchInfo[]
}

type CompetitionGroupedTeamMatches = {
  competition: CompetitionInfo,
  matches: CompactMatchInfo[],
}

// if two or more consecutive matches are in the same competition, group them together - this
// will make it easier to display team's matches in a more readable way
function groupConsecutiveMatchesByCompetition(allMatches: CompactMatchInfo[]): GroupedTeamMatches[] {
  const result: GroupedTeamMatches[] = [];

  if (allMatches.length !== 0) {
    // initialize the first group
    let currentGroup = {
      competitionId: allMatches[0].competitionId,
      matches: [allMatches[0]]
    };

    // start from the second match, because the first one is already grouped
    for (let i = 1; i < allMatches.length; i++) {
      const currentMatch = allMatches[i];
      if (currentMatch.competitionId !== currentGroup.competitionId) {
        // the consecutive streak is over, add a new group to the list of results
        // and start a new one with the current match
        result.push(currentGroup);
        currentGroup = {
          competitionId: currentMatch.competitionId,
          matches: [currentMatch],
        };
      } else {
        // the consecutive streak is continuing, simply add the current match
        // and keep going
        currentGroup.matches.push(currentMatch);
      }
    }
    result.push(currentGroup);
  }
  return result;
}

async function fetchGroupedTeamMatches(
  teamId: string,
  httpParams: URLSearchParams
): Promise<CompetitionGroupedTeamMatches[]> {
  const teamMatchesUrl =
    `${publicRuntimeConfig.TEAMS_BASE_URL}/${teamId}/matches?${httpParams.toString()}`;
  return new Promise(async (resolve) => {
    await fetch(teamMatchesUrl)
      .then((res) => res.text())
      .then((data) => {
        const d: CompactMatchInfo[] = CompactMatchInfo.fromJSON(data);
        const groupedMatches: GroupedTeamMatches[] = groupConsecutiveMatchesByCompetition(d);

        // Asynchronously fetch information about every competition.
        let promises: Promise<CompetitionGroupedTeamMatches>[] = [];
        groupedMatches.forEach((groupedItem) => {
          const competitionUrl =
            `${publicRuntimeConfig.COMPETITIONS_BASE_URL}/${groupedItem.competitionId}`;
          const promise: Promise<CompetitionGroupedTeamMatches> = fetch(competitionUrl)
            .then((res) => res.json())
            .then((data) => {
              return { competition: data, matches: groupedItem.matches };
            });
          promises.push(promise);
        });

        // wait for all promises
        Promise.all(promises)
          .then((arr) => {
            resolve(arr)
          })
      })
  });
}

function TeamPlayersListing(props: { teamId: string | undefined }) {
  const [playersContentLoaded, setPlayersContentLoaded] = useState<boolean>(false);
  const [players, setPlayers] = useState<TeamPlayer[]>([]);

  useEffect(() => {
    if (props.teamId === undefined) {
      return;
    }

    const playersUrl = `${publicRuntimeConfig.TEAMS_BASE_URL}/${props.teamId}/players`;
    fetch(playersUrl)
      .then((res) => res.json())
      .then((data) => {
        const d: TeamPlayer[] = data;
        setPlayers(d);
        setPlayersContentLoaded(true);
      });

  }, [props.teamId])

  return (
    <>
      {playersContentLoaded ?
        <TeamPlayersContent players={players} />
        :
        <TeamPlayersContentSkeleton />
      }
    </>
  )
}

function TeamPlayersContent(props: { players: TeamPlayer[] }) {
  const sortedPlayers: TeamPlayer[] = props.players;
  sortedPlayers.sort((a, b) => a.number - b.number)

  return (
    <>
      <div className="bg-c1 flex flex-row h-8 pt-2 shadow-sm shadow-black mb-2">
        <div className="">
          <span className="pl-10 float-left text-sm text-c4">Players</span>
        </div>
      </div>
      <table className="basis-full w-full table-auto mb-10">
        <thead>
          <tr className="text-center font-extralight text-sm text-c3">
            <th>#</th>
            <th>Name</th>
            <th>Country</th>
            <th>Position</th>
            <th>Date of Birth</th>
          </tr>
        </thead>
        <tbody>
          {sortedPlayers.map((player, i) => {
            const dateOfBirth = player.player.dateOfBirth;
            const formattedDateOfBirth = `${dateOfBirth[0]}-${dateOfBirth[1]}-${dateOfBirth[2]}`;
            return (
              <tr key={i} className="odd:bg-c1 even:bg-c0 text-center">
                <td>{player.number}</td>
                <td>{player.player.name}</td>
                <td>
                  <span title={player.countryCode}>
                    {countryCodeToFlagEmoji(player.countryCode)}
                  </span>
                </td>
                <td>{player.position}</td>
                <td>{formattedDateOfBirth}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </>
  )
}

function TeamPlayersContentSkeleton() {
  return (
    <>
      <div
        className="bg-c1 animate-pulse flex flex-row h-8 pt-2 shadow-sm shadow-black mb-2">
        <span className="pl-10 float-left text-sm text-c4">Players</span>
      </div>
      <div className="flex flex-row">
        <div className="basis-full table-auto mx-8 mb-10">
          <div>
            {[...Array(18)].map((_e, j) => {
              return (
                <div
                  key={j}
                  className="animate-pulse odd:bg-c1 even:bg-c0">
                  <div className="h-6"></div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
