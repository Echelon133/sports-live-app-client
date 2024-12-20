import { Lineup, PlayerActivity, PlayerActivityMap, TeamPlayer, playerActivityGetOrDefault } from "@/types/Lineup"
import { useEffect, useState } from "react"
import getConfig from "next/config";
import { countryCodeToFlagEmoji } from "@/types/Team";
import LineupFormations from "./LineupFormations";
import GoalIcon from "./icons/GoalIcon";
import OwnGoalIcon from "./icons/OwnGoalIcon";
import CardIcon from "./icons/CardIcon";
import SubstitutionIcon from "./icons/SubstitutionIcon";
import { MatchEvent, MatchEventInfo, MatchEventType, SubstitutionEvent } from "@/types/MatchEvents";
import InfoMessage from "./InfoMessage";

const { publicRuntimeConfig } = getConfig();

const INITIAL_LINEUP = {
  home: {
    startingPlayers: [],
    substitutePlayers: [],
    formation: null,
  },
  away: {
    startingPlayers: [],
    substitutePlayers: [],
    formation: null,
  }
};

export default function MatchLineupListing(props: {
  matchId: string | undefined,
  homeTeamId: string | undefined,
  matchEvents: MatchEvent[],
}) {
  const [lineupContentLoaded, setLineupContentLoaded] = useState<boolean>(false);
  const [lineup, setLineup] = useState<Lineup>(INITIAL_LINEUP);
  const playerActivity = evaluatePlayerActivity(props.matchEvents);
  const [homeSubstitutionEvents, awaySubstitutionEvents] =
    divideSubstitutionEventsByTeam(props.homeTeamId, props.matchEvents);

  useEffect(() => {
    if (props.matchId == undefined) {
      return;
    }

    const lineupsUrl = `${publicRuntimeConfig.MATCHES_BASE_URL}/${props.matchId}/lineups`;
    fetch(lineupsUrl)
      .then((res) => res.json())
      .then((data) => {
        const d: Lineup = data;
        setLineup(d);
        setLineupContentLoaded(true);
      });
  }, [props.matchId])

  return (
    <>
      <div className="mt-6 flex flex-row bg-c1 items-center justify-center">
        <div className="mt-2 basis-full">
          <div className="bg-c2 shadow-sm shadow-black mb-2">
            <div className="p-3 pl-10">
              <span className="font-extrabold text-c4">Lineups</span>
            </div>
          </div>
        </div>
      </div>
      {lineupContentLoaded ?
        <LineupContent
          key={props.matchId}
          lineup={lineup}
          playerActivity={playerActivity}
          homeSubstitutionEvents={homeSubstitutionEvents}
          awaySubstitutionEvents={awaySubstitutionEvents}
        />
        :
        <LineupContentSkeleton key={props.matchId + "skeleton"} />
      }
    </>
  )
}

function LineupContent(props: {
  lineup: Lineup,
  playerActivity: PlayerActivityMap,
  homeSubstitutionEvents: SubstitutionEvent[],
  awaySubstitutionEvents: SubstitutionEvent[]
}) {
  // only show the substitution box when there is at least one substitution (no matter the side)
  const showSubstitutionBox =
    (props.homeSubstitutionEvents.length !== 0) ||
    (props.awaySubstitutionEvents.length !== 0);

  function lineupNotEmpty(lineup: Lineup): boolean {
    const lengths =
      lineup.home.startingPlayers.length +
      lineup.home.substitutePlayers.length +
      lineup.away.startingPlayers.length +
      lineup.away.substitutePlayers.length;

    return lengths !== 0
  }

  return (
    <>
      {lineupNotEmpty(props.lineup) ?
        <>
          <LineupFormations lineup={props.lineup} playerActivity={props.playerActivity} />
          {showSubstitutionBox &&
            <SubstitutionEventsBox
              homeSubstitutionEvents={props.homeSubstitutionEvents}
              awaySubstitutionEvents={props.awaySubstitutionEvents}
            />
          }
          <NamedLineup
            title="Starting Players"
            homePlayers={props.lineup.home.startingPlayers}
            awayPlayers={props.lineup.away.startingPlayers}
            playerActivity={props.playerActivity}
          />
          <NamedLineup
            title="Substitute Players"
            homePlayers={props.lineup.home.substitutePlayers}
            awayPlayers={props.lineup.away.substitutePlayers}
            playerActivity={props.playerActivity}
          />
        </>
        :
        <div className="mt-8">
          <InfoMessage message="Lineups currently unavailable" />
        </div>
      }
    </>
  )
}

