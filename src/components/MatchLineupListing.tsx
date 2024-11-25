import { Lineup, PlayerActivity, PlayerActivityMap, PlayerPosition, TeamPlayer, playerActivityGetOrDefault } from "@/types/Lineup"
import { useEffect, useState } from "react"
import getConfig from "next/config";
import { countryCodeToFlagEmoji } from "@/types/Team";
import LineupFormations from "./LineupFormations";
import GoalIcon from "./icons/GoalIcon";
import OwnGoalIcon from "./icons/OwnGoalIcon";
import CardIcon from "./icons/CardIcon";
import SubstitutionIcon from "./icons/SubstitutionIcon";
import { MatchEvent, MatchEventInfo, MatchEventType } from "@/types/MatchEvents";

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
  matchEvents: MatchEvent[],
}) {
  const [lineupContentLoaded, setLineupContentLoaded] = useState<boolean>(false);
  const [lineup, setLineup] = useState<Lineup>(INITIAL_LINEUP);
  const playerActivity = evaluatePlayerActivity(props.matchEvents);

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
        <LineupContent lineup={lineup} playerActivity={playerActivity} />
        :
        <LineupContentSkeleton />
      }
    </>
  )
}

function LineupContent(props: {
  lineup: Lineup,
  playerActivity: PlayerActivityMap
}) {
  return (
    <>
      <LineupFormations lineup={props.lineup} playerActivity={props.playerActivity} />
      <NamedLineup
        title="Starting Players"
        players={zipPlayers(props.lineup.home.startingPlayers, props.lineup.away.startingPlayers)}
        playerActivity={props.playerActivity}
      />
      <NamedLineup
        title="Substitute Players"
        players={zipPlayers(props.lineup.home.substitutePlayers, props.lineup.away.substitutePlayers)}
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
            <div className="flex flex-row">
              <table className="basis-full table-auto mx-8 mb-10">
                <tbody>
                  {[...Array(8)].map((_e, j) => {
                    return (
                      <div
                        key={j}
                        className="animate-pulse odd:bg-c1 even:bg-c0">
                        <div className="h-6"></div>
                      </div>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )
      })}
    </>
  )
}

type ZippedPlayers = {
  homePlayer: TeamPlayer | undefined,
  awayPlayer: TeamPlayer | undefined,
};

function zipPlayers(homePlayers: TeamPlayer[], awayPlayers: TeamPlayer[]): ZippedPlayers[] {
  const finalLength = Math.max(homePlayers.length, awayPlayers.length);
  let zippedPlayers: ZippedPlayers[] = []

  for (let i = 0; i < finalLength; i++) {
    const homePlayer = homePlayers[i];
    const awayPlayer = awayPlayers[i];
    zippedPlayers.push({ homePlayer: homePlayer, awayPlayer: awayPlayer })
  }
  return zippedPlayers
}

function NamedLineup(props: {
  title: string,
  players: ZippedPlayers[],
  playerActivity: PlayerActivityMap
}) {
  return (
    <>
      <div className="flex flex-row bg-c1 h-8 pt-2 shadow-sm shadow-black mb-2">
        <div className="">
          <span className="pl-10 float-left text-sm text-c3">{props.title}</span>
        </div>
      </div>
      <div className="flex flex-row">
        <LineupTable players={props.players} playerActivity={props.playerActivity} />
      </div>
    </>
  )
}

function LineupTable(props: {
  players: ZippedPlayers[],
  playerActivity: PlayerActivityMap
}) {
  return (
    <table className="basis-full table-auto mx-8 mb-10">
      <tbody className="">
        {props.players.map((e) => {
          const homePlayerId = e.homePlayer?.id!;
          const homePlayerActivity =
            playerActivityGetOrDefault(props.playerActivity, homePlayerId);

          const awayPlayerId = e.awayPlayer?.id!;
          const awayPlayerActivity =
            playerActivityGetOrDefault(props.playerActivity, awayPlayerId);

          return (
            <>
              <tr className="odd:bg-c1 even:bg-c0">
                <td className="font-mono font-extrabold">{e.homePlayer?.number}</td>
                <td>{countryCodeToFlagEmoji(e.homePlayer?.countryCode)}</td>
                <td className="text-xs text-gray">{PlayerPosition.format(e.homePlayer?.position)}</td>
                <td className="flex flex-row">
                  {e.homePlayer?.player.name}
                  {homePlayerActivity.goalCounter > 0 &&
                    <div className="pl-1">
                      <GoalIcon goalCounter={homePlayerActivity.goalCounter} />
                    </div>
                  }
                  {homePlayerActivity.ownGoalCounter > 0 &&
                    <div className="pl-1">
                      <OwnGoalIcon ownGoalCounter={homePlayerActivity.ownGoalCounter} />
                    </div>
                  }
                  {homePlayerActivity.card !== undefined &&
                    <div className="pl-1">
                      <CardIcon card={homePlayerActivity.card} />
                    </div>
                  }
                  {homePlayerActivity.inSubstitution &&
                    <div className="pl-1">
                      <SubstitutionIcon />
                    </div>
                  }
                </td>
                <td></td>
                <td className="flex flex-row-reverse">
                  {e.awayPlayer?.player.name}
                  {awayPlayerActivity.goalCounter > 0 &&
                    <div className="pr-1">
                      <GoalIcon goalCounter={awayPlayerActivity.goalCounter} />
                    </div>
                  }
                  {awayPlayerActivity.ownGoalCounter > 0 &&
                    <div className="pr-1">
                      <OwnGoalIcon ownGoalCounter={awayPlayerActivity.ownGoalCounter} />
                    </div>
                  }
                  {awayPlayerActivity.card !== undefined &&
                    <div className="pr-1">
                      <CardIcon card={awayPlayerActivity.card} />
                    </div>
                  }
                  {awayPlayerActivity.inSubstitution &&
                    <div className="pr-1">
                      <SubstitutionIcon />
                    </div>
                  }
                </td>
                <td className="text-xs text-gray">{PlayerPosition.format(e.awayPlayer?.position)}</td>
                <td>{countryCodeToFlagEmoji(e.awayPlayer?.countryCode)}</td>
                <td className="font-mono font-extrabold float-right">{e.awayPlayer?.number}</td>
              </tr>
            </>
          )
        })}
      </tbody>
    </table>
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
