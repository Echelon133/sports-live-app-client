import { useRouter } from "next/router"
import Image from 'next/image'
import getConfig from "next/config";
import { useEffect, useRef, useState } from "react";
import { Competition, CompetitionGroupEntry, CompetitionIdGroupedMatches, CompetitionStandings, LegendEntry, LegendSentiment, PlayerStatsEntry, TeamFormEntries, TeamFormEntry, TeamStanding } from "@/types/Competition";
import FilterMenu, { FilterMenuInfo, FilterOption, FilterOptionKey } from "@/components/FilterMenu";
import GroupedMatchInfo from "@/components/GroupedMatchInfo";
import { CompactMatchInfo } from "@/types/Match";
import Link from "next/link";

const { publicRuntimeConfig } = getConfig();

export default function CompetitionPage() {
  const router = useRouter();

  const [competitionInfoContentLoaded, setCompetitionInfoContentLoaded] = useState<boolean>(false);
  const [competitionInformation, setCompetitionInformation] =
    useState<Competition | undefined>(undefined);

  // setup the filter with three options: Results, Fixtures, Standings
  const DEFAULT_COMPETITION_FILTER: FilterOptionKey = "results";
  const competitionFilterOptions: Map<FilterOptionKey, FilterOption> = new Map([
    [DEFAULT_COMPETITION_FILTER, { displayName: "RESULTS", isSelected: true }],
    ["fixtures", { displayName: "FIXTURES", isSelected: false }],
    ["standings", { displayName: "STANDINGS", isSelected: false }],
  ]);
  const [selectedCompetitionInfoOption, setSelectedCompetitionInfoOption] =
    useState<string>(DEFAULT_COMPETITION_FILTER);
  const filterMenuInfo: FilterMenuInfo = {
    options: competitionFilterOptions,
    currentlySelected: selectedCompetitionInfoOption,
    setCurrentlySelected: setSelectedCompetitionInfoOption
  };


  useEffect(() => {
    if (router.query.id === undefined) {
      return;
    }

    const competitionUrl = `${publicRuntimeConfig.COMPETITIONS_BASE_URL}/${router.query.id}`;
    fetch(competitionUrl)
      .then((res) => res.json())
      .then((data) => {
        const d: Competition = data;
        setCompetitionInformation(d);
        setCompetitionInfoContentLoaded(true);
      });

  }, [router.query.id]);

  return (
    <div className="flex flex-row bg-rose-200 items-center justify-center">
      <div className="mt-32 basis-full">
        {competitionInfoContentLoaded ?
          <CompetitionInfoContent competition={competitionInformation} />
          :
          <CompetitionInfoContentSkeleton />
        }
        <div className="mt-12 flex flex-row justify-center">
          <div>
            <FilterMenu filter={filterMenuInfo} />
          </div>
        </div>
        <div className="mt-12 pb-32">
          {selectedCompetitionInfoOption === "results" &&
            <ResultsSummary competition={competitionInformation} />
          }
          {selectedCompetitionInfoOption === "fixtures" &&
            <FixturesSummary competition={competitionInformation} />
          }
          {selectedCompetitionInfoOption === "standings" &&
            <StandingsSummary competition={competitionInformation} />
          }
        </div>
      </div>
    </div>
  )
}

function CompetitionInfoContent(props: { competition: Competition | undefined }) {
  const competitionLogoUrl = props.competition?.logoUrl;

  return (
    <>
      <div className="flex flex-row">
        <div className="basis-1/3">
          <Image
            className="bg-white p-2 rounded-xl float-right"
            width="120"
            height="120"
            src={competitionLogoUrl ? competitionLogoUrl : "../../placeholder-competition-logo.svg"}
            alt="Competition name" />
        </div>
        <div className="basis-2/3 mt-6 pl-16">
          <p className="font-extrabold text-4xl">{props.competition?.name}</p>
          <span className="font-extralight text-xl">{props.competition?.season}</span>
        </div>
      </div>
    </>
  )
}

