import { useRouter } from "next/router"
import Image from 'next/image'
import getConfig from "next/config";
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { CompetitionInfo, CompetitionGroupEntry, CompetitionStandings, LegendEntry, LegendSentiment, PlayerStatsEntry, TeamFormEntries, TeamFormEntry, TeamStanding, LabeledMatches } from "@/types/Competition";
import Link from "next/link";
import { FormEntriesBox } from "@/components/FormEntriesBox";
import LoadMoreButton from "@/components/LoadMoreButton";
import { Socket, io } from "socket.io-client";
import InfoMessage from "@/components/InfoMessage";
import HorizontalMenu, { MenuConfig, createMenuConfig } from "@/components/HorizontalMenu";
import LabeledMatchInfo from "@/components/LabeledMatchInfo";
import { CompactMatchInfo } from "@/types/Match";
import useHideOnUserEvent from "@/components/hooks/useHideOnUserEvent";
import GroupedMatchInfo from "@/components/GroupedMatchInfo";

const { publicRuntimeConfig } = getConfig();

export default function Competition() {
  const router = useRouter();

  const [globalUpdatesSocket, setGlobalUpdatesSocket] = useState<Socket | undefined>(undefined);

  const [competitionInfoContentLoaded, setCompetitionInfoContentLoaded] = useState<boolean>(false);
  const [competitionInformation, setCompetitionInformation] =
    useState<CompetitionInfo | undefined>(undefined);

  const [menuConfig, setMenuConfig] = useState<MenuConfig>(
    createMenuConfig(["RESULTS", "FIXTURES", "STANDINGS"])
  );

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

  useEffect(() => {
    if (router.query.id === undefined) {
      return;
    }

    const competitionUrl = `${publicRuntimeConfig.COMPETITIONS_BASE_URL}/${router.query.id}`;
    fetch(competitionUrl)
      .then((res) => res.json())
      .then((data) => {
        const d: CompetitionInfo = data;
        setCompetitionInformation(d);
        setCompetitionInfoContentLoaded(true);
      });

  }, [router.query.id]);

  return (
    <div className="flex flex-row items-center justify-center">
      <div className="mt-10 pt-12 basis-full rounded-md border border-c2">
        {competitionInfoContentLoaded ?
          <CompetitionInfoContent competition={competitionInformation} />
          :
          <CompetitionInfoContentSkeleton />
        }
        <div className="mt-12 flex flex-row justify-center">
          <div>
            <HorizontalMenu menuConfig={menuConfig} setMenuConfig={setMenuConfig} />
          </div>
        </div>
        <div className="mt-12 pb-8">
          {competitionInfoContentLoaded &&
            <>
              {menuConfig.currentlySelected === "RESULTS" &&
                <ResultsSummary key={competitionInformation?.id} competition={competitionInformation} />
              }
              {menuConfig.currentlySelected === "FIXTURES" &&
                <FixturesSummary
                  key={competitionInformation?.id}
                  competition={competitionInformation}
                  globalUpdatesSocket={globalUpdatesSocket}
                />
              }
              {menuConfig.currentlySelected === "STANDINGS" &&
                <StandingsSummary
                  key={competitionInformation?.id}
                  competition={competitionInformation}
                  globalUpdatesSocket={globalUpdatesSocket}
                />
              }
            </>
          }
        </div>
      </div>
    </div>
  )
}

function CompetitionInfoContent(props: { competition: CompetitionInfo | undefined }) {
  const competitionLogoUrl = props.competition?.logoUrl;

  return (
    <>
      <div className="flex flex-row">
        <div className="basis-1/3">
          <Image
            className="bg-white p-2 rounded-xl float-right"
            width="120"
            height="120"
            src={competitionLogoUrl ?? "../../placeholder-competition-logo.svg"}
            priority={true}
            alt="Competition's name" />
        </div>
        <div className="basis-2/3 mt-6 pl-16">
          <p className="font-extrabold text-4xl text-c4">{props.competition?.name}</p>
          <span className="font-extralight text-xl text-c3">{props.competition?.season}</span>
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
            priority={false}
            alt="Competition's name" />
        </div>
        <div className="basis-2/3 mt-6 pl-16">
          <div className="animate-pulse bg-c4 h-12 w-full"></div>
          <div className="animate-pulse bg-c3 mt-2 h-6 w-full"></div>
        </div>
      </div>
    </>
  )
}