function LineupContentSkeleton() {
  return (
    <>
      {["Starting Players", "Substitute Players"].map((title, i) => {
        return (
          <div key={i}>
            <div
              className="animate-pulse flex flex-row bg-c1 h-8 pt-2 shadow-sm shadow-black mb-2">
              <span className="pl-10 float-left text-sm text-c3">{title}</span>
            </div>
            {[...Array(8)].map((_e, j) => {
              return (
                <div key={(j + 1) * 10} className="animate-pulse flex odd:bg-c0 even:bg-c1 h-12 rounded-xl mx-5">
                </div>
              )
            })}
          </div>
        )
      })}
    </>
  )
}

function SubstitutionEventsBox(props: {
  homeSubstitutionEvents: SubstitutionEvent[],
  awaySubstitutionEvents: SubstitutionEvent[],
}) {
  // make both arrays the same length so that the html lists based on them are also of equal length,
  // otherwise there is a UI bug where the elements of the longer html list abruptly end in 
  // the middle of the screen, with no styling on the other side
  const [homeSubstitutions, awaySubstitutions] = equalizeArrayLengths<SubstitutionEvent>(
    props.homeSubstitutionEvents,
    props.awaySubstitutionEvents
  );

  return (
    <>
      <div className="flex flex-row bg-c1 h-8 pt-2 shadow-sm shadow-black mb-2 mt-12">
        <span className="pl-10 float-left text-sm text-c3">Substitutions</span>
      </div>
      <div className="flex flex-row">
        <div className="basis-1/2">
          {homeSubstitutions.map((e, i) => {
            return (
              <div key={i} className="flex odd:bg-c0 even:bg-c1 h-12 items-center rounded-l-xl ml-5">
                {e !== undefined &&
                  <div className="flex flex-row items-center ml-3 text-xs sm:text-base">
                    <SubstitutionIcon />
                    <span className="ml-2 text-base">{e.minute}'</span>
                    <div className="flex flex-col ml-4">
                      <span className="font-extrabold">{e.playerIn.name}</span>
                      <span className="text-gray sm:text-sm">{e.playerOut.name}</span>
                    </div>
                  </div>
                }
              </div>
            )
          })}
        </div>
        <div className="basis-1/2">
          {awaySubstitutions.map((e, j) => {
            return (
              <div key={(j + 1) * 10} className="flex odd:bg-c0 even:bg-c1 h-12 items-center justify-end rounded-r-xl mr-5">
                {e !== undefined &&
                  <div className="flex flex-row-reverse items-center mr-3 text-xs sm:text-base">
                    <SubstitutionIcon />
                    <span className="mr-2 text-base">{e.minute}'</span>
                    <div className="flex flex-col mr-4 items-end">
                      <span className="font-extrabold">{e.playerIn.name}</span>
                      <span className="text-gray sm:text-sm">{e.playerOut.name}</span>
                    </div>
                  </div>
                }
              </div>
            )
          })}

        </div>
      </div>
    </>
  )
}