function CompetitionInfoContentSkeleton() {
  return (
    <>
      <div className="flex flex-row">
        <div className="basis-1/3">
          <Image
            className="bg-white p-2 rounded-xl float-right animate-pulse"
            width="120"
            height="120"
            src="../../placeholder-competition-logo.svg"
            alt="Competition name" />
        </div>
        <div className="basis-2/3 mt-6 pl-16">
          <div className="animate-pulse bg-gray-300 h-12 w-full"></div>
          <div className="animate-pulse bg-gray-300 mt-2 h-6 w-full"></div>
        </div>
      </div>
    </>
  )
}

function ResultsSummary(props: { competition: Competition | undefined }) {
  const [resultsContentLoaded, setResultsContentLoaded] = useState<boolean>(false);
  const [matches, setMatches] = useState<CompactMatchInfo[]>([]);
  const pageNumber = useRef<number>(0);

  function fetchResultsPage(competitionId: string, page: number) {
    const httpParams = new URLSearchParams({
      competitionId: competitionId,
      type: "results",
      page: page.toString(),
      size: "10",
    });

    const finishedMatchesUrl = `${publicRuntimeConfig.MATCHES_BASE_URL}?${httpParams.toString()}`;
    fetch(finishedMatchesUrl)
      .then((res) => res.text())
      .then((data) => {
        // rebuild request's body into our custom type
        const d: CompetitionIdGroupedMatches = CompetitionIdGroupedMatches.fromJSON(data);
        // the server responds with a competitionId => CompactMatchInfo[] mapping, where the
        // competitionId is always the same as the one we are asking for in the request
        const matches: CompactMatchInfo[] | undefined = d.get(competitionId);
        if (matches !== undefined) {
          setMatches((prev) => [...prev, ...matches]);
        }
        setResultsContentLoaded(true);
      });
  }

  function fetchMoreResults(competitionId: string) {
    pageNumber.current += 1;
    fetchResultsPage(competitionId, pageNumber.current)
  }

  useEffect(() => {
    if (props.competition === undefined) {
      return;
    }

    const competitionId = props.competition.id;
    fetchResultsPage(competitionId, pageNumber.current)
  }, [props.competition])

  return (
    <>
      {resultsContentLoaded && (props.competition !== undefined) ?
        <>
          <GroupedMatchInfo competitionInfo={props.competition} matches={matches} />
          {matches.length !== 0 &&
            <div className="flex bg-rose-300 py-2 my-3">
              <button
                className="basis-full font-extrabold text-sm hover:underline"
                onClick={() => fetchMoreResults(props.competition!.id)}
              >Load More...</button>
            </div>
          }
        </>
        :
        <SummarySkeleton />
      }
    </>
  )
}

function FixturesSummary(props: { competition: Competition | undefined }) {
  const [fixturesContentLoaded, setFixturesContentLoaded] = useState<boolean>(false);
  const [matches, setMatches] = useState<CompactMatchInfo[]>([]);
  const pageNumber = useRef<number>(0);

  function fetchFixturesPage(competitionId: string, page: number) {
    const httpParams = new URLSearchParams({
      competitionId: competitionId,
      type: "fixtures",
      page: page.toString(),
      size: "10",
    });

    const nonFinishedMatchesUrl = `${publicRuntimeConfig.MATCHES_BASE_URL}?${httpParams.toString()}`;
    fetch(nonFinishedMatchesUrl)
      .then((res) => res.text())
      .then((data) => {
        // rebuild request's body into out custom type
        const d: CompetitionIdGroupedMatches = CompetitionIdGroupedMatches.fromJSON(data);
        // the server responds with a competitionId => CompactMatchInfo[] mapping, where the
        // competitionId is always the same as the one we are asking for in the request
        const matches: CompactMatchInfo[] | undefined = d.get(competitionId);
        if (matches !== undefined) {
          setMatches((prev) => [...prev, ...matches]);
        }
        setFixturesContentLoaded(true);
      });
  }

  function fetchMoreFixtures(competitionId: string) {
    pageNumber.current += 1;
    fetchFixturesPage(competitionId, pageNumber.current);
  }

  useEffect(() => {
    if (props.competition === undefined) {
      return;
    }

    const competitionId = props.competition.id;
    fetchFixturesPage(competitionId, pageNumber.current);
  }, [props.competition]);

  return (
    <>
      {fixturesContentLoaded && (props.competition !== undefined) ?
        <>
          <GroupedMatchInfo competitionInfo={props.competition} matches={matches} />
          {matches.length !== 0 &&
            <div className="flex bg-rose-300 py-2 my-3">
              <button
                className="basis-full font-extrabold text-sm hover:underline"
                onClick={() => fetchMoreFixtures(props.competition!.id)}
              >Load More...</button>
            </div>
          }
        </>
        :
        <SummarySkeleton />
      }
    </>
  )
}