function ResultsSummary(props: { competition: CompetitionInfo | undefined }) {
  const [resultsContentLoaded, setResultsContentLoaded] = useState<boolean>(false);
  const [matches, setMatches] = useState<LabeledMatches>(new Map());
  const pageNumber = useRef<number>(0);

  function fetchResultsPage(competitionId: string, page: number) {
    const httpParams = new URLSearchParams({
      finished: "true",
      page: page.toString(),
      size: "10",
    });

    const finishedMatchesUrl = `${publicRuntimeConfig.COMPETITIONS_BASE_URL}/${competitionId}/matches?${httpParams.toString()}`;
    fetch(finishedMatchesUrl)
      .then((res) => res.text())
      .then((data) => {
        // rebuild request's body into our custom type
        const d: LabeledMatches = LabeledMatches.fromJSON(data);
        setMatches((prev) => {
          let updatedMap = new Map(prev);
          // we have to merge arrays instead of replacing them
          d.forEach((value, key) => {
            const prevValue: CompactMatchInfo[] = updatedMap.get(key) ?? [];
            const updatedValue = [...prevValue, ...value];
            updatedMap.set(key, updatedValue);
          });
          return updatedMap;
        });
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
          {Array.from(matches).map(([label, matches]) => {
            return <LabeledMatchInfo
              key={label}
              label={label}
              matches={matches}
              globalUpdatesSocket={undefined}
            />
          })}
          {matches.size !== 0 ?
            <div className="flex">
              <LoadMoreButton onClick={() => fetchMoreResults(props.competition!.id)} />
            </div>
            :
            <div className="mt-8">
              <InfoMessage message="No results" />
            </div >
          }
        </>
        :
        <SummarySkeleton />
      }
    </>
  )
}

function FixturesSummary(props: {
  competition: CompetitionInfo | undefined,
  globalUpdatesSocket: Socket | undefined
}) {
  const [fixturesContentLoaded, setFixturesContentLoaded] = useState<boolean>(false);
  const [matches, setMatches] = useState<LabeledMatches>(new Map());
  const pageNumber = useRef<number>(0);

  function fetchFixturesPage(competitionId: string, page: number) {
    const httpParams = new URLSearchParams({
      finished: "false",
      page: page.toString(),
      size: "10",
    });

    const nonFinishedMatchesUrl = `${publicRuntimeConfig.COMPETITIONS_BASE_URL}/${competitionId}/matches?${httpParams.toString()}`;
    fetch(nonFinishedMatchesUrl)
      .then((res) => res.text())
      .then((data) => {
        // rebuild request's body into out custom type
        const d: LabeledMatches = LabeledMatches.fromJSON(data);
        setMatches((prev) => {
          let updatedMap = new Map(prev);
          // we have to merge arrays instead of replacing them
          d.forEach((value, key) => {
            const prevValue: CompactMatchInfo[] = updatedMap.get(key) ?? [];
            const updatedValue = [...prevValue, ...value];
            updatedMap.set(key, updatedValue);
          });
          return updatedMap;
        });
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
          {Array.from(matches).map(([label, matches]) => {
            return <LabeledMatchInfo
              key={label}
              label={label}
              matches={matches}
              globalUpdatesSocket={props.globalUpdatesSocket}
            />
          })}
          {matches.size !== 0 ?
            <div className="flex">
              <LoadMoreButton onClick={() => fetchMoreFixtures(props.competition!.id)} />
            </div>
            :
            <div className="mt-8">
              <InfoMessage message="No results" />
            </div >
          }
        </>
        :
        <SummarySkeleton />
      }
    </>
  )
}

function StandingsSummary(props: {
  competition: CompetitionInfo,
  globalUpdatesSocket: Socket | undefined
}) {
  const [teamInfoCache, setTeamInfoCache] = useState<Map<string, TeamStanding>>(new Map());

  let menuOptions = [];
  if (props.competition?.leaguePhase) {
    menuOptions.push("LEAGUE PHASE");
  }
  if (props.competition?.knockoutPhase) {
    menuOptions.push("KNOCKOUT PHASE");
  }
  const [menuConfig, setMenuConfig] = useState<MenuConfig>(
    createMenuConfig(menuOptions.concat(["TOP SCORERS"]))
  );


  return (
    <>
      <div className="ml-12 mb-6">
        <HorizontalMenu menuConfig={menuConfig} setMenuConfig={setMenuConfig} />
      </div>
      {menuConfig.currentlySelected === "LEAGUE PHASE" &&
        <LeaguePhase
          competition={props.competition}
          setTeamInfoCache={setTeamInfoCache}
          globalUpdatesSocket={props.globalUpdatesSocket}
        />
      }
      {menuConfig.currentlySelected === "TOP SCORERS" &&
        <TopScorersListing competitionId={props.competition!.id} teamInfoCache={teamInfoCache} />
      }
    </>
  )
}

function LeaguePhase(props: {
  competition: CompetitionInfo,
  setTeamInfoCache: Dispatch<SetStateAction<Map<string, TeamStanding>>>,
  globalUpdatesSocket: Socket | undefined
}) {
  const menuOptions = ["GROUPS", "BY ROUND"];
  const [menuConfig, setMenuConfig] = useState<MenuConfig>(
    createMenuConfig(menuOptions)
  );


  return (
    <>
      <div className="ml-12 mb-6">
        <HorizontalMenu menuConfig={menuConfig} setMenuConfig={setMenuConfig} />
      </div>
      {menuConfig.currentlySelected === "GROUPS" &&
        <CompetitionGroups
          competition={props.competition}
          setTeamInfoCache={props.setTeamInfoCache}
          setCurrentRound={setCurrentRound}
        />
      }
      {menuConfig.currentlySelected === "BY ROUND" &&
        <MatchesByRound
        />
      }
    </>
  )
}

function CompetitionGroups(props: {
  competition: CompetitionInfo | undefined,
  setTeamInfoCache: Dispatch<SetStateAction<Map<string, TeamStanding>>>,
}) {
  const [standingsContentLoaded, setStandingsContentLoaded] = useState<boolean>(false);
  const [competitionStandings, setCompetitionStandings] =
    useState<CompetitionStandings | undefined>(undefined);

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

        props.setTeamInfoCache(teamCache);
        setCompetitionStandings(d);
        setStandingsContentLoaded(true);
      });

  }, [props.competition]);

  return (
    <>
      {standingsContentLoaded ?
        <>
          <div className="">
            {competitionStandings?.groups.map((group) =>
              <CompetitionGroupBox
                key={group.name}
                competitionId={props.competition!.id}
                group={group}
                legendEntries={competitionStandings.legend}
              />
            )}
          </div>
          <div className="">
            {competitionStandings?.legend.map((legend, i) => <LegendExplanationBox key={i} legend={legend} />)}
          </div>
        </>
        :
        <SummarySkeleton />
      }
    </>
  )
}

