import { useRouter } from "next/router";
import Image from 'next/image'
import { useEffect, useRef, useState } from "react";
import { FullTeamInfo } from "@/types/Team";
import getConfig from "next/config";
import FilterMenu, { FilterMenuInfo, FilterOption, FilterOptionKey } from "@/components/FilterMenu";
import GroupedMatchInfoSkeleton from "@/components/GroupedMatchInfoSkeleton";
import { CompetitionInfo } from "@/types/Competition";
import { CompactMatchInfo } from "@/types/Match";
import GroupedMatchInfo from "@/components/GroupedMatchInfo";

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
    <div className="flex flex-row bg-rose-200 items-center justify-center">
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
            <h1>Players</h1>
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
          <Image
            className="bg-white p-2 rounded-xl float-right"
            width="120"
            height="120"
            src={teamCrestUrl ? teamCrestUrl : "../../placeholder-club-logo.svg"}
            alt={teamName !== undefined ? teamName : ""} />
        </div>
        <div className="basis-2/3 mt-6 pl-16">
          <p className="font-extrabold text-4xl">{props.team?.name}</p>
          {coachName !== undefined &&
            <p className="font-extralight text-xl pt-6">Coach: {coachName}</p>
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
          <div className="animate-pulse bg-gray-300 h-12 w-full"></div>
          <div className="animate-pulse bg-gray-300 mt-2 h-6 w-full"></div>
        </div>
      </div>
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
            <div className="flex bg-rose-300 py-2 my-3">
              <button
                className="basis-full font-extrabold text-sm hover:underline"
                onClick={() => fetchMoreResults(props.team!.id)}
              >Load More...</button>
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
  const pageNumber = useRef<number>(0);

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
          <GroupedTeamMatchesContent competitionGroupedTeamMatches={groupedTeamMatches} />
          {groupedTeamMatches.length !== 0 &&
            <div className="flex bg-rose-300 py-2 my-3">
              <button
                className="basis-full font-extrabold text-sm hover:underline"
                onClick={() => fetchMoreFixtures(props.team!.id)}
              >Load More...</button>
            </div>
          }
        </>
        :
        <GroupedMatchInfoSkeleton />
      }
    </>
  )
}

function GroupedTeamMatchesContent(props: { competitionGroupedTeamMatches: CompetitionGroupedTeamMatches[] }) {
  return (
    <>
      {props.competitionGroupedTeamMatches.length > 0 ?
        <div className="mt-8 h-full">
          {
            props.competitionGroupedTeamMatches.map((matchGroup) => {
              return <GroupedMatchInfo
                competitionInfo={matchGroup.competition}
                matches={matchGroup.matches} />
            })
          }
        </div>
        :
        < div className="mt-8 py-40 bg-rose-300 text-center">
          <span className="font-mono text-2xl font-extrabold">No matches available</span>
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