function StandingsSummary(props: { competition: Competition | undefined }) {
  const [standingsContentLoaded, setStandingsContentLoaded] = useState<boolean>(true);
  const [teamInfoCache, setTeamInfoCache] = useState<Map<string, TeamStanding>>(new Map());
  const [competitionStandings, setCompetitionStandings] =
    useState<CompetitionStandings | undefined>(undefined);

  // setup the filter with two options: Standings, Top Scorers
  const DEFAULT_STANDINGS_FILTER: FilterOptionKey = "standings";
  const standingsFilterOptions: Map<FilterOptionKey, FilterOption> = new Map([
    [DEFAULT_STANDINGS_FILTER, { displayName: "STANDINGS", isSelected: true }],
    ["top-scorers", { displayName: "TOP SCORERS", isSelected: false }],
  ]);
  const [selectedStandingsInfoOption, setSelectedStandingsInfoOption] =
    useState<string>(DEFAULT_STANDINGS_FILTER);
  const filterMenuInfo: FilterMenuInfo = {
    options: standingsFilterOptions,
    currentlySelected: selectedStandingsInfoOption,
    setCurrentlySelected: setSelectedStandingsInfoOption
  };

  useEffect(() => {
    if (props.competition === undefined) {
      return;
    }

    const competitionId = props.competition.id;
    const competitionUrl = `${publicRuntimeConfig.COMPETITIONS_BASE_URL}/${competitionId}/standings`;
    fetch(competitionUrl)
      .then((res) => res.json())
      .then((data) => {
        const d: CompetitionStandings = data;

        // create a mapping between teamIds and team names/crests to 
        // potentially reuse that information in the TOP SCORERS
        // tab
        const teamCache: Map<string, TeamStanding> = new Map();
        for (let group of d.groups) {
          for (let team of group.teams) {
            teamCache.set(team.teamId, team);
          }
        }

        setTeamInfoCache(teamCache);
        setCompetitionStandings(d);
        setStandingsContentLoaded(true);
      });

  }, [props.competition]);

  return (
    <>
      <div className="ml-12 mb-6">
        <FilterMenu filter={filterMenuInfo} />
      </div>
      {selectedStandingsInfoOption === "standings" &&
        <>
          {standingsContentLoaded && (props.competition !== undefined) ?
            <>
              <div className="">
                {competitionStandings?.groups.map((group) =>
                  <CompetitionGroupBox
                    competitionId={props.competition!.id}
                    group={group}
                    legendEntries={competitionStandings.legend}
                  />
                )}
              </div>
              <div className="">
                {competitionStandings?.legend.map((legend) => <LegendExplanationBox legend={legend} />)}
              </div>
            </>
            :
            <SummarySkeleton />
          }
        </>
      }
      {selectedStandingsInfoOption === "top-scorers" &&
        <TopScorersListing competitionId={props.competition!.id} teamInfoCache={teamInfoCache} />
      }
    </>
  )
}