function MatchesByRound(props: {
}) {
  return (
    <>
      {
      }
    </>
  )
}

function CompetitionGroupBox(props: {
  competitionId: string,
  group: CompetitionGroupEntry,
  legendEntries: LegendEntry[]
}) {
  // ids of teams whose rows should be highlighted when the client hovers over a form entry
  const [highlightedTeamsIds, setHighlightedTeamsIds] = useState<string[]>([]);

  const sortedTeams: TeamStanding[] = [...props.group.teams];
  sortedTeams.sort((a, b) => {
    const pointDiff: number = a.points - b.points;
    if (pointDiff !== 0) {
      // flip the sign to sort by the points descending
      return -pointDiff;
    } else {
      // points were equal, so sort by comparing the GD
      const aGoalDifference = a.goalsScored - a.goalsConceded;
      const bGoalDifference = b.goalsScored - b.goalsConceded;
      const gdDiff = aGoalDifference - bGoalDifference;
      // flip the sign to sort by the goal difference descending
      return -gdDiff;
    }
  })

  const positionToColor: Map<number, string> =
    LegendSentiment.createPositionToColorMap(props.legendEntries);

  return (
    <>
      <div className="bg-c1 flex flex-row items-center justify-center mb-10">
        <div className="mt-2 basis-full">
          <div className="shadow-sm shadow-black mb-2">
            <div className="p-3 pl-10 bg-c2">
              <span className="font-extrabold text-c4">{props.group.name}</span>
            </div>
          </div>
          <table className="basis-full w-full table-auto">
            <thead>
              <tr className="text-c3 text-center font-extralight text-sm">
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
            </thead>
            <tbody>
              {sortedTeams.map((team, i) => {
                const index = i + 1;
                const positionColor = positionToColor.get(index);

                // if highlightedTeamsIds contains this team's id, the user hovered
                // over a form entry of a match in which this team had played,
                // therefore we should highlight this team's entry in the table
                const highlightDependendStyles =
                  highlightedTeamsIds.includes(team.teamId) ?
                    "bg-gray-600" : "odd:bg-c0 even:bg-c1";

                return (
                  <tr key={team.teamId} className={`${highlightDependendStyles} text-center h-10`}>
                    <td><span className={`${positionColor} rounded-lg p-1`}>{index}.</span></td>
                    <td className="font-extralight text-sm">
                      <div className="flex items-center">
                        <Image
                          className="float-left"
                          width="22"
                          height="22"
                          src={team.crestUrl ?? "placeholder-club-logo.svg"}
                          alt={team.teamName ?? "Team's crest"} />
                        <Link href={`/team/${team.teamId}`}>
                          <span className="pl-2 hover:underline">{team.teamName}</span>
                        </Link>
                      </div>
                    </td>
                    <td className="pr-4">{team.matchesPlayed}</td>
                    <td className="pr-4">{team.wins}</td>
                    <td className="pr-4">{team.draws}</td>
                    <td className="pr-4">{team.losses}</td>
                    <td className="pr-4">{team.goalsScored}:{team.goalsConceded}</td>
                    <td className="pr-4">{team.goalsScored - team.goalsConceded}</td>
                    <td className="pr-4">{team.points}</td>
                    <td className="py-1">
                      <FormBox
                        teamId={team.teamId}
                        competitionId={props.competitionId}
                        setHighlightedTeamsIds={setHighlightedTeamsIds}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
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

function FormBox(props: {
  teamId: string,
  competitionId: string,
  setHighlightedTeamsIds: Dispatch<SetStateAction<string[]>>
}) {
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
  }, [props.teamId, props.competitionId])

  return (
    <>
      {formContentLoaded && (teamForm.length > 0) ?
        <div className="flex justify-center">
          <FormEntriesBox
            formEntries={teamForm}
            setHighlightedTeamsIds={props.setHighlightedTeamsIds}
          />
        </div>
        :
        <span>-</span>
      }
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
          <InfoMessage message="Statistics currently unavailable" />
        </>
        :
        <>
          <div className="flex flex-row bg-c1 items-center justify-center">
            <div className="mt-2 basis-full">
              <div className="bg-c2 shadow-sm shadow-black mb-2">
                <div className="p-3 pl-10">
                  <span className="font-extrabold text-c4">Top Scorers</span>
                </div>
              </div>
              <table className="basis-full w-full table-auto mb-10">
                <thead>
                  <tr className="text-c3 text-center font-extralight text-sm">
                    <th>#</th>
                    <th>Player</th>
                    <th>Team</th>
                    <th className="px-4" title="Goals">G</th>
                    <th className="px-4" title="Assists">A</th>
                    <th className="px-4" title="Yellow Cards">
                      <div className="flex justify-center">
                        <div className="h-4 w-3 bg-yellow-400"></div>
                      </div>
                    </th>
                    <th className="px-4" title="Red Cards">
                      <div className="flex justify-center">
                        <div className="h-4 w-3 bg-red-600"></div>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
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
                    return (
                      <tr
                        key={stat.playerId}
                        className="odd:bg-c0 even:bg-c1 text-center"
                      >
                        <td className="p-1">{playerPosition}</td>
                        <td className="font-extralight text-sm">{stat.name}</td>
                        <td className="font-extralight text-sm">
                          <div className="flex justify-left items-center">
                            <Image
                              width="22"
                              height="22"
                              src={cachedTeamInfo?.crestUrl ?? "placeholder-club-logo.svg"}
                              alt={teamName ?? "Team's crest"} />
                            <Link href={`/team/${cachedTeamInfo?.teamId}`}>
                              <span className="pl-2 hover:underline">{teamName}</span>
                            </Link>
                          </div>
                        </td>
                        <td>{stat.goals}</td>
                        <td>{stat.assists}</td>
                        <td>{stat.yellowCards}</td>
                        <td className="py-1">{stat.redCards}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {playerStats.length !== 0 &&
                <div className="flex">
                  <LoadMoreButton onClick={() => fetchMoreTopScorers(props.competitionId)} />
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
      <div className="flex flex-row bg-c1">
        <div className="animate-pulse basis-full bg-c2 h-10 shadow-sm shadow-black"></div>
      </div>
      <div className="animate-pulse mb-1 basis-full bg-c1 h-14 shadow-sm shadow-gray-400"></div>
      <div className="animate-pulse mb-1 basis-full bg-c1 h-14 shadow-sm shadow-gray-400"></div>
    </>
  )
}
