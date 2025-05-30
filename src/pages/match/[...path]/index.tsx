import { useRouter } from "next/router"
import Image from 'next/image'
import getConfig from "next/config";
import { useEffect, useState } from "react";
import { FullMatchInfo, MatchStatus, Score, formatMatchDate } from "@/types/Match";
import { CompetitionInfo } from "@/types/Competition";
import MatchEventsSummary from "@/components/MatchEventsSummary";
import MatchLineupListing from "@/components/MatchLineupListing";
import Link from "next/link";
import MatchStatusBox from "@/components/MatchStatusBox";
import { MatchEvent, MatchEventType } from "@/types/MatchEvents";
import { io } from "socket.io-client";
import RoutingHorizontalMenu, { RoutingMenuConfig, createMenuConfig } from "@/components/RoutingHorizontalMenu";

const HIGHLIGHT_TIME = 3000;

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
    lastModifiedUTC: Date | null,
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
    lastModifiedUTC: null,
    value: MatchStatus.NOT_STARTED,
    highlight: false
  }
};

export default function Match() {
  const router = useRouter();
  const [allMatchInformation, setAllMatchInformation] =
    useState<AllMatchInfo | undefined>(undefined);
  const [matchEvents, setMatchEvents] = useState<MatchEvent[]>([]);
  const [menuConfig, setMenuConfig] = useState<RoutingMenuConfig | undefined>(
    undefined
  );

  // match events received via websocket should be able to update the scoreline, the status
  // of the match, etc.
  const [updateableMatchInfo, setUpdateableMatchInfo] =
    useState<UpdateableMatchInfo>(INITIAL_MATCH_INFO);

  const matchId = router.query.path?.[0];
  const matchSubPage = router.query.path?.[1];

  useEffect(() => {
    if (matchId === undefined) {
      return;
    }

    setMenuConfig(() => {
      const baseRoute = `/match/${encodeURIComponent(matchId)}`;
      const menuOptions = [
        { name: "summary", displayedName: "SUMMARY", path: `${baseRoute}/summary` },
        { name: "lineups", displayedName: "LINEUPS", path: `${baseRoute}/lineups` }
      ];

      const currentlySelectedOption = matchSubPage?.toLowerCase() ?? "";
      // if currently selected subpage does not exist among possibilities, 
      // redirect to the first option from the menu
      if (!menuOptions.map(o => o.name).includes(currentlySelectedOption)) {
        router.push(menuOptions[0].path)
      }

      return createMenuConfig(currentlySelectedOption, menuOptions);
    })
  }, [router.query.path])

  useEffect(() => {
    if (matchId === undefined) {
      return;
    }
    const matchUrl = `${publicRuntimeConfig.MATCHES_BASE_URL}/${matchId}`;
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
                lastModifiedUTC: matchInfo.statusLastModifiedUTC,
                value: matchInfo.status,
                highlight: false
              }
            });
          });
      })
      .catch((error) => {
        if (error.message === "404") {
          router.push("/404")
        } else {
          setAllMatchInformation(undefined)
        }
      });
  }, [matchId]);

  function incrementFullTimeScore(homeTeamScored: boolean) {
    const [homeTeamGoalsDelta, awayTeamGoalsDelta] =
      homeTeamScored ? [1, 0] : [0, 1];

    setUpdateableMatchInfo((prev) => {
      const newScore: Score = {
        homeGoals: prev.fullTimeScore.value.homeGoals + homeTeamGoalsDelta,
        awayGoals: prev.fullTimeScore.value.awayGoals + awayTeamGoalsDelta,
      };

      const updated = {
        ...prev,
        fullTimeScore: {
          value: newScore,
          highlight: true,
        },
      };
      return updated;
    });

    // turn off the score highlight after a timeout 
    setTimeout(() => {
      setUpdateableMatchInfo((prev) => {
        const updated = {
          ...prev,
          fullTimeScore: {
            ...prev.fullTimeScore,
            highlight: false
          },
        };
        return updated;
      })
    }, HIGHLIGHT_TIME);
  }

  function updateMatchStatus(newStatus: MatchStatus) {
    setUpdateableMatchInfo((prev) => {
      const updated = {
        ...prev,
        status: {
          lastModifiedUTC: new Date(),
          value: newStatus,
          highlight: true,
        }
      };
      return updated;
    });

    // turn off the status highlight after a timeout
    setTimeout(() => {
      setUpdateableMatchInfo((prev) => {
        const updated = {
          ...prev,
          status: {
            ...prev.status,
            highlight: false,
          }
        };
        return updated;
      })
    }, HIGHLIGHT_TIME);
  }

  useEffect(() => {
    if (matchId === undefined) {
      return;
    }

    const eventsUrl = `${publicRuntimeConfig.MATCHES_BASE_URL}/${matchId}/events`;
    fetch(eventsUrl)
      .then((res) => res.json())
      .then((data) => {
        const matchEvents: MatchEvent[] = data;
        setMatchEvents(matchEvents);
      });

  }, [matchId]);

  // websocket connection which updates matchEvents is placed in this parent component instead 
  // of being placed directly in MatchEventsSummary, because two mutually exclusive 
  // child components (MatchEventsSummary and MatchLineupListing) of this component 
  // depend on matchEvents being up-to-date, which means that the websocket connection needs
  // to be alive no matter which mutually exclusive child is currently being rendered
  useEffect(() => {
    const matchFinished = allMatchInformation?.match.status === MatchStatus.FINISHED;
    const homeTeamId = allMatchInformation?.match.homeTeam?.id;
    // connect to the websocket only if:
    //    * homeTeamId is set (needed to determine if an event should be placed on
    //    the left or the right side on the summary)
    //    * the matchId is defined
    //    * the match is not finished (a finished match will never send any more events)
    if (homeTeamId === undefined || matchFinished || matchId === undefined) {
      return;
    }

    // ?match_id={matchId} has to be attached while connecting to subscribe to match events
    // happening in a specific match
    const connectionUrl = `${publicRuntimeConfig.MATCH_EVENTS_WS_URL}`;
    const socket = io(connectionUrl, {
      query: {
        "match_id": matchId
      }
    });

    socket.on('match-event', (matchEvent: MatchEvent) => {
      setMatchEvents((prev) => [...prev, matchEvent])

      switch (matchEvent.event.type) {
        case MatchEventType.STATUS:
          const newStatus = matchEvent.event.targetStatus;
          updateMatchStatus(newStatus);
          break;
        case MatchEventType.GOAL:
          const homeTeamScoredGoal = matchEvent.event.teamId === homeTeamId;
          incrementFullTimeScore(homeTeamScoredGoal);
          break;
        case MatchEventType.PENALTY:
          const homeTeamScoredPenalty = matchEvent.event.teamId === homeTeamId;
          // missed penalties or penalties during the penalty shootout do not count as goals
          // in full-time
          const countsAsScored = matchEvent.event.countAsGoal && matchEvent.event.scored;
          if (countsAsScored) {
            incrementFullTimeScore(homeTeamScoredPenalty);
          }
          break;
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [router.query.path, allMatchInformation?.match.homeTeam?.id])

  return (
    <div className="mt-10 flex flex-row">
      <div className="basis-full rounded-md border border-t-0 border-x-c2 border-b-c2">
        {allMatchInformation !== undefined ?
          <MatchInfoContent
            allMatchInformation={allMatchInformation}
            updateableMatchInfo={updateableMatchInfo}
          />
          :
          <MatchInfoContentSkeleton />
        }
        <div className="pl-10 mt-5">
          {menuConfig !== undefined &&
            <RoutingHorizontalMenu menuConfig={menuConfig} />
          }
        </div>
        <div className="pb-14">
          {matchSubPage === "summary" &&
            <MatchEventsSummary
              matchId={matchId}
              homeTeamId={allMatchInformation?.match.homeTeam?.id}
              matchEvents={matchEvents}
            />
          }
          {matchSubPage === "lineups" &&
            <MatchLineupListing
              matchId={matchId}
              homeTeamId={allMatchInformation?.match.homeTeam?.id}
              matchEvents={matchEvents}
            />
          }
        </div>
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
  const matchIsLive = MatchStatus.isLive(props.updateableMatchInfo.status.value);

  return (
    <>
      <div className="pl-4 bg-c2 py-3 rounded-t-md">
        <Image
          className="bg-white p-1 rounded-sm float-left mr-2"
          width="25"
          height="25"
          src={competitionLogoUrl ?? "../../placeholder-competition-logo.svg"}
          alt="Competition's name" />
        <Link href={`/competition/${encodeURIComponent(props.allMatchInformation.competition.id)}`}>
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
              <div className="basis-full text-center">
                <div className="flex flex-col items-center">
                  <Image
                    className="bg-white p-2 rounded-xl h-24 w-24"
                    width="100"
                    height="100"
                    src={homeCrestUrl ?? "../../placeholder-club-logo.svg"}
                    alt="Home team's crest" />
                  <Link href={`/team/${encodeURIComponent(matchInformation.homeTeam!.id)}`}>
                    <span className="font-extrabold hover:underline">{matchInformation?.homeTeam?.name}</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col basis-1/3 text-center">
            <div className="basis-full pt-5">
              <span className={`text-5xl ${props.updateableMatchInfo.fullTimeScore.highlight ? "text-red-600" : ""}`}>
                {Score.format(props.updateableMatchInfo.fullTimeScore.value)}
              </span>
            </div>
            <div className="basis-full mt-4">
              <span className={`font-extrabold text-sm ${props.updateableMatchInfo.status.highlight ? "text-red-600" : ""}`}>
                <MatchStatusBox
                  currentStatus={props.updateableMatchInfo.status.value}
                  startTimeUTC={props.allMatchInformation.match.startTimeUTC}
                  statusLastModifiedUTC={props.updateableMatchInfo.status.lastModifiedUTC}
                  matchIsLive={matchIsLive}
                  textBig={true}
                />
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
              <div className="basis-full text-center">
                <div className="flex flex-col items-center">
                  <Image
                    className="bg-white p-2 rounded-xl h-24 w-24"
                    width="100"
                    height="100"
                    src={awayCrestUrl ?? "../../placeholder-club-logo.svg"}
                    alt="Away team's crest" />
                  <Link href={`/team/${encodeURIComponent(matchInformation.awayTeam!.id)}`}>
                    <span className="font-extrabold hover:underline">{matchInformation?.awayTeam?.name}</span>
                  </Link>
                </div>
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
              alt="Team's name" />
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
              alt="Team's name" />
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