function CompetitionGroupBox(props: {
  competitionId: string,
  group: CompetitionGroupEntry,
  legendEntries: LegendEntry[]
}) {
  return (
    <>
      <div className="flex flex-row bg-rose-200 items-center justify-center">
        <div className="mt-2 basis-full">
          <div className="bg-rose-300 shadow-sm shadow-gray-400 mb-2">
            <div className="p-3 pl-10">
              <span className="font-extrabold">{props.group.name}</span>
            </div>
          </div>
          <table className="basis-full w-full table-auto mb-10">
            <tr className="text-center font-extralight text-sm">
              <th>#</th>
              <th>Team</th>
              <th className="pr-4">MP</th>
              <th className="pr-4">W</th>
              <th className="pr-4">D</th>
              <th className="pr-4">L</th>
              <th className="pr-4">G</th>
              <th className="pr-4">GD</th>
              <th className="pr-4">PTS</th>
              <th>FORM</th>
            </tr>
            {props.group.teams.map((team, i) => {
              const index = i + 1;
              const positionColor = LegendSentiment.positionToColor(props.legendEntries, index);
              return (
                <tr className="odd:bg-rose-300 even:bg-rose-200 text-center">
                  <td><span className={`${positionColor} rounded-lg p-1 text-white`}>{index}.</span></td>
                  <td className="font-extralight text-sm">
                    <div className="flex items-center">
                      <Image
                        className="float-left"
                        width="22"
                        height="22"
                        src={team.crestUrl ? team.crestUrl : "placeholder-club-logo.svg"}
                        alt={team.teamName} />
                      <span className="pl-2 hover:underline">{team.teamName}</span>
                    </div>
                  </td>
                  <td className="pr-4">{team.matchesPlayed}</td>
                  <td className="pr-4">{team.wins}</td>
                  <td className="pr-4">{team.draws}</td>
                  <td className="pr-4">{team.losses}</td>
                  <td className="pr-4">{team.goalsScored}:{team.goalsConceded}</td>
                  <td className="pr-4">{team.goalsScored - team.goalsConceded}</td>
                  <td className="pr-4">{team.points}</td>
                  <td className="py-1"><FormBox teamId={team.teamId} competitionId={props.competitionId} /></td>
                </tr>
              )
            })}
          </table>
        </div>
      </div>
    </>
  );
}

function LegendExplanationBox(props: { legend: LegendEntry }) {
  const legendColor = LegendSentiment.toColor(props.legend.sentiment);
  return (
    <>
      <div className="flex flex-row items-center ml-7 mb-3">
        <span className={`w-7 h-7 rounded-lg ${legendColor}`}></span>
        <span className="font-extrabold text-sm ml-5">{props.legend.context}</span>
      </div>
    </>
  )
}

function FormBox(props: { teamId: string, competitionId: string }) {
  const [teamForm, setTeamForm] = useState<TeamFormEntry[]>([]);
  const [formContentLoaded, setFormContentLoaded] = useState<boolean>(false);

  useEffect(() => {
    const httpParams = new URLSearchParams({
      competitionId: props.competitionId,
    });
    const formUrl =
      `${publicRuntimeConfig.TEAMS_BASE_URL}/${props.teamId}/form?${httpParams.toString()}`;

    fetch(formUrl)
      .then((res) => res.text())
      .then((data) => {
        const d: TeamFormEntry[] = TeamFormEntries.fromJSON(data);
        setTeamForm(d);
        setFormContentLoaded(true);
      });
  })

  return (
    <>
      {formContentLoaded && (teamForm.length > 0) ?
        <FormEntriesBox formEntries={teamForm} />
        :
        <span>-</span>
      }
    </>
  )
}

function FormEntriesBox(props: { formEntries: TeamFormEntry[] }) {
  return (
    <>
      {props.formEntries.map((entry) => {
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
            <Link href={`/match/${encodeURIComponent(entry.matchDetails.id)}`}>
              <span
                className={`${color} px-2 py-1 rounded-lg hover:underline hover:cursor-pointer`}
                title={desc}
              >{entry.form}</span>
            </Link>
          </>
        )
      })}
    </>
  )
}