function NamedLineup(props: {
  title: string,
  homePlayers: TeamPlayer[],
  awayPlayers: TeamPlayer[],
  playerActivity: PlayerActivityMap
}) {
  return (
    <>
      <div className="flex flex-row bg-c1 h-8 pt-2 shadow-sm shadow-black mb-2 mt-12">
        <div className="">
          <span className="pl-10 float-left text-sm text-c3">{props.title}</span>
        </div>
      </div>
      <LineupTable
        homePlayers={props.homePlayers}
        awayPlayers={props.awayPlayers}
        playerActivity={props.playerActivity}
      />
    </>
  )
}

function LineupTable(props: {
  homePlayers: TeamPlayer[],
  awayPlayers: TeamPlayer[],
  playerActivity: PlayerActivityMap
}) {
  // make both arrays the same length so that the html lists based on them are also of equal length,
  // otherwise there is a UI bug where the elements of the longer html list abruptly end in 
  // the middle of the screen, with no styling on the other side
  const [homePlayers, awayPlayers] =
    equalizeArrayLengths<TeamPlayer>(props.homePlayers, props.awayPlayers);

  return (
    <>
      <div className="flex flex-row">
        <div className="basis-1/2">
          {homePlayers.map(homePlayer => {
            return (
              <div key={homePlayer?.id} className="flex odd:bg-c0 even:bg-c1 h-12 justify-start rounded-l-xl ml-5">
                {homePlayer !== undefined &&
                  <div className="flex flex-row ml-4">
                    <div className="flex flex-row items-center">
                      <span className="w-8 text-center">{homePlayer?.number}</span>
                      <span className="w-7">
                        {countryCodeToFlagEmoji(homePlayer?.countryCode)}
                      </span>
                      <div className="flex flex-col sm:flex-row sm:items-start">
                        <span className="pl-1 text-xs sm:text-base">
                          {homePlayer?.player.name}
                          {homePlayer?.position === "GOALKEEPER" ? " (G)" : ""}
                        </span>
                        <PlayerActivityIcons
                          playerActivity={playerActivityGetOrDefault(props.playerActivity, homePlayer!.id)}
                          leftSide={true}
                        />
                      </div>
                    </div>
                  </div>
                }
              </div>
            )
          })}
        </div >
        <div className="basis-1/2">
          {awayPlayers.map(awayPlayer => {
            return (
              <div key={awayPlayer?.id} className="flex odd:bg-c0 even:bg-c1 h-12 justify-end rounded-r-xl mr-5">
                {awayPlayer !== undefined &&
                  <div className="flex flex-row mr-4">
                    <div className="flex flex-row-reverse items-center">
                      <span className="w-8 text-center">{awayPlayer?.number}</span>
                      <span className="w-7 pl-2">
                        {countryCodeToFlagEmoji(awayPlayer?.countryCode)}
                      </span>
                      <div className="flex flex-col sm:flex-row-reverse sm:items-end">
                        <span className="pl-1 text-xs sm:text-base">
                          {awayPlayer?.player.name}
                          {awayPlayer?.position === "GOALKEEPER" ? " (G)" : ""}
                        </span>
                        <PlayerActivityIcons
                          playerActivity={playerActivityGetOrDefault(props.playerActivity, awayPlayer!.id)}
                          leftSide={false}
                        />
                      </div>
                    </div>
                  </div>
                }
              </div>
            )
          })}
        </div>
      </div >
    </>
  )
}

function PlayerActivityIcons(props: { playerActivity: PlayerActivity, leftSide: boolean }) {
  const a = props.playerActivity;
  return (
    <>
      <div className={`flex flex-row ${props.leftSide ? "justify-start" : "justify-end"}`}>
        {a.goalCounter > 0 &&
          <div className="pl-1">
            <GoalIcon goalCounter={a.goalCounter} />
          </div>
        }
        {a.ownGoalCounter > 0 &&
          <div className="pl-1">
            <OwnGoalIcon ownGoalCounter={a.ownGoalCounter} />
          </div>
        }
        {a.card !== undefined &&
          <div className="pl-1">
            <CardIcon card={a.card} />
          </div>
        }
        {a.inSubstitution &&
          <div className="pl-1">
            <SubstitutionIcon />
          </div>
        }
      </div>
    </>
  )
}

