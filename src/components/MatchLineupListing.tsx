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
          lineup={lineup}
          playerActivity={playerActivity}
          homeSubstitutionEvents={homeSubstitutionEvents}
          awaySubstitutionEvents={awaySubstitutionEvents}
        />
        :
        <LineupContentSkeleton />
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

  return (
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
  )
}

function LineupContentSkeleton() {
  return (
    <>
      {["Starting Players", "Substitute Players"].map((title, i) => {
        return (
          <>
            <div
              key={i}
              className="animate-pulse flex flex-row bg-c1 h-8 pt-2 shadow-sm shadow-black mb-2">
              <span className="pl-10 float-left text-sm text-c3">{title}</span>
            </div>
            {[...Array(8)].map((_e, j) => {
              return (
                <>
                  <div key={i * j} className="animate-pulse flex odd:bg-c0 even:bg-c1 h-12 rounded-xl mx-5">
                  </div>
                </>
              )
            })}
          </>
        )
      })}
    </>
  )
}

function SubstitutionEventsBox(props: {
  homeSubstitutionEvents: SubstitutionEvent[],
  awaySubstitutionEvents: SubstitutionEvent[],
}) {
  return (
    <>
      <div className="flex flex-row bg-c1 h-8 pt-2 shadow-sm shadow-black mb-2 mt-12">
        <div className="">
          <span className="pl-10 float-left text-sm text-c3">Substitutions</span>
        </div>
      </div>
      <div className="flex flex-row">
        <div className="basis-1/2">
          {props.homeSubstitutionEvents.map(e => {
            return (
              <>
                <div className="flex odd:bg-c0 even:bg-c1 h-12 items-center rounded-l-xl ml-5">
                  <div className="flex flex-row items-center ml-3">
                    <SubstitutionIcon />
                    <span className="ml-2">{e.minute}'</span>
                    <div className="flex flex-col ml-4">
                      <span className="font-extrabold">{e.playerIn.name}</span>
                      <span className="text-gray text-sm">{e.playerOut.name}</span>
                    </div>
                  </div>
                </div>
              </>
            )
          })}
        </div>
        <div className="basis-1/2">
          {props.awaySubstitutionEvents.map(e => {
            return (
              <>
                <div className="flex odd:bg-c0 even:bg-c1 h-12 items-center justify-end rounded-r-xl mr-5">
                  <div className="flex flex-row-reverse items-center mr-3">
                    <SubstitutionIcon />
                    <span className="mr-2">{e.minute}'</span>
                    <div className="flex flex-col mr-4 items-end">
                      <span className="font-extrabold">{e.playerIn.name}</span>
                      <span className="text-gray text-sm">{e.playerOut.name}</span>
                    </div>
                  </div>
                </div>
              </>
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
  return (
    <>
      <div className="flex flex-row">
        <div className="basis-1/2">
          {props.homePlayers.map(homePlayer => {
            const homePlayerActivity =
              playerActivityGetOrDefault(props.playerActivity, homePlayer?.id!);
            return (
              <>
                <div className="flex odd:bg-c0 even:bg-c1 h-12 items-center rounded-l-xl ml-5">
                  <div className="flex flex-row ml-4">
                    <div className="flex flex-row">
                      <span className="w-8 text-center">{homePlayer?.number}</span>
                      <span className="w-7">
                        {countryCodeToFlagEmoji(homePlayer?.countryCode)}
                      </span>
                      <span className="text-wrap">
                        {homePlayer?.player.name}
                        {homePlayer?.position === "GOALKEEPER" ? " (G)" : ""}
                      </span>
                      <PlayerActivityIcons playerActivity={homePlayerActivity} />
                    </div>
                  </div>
                </div>
              </>
            )
          })}
        </div >
        <div className="basis-1/2">
          {props.awayPlayers.map(awayPlayer => {
            const awayPlayerActivity =
              playerActivityGetOrDefault(props.playerActivity, awayPlayer?.id!);
            return (
              <>
                <div className="flex odd:bg-c0 even:bg-c1 h-12 items-center justify-end rounded-r-xl mr-5">
                  <div className="flex flex-row mr-4">
                    <div className="flex flex-row-reverse">
                      <span className="w-8 text-center">{awayPlayer?.number}</span>
                      <span className="w-7 pl-2">
                        {countryCodeToFlagEmoji(awayPlayer?.countryCode)}
                      </span>
                      <span className="text-wrap pl-1">
                        {awayPlayer?.player.name}
                        {awayPlayer?.position === "GOALKEEPER" ? " (G)" : ""}
                      </span>
                      <PlayerActivityIcons playerActivity={awayPlayerActivity} />
                    </div>
                  </div>
                </div>
              </>
            )
          })}
        </div>
      </div >
    </>
  )
}

function PlayerActivityIcons(props: { playerActivity: PlayerActivity }) {
  const a = props.playerActivity;
  return (
    <>
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