function TopScorersListing(props: {
  competitionId: string,
  teamInfoCache: Map<string, TeamStanding>,
}) {
  const [playerStats, setPlayerStats] = useState<PlayerStatsEntry[]>([]);
  const pageNumber = useRef(0);

  // two players are ex-aequo if their goals and assists are identical, therefore
  // we need to calculate player's position by checking the previous player's stats
  type PlayerGoalsAssists = { goals: number, assists: number, position: number };
  const prevPlayerStat = useRef<PlayerGoalsAssists>({ goals: 0, assists: 0, position: 0 });

  function fetchTopScorersPage(competitionId: string, page: number) {
    const httpParams = new URLSearchParams({
      page: page.toString(),
    });

    const topScorersUrl =
      `${publicRuntimeConfig.COMPETITIONS_BASE_URL}/${competitionId}/player-stats?${httpParams.toString()}`;

    fetch(topScorersUrl)
      .then((res) => res.json())
      .then((data) => {
        const d: PlayerStatsEntry[] = data.content;
        // clear data which is needed to calculate positions, since
        // updating player stats rerenders the entire table and calculations
        // have to start from 0
        prevPlayerStat.current = { goals: 0, assists: 0, position: 0 };
        setPlayerStats((prev) => [...prev, ...d]);
      });
  }

  function fetchMoreTopScorers(competitionId: string) {
    pageNumber.current += 1;
    fetchTopScorersPage(competitionId, pageNumber.current);
  }

  useEffect(() => {
    fetchTopScorersPage(props.competitionId, pageNumber.current);
  }, [props.competitionId])

  return (
    <>
      {playerStats.length === 0 ?
        <>
          <div className="flex flex-row bg-rose-100 h-14 shadow-sm shadow-gray-400 items-center justify-center">
            <span className="font-extrabold text-xl">No stats</span>
          </div>
        </>
        :
        <>
          <div className="flex flex-row bg-rose-200 items-center justify-center">
            <div className="mt-2 basis-full">
              <div className="bg-rose-300 shadow-sm shadow-gray-400 mb-2">
                <div className="p-3 pl-10">
                  <span className="font-extrabold">Top Scorers</span>
                </div>
              </div>
              <table className="basis-full w-full table-auto mb-10">
                <tr className="text-center font-extralight text-sm">
                  <th>#</th>
                  <th>Player</th>
                  <th>Team</th>
                  <th className="px-4" title="Goals">G</th>
                  <th className="px-4" title="Assists">A</th>
                  <th className="px-4" title="Yellow Cards">
                    <div className="flex justify-center">
                      <div className="h-4 w-3 bg-yellow-500"></div>
                    </div>
                  </th>
                  <th className="px-4" title="Red Cards">
                    <div className="flex justify-center">
                      <div className="h-4 w-3 bg-red-600"></div>
                    </div>
                  </th>
                </tr>
                {playerStats.map((stat, _i) => {
                  let playerPosition: number = prevPlayerStat.current.position;
                  if (
                    (stat.goals !== prevPlayerStat.current.goals) ||
                    (stat.assists !== prevPlayerStat.current.assists)
                  ) {
                    playerPosition += 1;
                    prevPlayerStat.current.position = playerPosition;
                    prevPlayerStat.current.goals = stat.goals;
                    prevPlayerStat.current.assists = stat.assists;
                  }

                  const cachedTeamInfo = props.teamInfoCache.get(stat.teamId);
                  const teamName = cachedTeamInfo?.teamName;
                  const teamCrestUrl = cachedTeamInfo?.crestUrl;
                  return (
                    <tr
                      key={stat.playerId}
                      className="odd:bg-rose-300 even:bg-rose-200 text-center"
                    >
                      <td className="p-1">{playerPosition}</td>
                      <td className="font-extralight text-sm">{stat.name}</td>
                      <td className="font-extralight text-sm">
                        <div className="flex justify-left items-center">
                          <Image
                            width="22"
                            height="22"
                            src={teamCrestUrl ? teamCrestUrl : "placeholder-club-logo.svg"}
                            alt={teamName ? teamName : ""} />
                          <span className="pl-2 hover:underline">{teamName}</span>
                        </div>
                      </td>
                      <td>{stat.goals}</td>
                      <td>{stat.assists}</td>
                      <td>{stat.yellowCards}</td>
                      <td className="py-1">{stat.redCards}</td>
                    </tr>
                  )
                })}
              </table>
              {playerStats.length !== 0 &&
                <div className="flex bg-rose-300 py-2 my-1">
                  <button
                    className="basis-full font-extrabold text-sm hover:underline"
                    onClick={() => fetchMoreTopScorers(props.competitionId)}
                  >Load More...</button>
                </div>
              }
            </div>
          </div>
        </>
      }
    </>
  )
}

function SummarySkeleton() {
  return (
    <>
      <div className="flex flex-row bg-rose-200">
        <div className="animate-pulse basis-full bg-rose-300 h-10 shadow-sm shadow-black"></div>
      </div>
      <div className="animate-pulse mb-1 basis-full bg-rose-100 h-14 shadow-sm shadow-gray-400"></div>
      <div className="animate-pulse mb-1 basis-full bg-rose-100 h-14 shadow-sm shadow-gray-400"></div>
    </>
  )
}