function evaluatePlayerActivity(events: MatchEvent[]): PlayerActivityMap {
  let result: PlayerActivityMap = new Map();

  function activityGetOrDefault(playerId: string): PlayerActivity {
    return playerActivityGetOrDefault(result, playerId);
  }

  for (let event of events) {
    const eventInfo: MatchEventInfo = event.event;
    switch (eventInfo.type) {
      // increase the goal counter of the goalscorer
      case MatchEventType.GOAL:
        const goalScorerId = eventInfo.scoringPlayer.teamPlayerId;
        const goalScorerActivity = activityGetOrDefault(goalScorerId);
        if (eventInfo.ownGoal) {
          goalScorerActivity.ownGoalCounter += 1;
        } else {
          goalScorerActivity.goalCounter += 1;
        }
        result.set(goalScorerId, goalScorerActivity);
        break;
      // increase the goal counter of the goalscorer if the penalty is scored and counts as a goal
      case MatchEventType.PENALTY:
        if (eventInfo.countAsGoal && eventInfo.scored) {
          const penaltyShooterId = eventInfo.shootingPlayer.teamPlayerId;
          const penaltyShooterActivity = activityGetOrDefault(penaltyShooterId);
          penaltyShooterActivity.goalCounter += 1;
          result.set(penaltyShooterId, penaltyShooterActivity);
        }
        break;
      // set the card of the carded player
      case MatchEventType.CARD:
        const cardedPlayerId = eventInfo.cardedPlayer.teamPlayerId;
        const cardedPlayerActivity = activityGetOrDefault(cardedPlayerId);
        cardedPlayerActivity.card = eventInfo.cardType;
        result.set(cardedPlayerId, cardedPlayerActivity);
        break;
      // mark both players who participated in a substitution
      case MatchEventType.SUBSTITUTION:
        const outPlayerId = eventInfo.playerOut.teamPlayerId;
        const outPlayerActivity = activityGetOrDefault(outPlayerId);
        outPlayerActivity.inSubstitution = true;
        result.set(outPlayerId, outPlayerActivity);

        const inPlayerId = eventInfo.playerIn.teamPlayerId;
        const inPlayerActivity = activityGetOrDefault(inPlayerId);
        inPlayerActivity.inSubstitution = true;
        result.set(inPlayerId, inPlayerActivity);
        break;
    }
  }
  return result;
}

function divideSubstitutionEventsByTeam(
  homeTeamId: string | undefined,
  matchEvents: MatchEvent[]
): [SubstitutionEvent[], SubstitutionEvent[]] {
  const substitutionEvents: SubstitutionEvent[] = matchEvents
    .map(e => e.event)
    .filter((e): e is SubstitutionEvent => e.type === MatchEventType.SUBSTITUTION);

  let homeSubstitutionEvents: SubstitutionEvent[] = [];
  let awaySubstitutionEvents: SubstitutionEvent[] = [];

  for (let e of substitutionEvents) {
    if (e.teamId === homeTeamId) {
      homeSubstitutionEvents.push(e);
    } else {
      awaySubstitutionEvents.push(e);
    }
  }

  return [homeSubstitutionEvents, awaySubstitutionEvents];
}

function equalizeArrayLengths<E>(arr1: E[], arr2: E[])
  : [(E | undefined)[], (E | undefined)[]] {

  if (arr1.length == arr2.length) {
    return [arr1, arr2];
  }

  const desiredLength = Math.max(arr1.length, arr2.length);
  const arr1Result = new Array(desiredLength).fill(undefined);
  const arr2Result = new Array(desiredLength).fill(undefined);
  for (let i = 0; i < desiredLength; i++) {
    arr1Result[i] = arr1[i];
    arr2Result[i] = arr2[i];
  }
  return [arr1Result, arr2Result];
}
