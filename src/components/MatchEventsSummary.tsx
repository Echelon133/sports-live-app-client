import getConfig from "next/config";
import { MatchStatus, Score } from "@/types/Match";
import Image from 'next/image'
import * as MatchEvents from "@/types/MatchEvents"
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { UpdateableMatchInfo } from "@/pages/match/[id]";

const { publicRuntimeConfig } = getConfig();
const HIGHLIGHT_ON_UPDATE_TIME = 3000;


export default function MatchEventsSummary(props: {
  matchId: string | undefined,
  homeTeamId: string | undefined,
  matchFinished: boolean,
  setUpdateableMatchInfo: Dispatch<SetStateAction<UpdateableMatchInfo>>,
}) {
  const [matchEventsContentLoaded, setMatchEventsContentLoaded] = useState<boolean>(false);
  const [matchEvents, setMatchEvents] = useState<MatchEvents.MatchEvent[]>([]);

  // fetch past match events
  useEffect(() => {
    if (props.matchId === undefined) {
      return;
    }

    const eventsUrl = `${publicRuntimeConfig.MATCHES_BASE_URL}/${props.matchId}/events`;
    fetch(eventsUrl)
      .then((res) => res.json())
      .then((data) => {
        const matchEvents: MatchEvents.MatchEvent[] = data;
        setMatchEvents(matchEvents);
        setMatchEventsContentLoaded(true);
      });

  }, [props.matchId])

  function incrementFullTimeScore(homeTeamScored: boolean) {
    const [homeTeamGoalsDelta, awayTeamGoalsDelta] =
      homeTeamScored ? [1, 0] : [0, 1];

    props.setUpdateableMatchInfo((prev) => {
      const newScore: Score = {
        homeGoals: prev.fullTimeScore.value.homeGoals + homeTeamGoalsDelta,
        awayGoals: prev.fullTimeScore.value.awayGoals + awayTeamGoalsDelta,
      };

      const updated = {
        fullTimeScore: {
          value: newScore,
          highlight: true,
        },
        status: prev.status
      };
      return updated;
    });

    // turn off the score highlight after 3 seconds
    setTimeout(() => {
      props.setUpdateableMatchInfo((prev) => {
        const updated = {
          fullTimeScore: {
            value: prev.fullTimeScore.value,
            highlight: false
          },
          status: prev.status
        };
        return updated;
      })
    }, HIGHLIGHT_ON_UPDATE_TIME);
  }

  function updateMatchStatus(newStatus: MatchStatus) {
    props.setUpdateableMatchInfo((prev) => {
      const updated = {
        fullTimeScore: prev.fullTimeScore,
        status: {
          value: newStatus,
          highlight: true,
        }
      };
      return updated;
    });

    // turn off the status highlight after 3 seconds
    setTimeout(() => {
      props.setUpdateableMatchInfo((prev) => {
        const updated = {
          fullTimeScore: prev.fullTimeScore,
          status: {
            value: prev.status.value,
            highlight: false,
          }
        };
        return updated;
      })
    }, HIGHLIGHT_ON_UPDATE_TIME);
  }

  // fetch match events which could happen after the page load
  useEffect(() => {
    // connect to the websocket only if:
    //    * homeTeamId is set (needed to determine if an event should be placed on
    //    the left or the right side on the summary)
    //    * the matchId is defined
    //    * the match is not finished (a finished match will never send any more events)
    if (props.homeTeamId === undefined || props.matchFinished || props.matchId === undefined) {
      return;
    }

    // ?match_id={matchId} has to be attached while connecting to subscribe to match events
    // happening in a specific match
    const connectionUrl = `${publicRuntimeConfig.MATCH_EVENTS_WS_URL}`;
    const socket = io(connectionUrl, {
      query: {
        "match_id": props.matchId
      }
    });

    // event type 'match-event' sends JSON of type MatchEvents.MatchEvent, some of these
    // events (STATUS, GOAL, PENALTY) require updating state that's placed in the parent
    // component (updating through the setter recieved via props)
    socket.on('match-event', (matchEvent: MatchEvents.MatchEvent) => {
      setMatchEvents((prev) => [...prev, matchEvent])

      switch (matchEvent.event.type) {
        case MatchEvents.MatchEventType.STATUS:
          const newStatus = matchEvent.event.targetStatus;
          updateMatchStatus(newStatus);
          break;
        case MatchEvents.MatchEventType.GOAL:
          const homeTeamScoredGoal = isHomeTeamRelated(matchEvent.event.teamId, props.homeTeamId);
          incrementFullTimeScore(homeTeamScoredGoal);
          break;
        case MatchEvents.MatchEventType.PENALTY:
          const homeTeamScoredPenalty = isHomeTeamRelated(matchEvent.event.teamId, props.homeTeamId);
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
  }, [props.matchId, props.matchFinished, props.homeTeamId])

  return (
    <>
      <div className="mt-6 flex flex-row bg-c1 items-center justify-center">
        <div className="mt-2 basis-full">
          <div className="bg-c2 shadow-sm shadow-black mb-2">
            <div className="p-3 pl-10">
              <span className="font-extrabold text-c4">Summary</span>
            </div>
          </div>
        </div>
      </div>
      {matchEventsContentLoaded ?
        <MatchEventsSummaryContent matchEvents={matchEvents} homeTeamId={props.homeTeamId} />
        :
        <MatchEventsSummaryContentSkeleton />
      }
    </>
  )
}

function MatchEventsSummaryContent(props: { matchEvents: MatchEvents.MatchEvent[], homeTeamId: string | undefined }) {
  return (
    <>
      <div className="">
        {props.matchEvents.map((e) => matchEventsRender({ event: e, homeTeamId: props.homeTeamId }))}
      </div>
    </>
  )
}

function MatchEventsSummaryContentSkeleton() {
  return (
    <>
      {[...Array(3)].map((_e, i) => {
        return (
          <>
            <div key={i} className="animate-pulse flex flex-row bg-c2 h-8 pt-2 shadow-sm shadow-black mb-2">
              <div className="basis-full"></div>
            </div>
            {[...Array(3)].map((_e, j) => {
              return (
                <>
                  <div className="animate-pulse flex flex-col bg-c1 p-8 mb-2">
                    <div className="basis-full"></div>
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

function isHomeTeamRelated(checkedTeamId: string, homeTeamId: string | undefined): boolean {
  return checkedTeamId === homeTeamId;
}

function matchEventsRender(matchEvent: { event: MatchEvents.MatchEvent, homeTeamId: string | undefined }) {
  const event = matchEvent.event.event;
  switch (event.type) {
    case MatchEvents.MatchEventType.STATUS:
      return <StatusEventBox event={event} />
    case MatchEvents.MatchEventType.COMMENTARY:
      return <CommentaryEventBox event={event} />
    case MatchEvents.MatchEventType.CARD:
      return <CardEventBox event={event} leftSided={isHomeTeamRelated(event.teamId, matchEvent.homeTeamId)} />
    case MatchEvents.MatchEventType.GOAL:
      return <GoalEventBox event={event} leftSided={isHomeTeamRelated(event.teamId, matchEvent.homeTeamId)} />
    case MatchEvents.MatchEventType.SUBSTITUTION:
      return <SubstitutionEventBox event={event} leftSided={isHomeTeamRelated(event.teamId, matchEvent.homeTeamId)} />
    case MatchEvents.MatchEventType.PENALTY:
      return <PenaltyEventBox event={event} leftSided={isHomeTeamRelated(event.teamId, matchEvent.homeTeamId)} />
  }
}

function StatusEventBox(props: { event: MatchEvents.StatusEvent }) {
  const statusText = MatchStatus.format(props.event.targetStatus);
  const currentScore = Score.format(props.event.mainScore);
  return (
    <>
      <div className="flex flex-row bg-c1 h-8 pt-2 shadow-sm shadow-black mb-2">
        <div className="basis-1/2">
          <span className="pl-10 float-left text-sm text-c3">{statusText}</span>
        </div>
        <div className="basis-1/2">
          <span className="pr-10 float-right text-sm text-c3">{currentScore}</span>
        </div>
      </div>
    </>
  )
};

function CommentaryEventBox(props: { event: MatchEvents.CommentaryEvent }) {
  return (
    <>
      <div className="flex flex-col p-8 mb-2">
        <div className="basis-full">
          <span className="text-sm font-extrabold">{props.event.minute}'</span>
          <p className="pl-8 text-sm">{props.event.message}</p>
        </div>
      </div>
    </>
  )
};


function CardEventBox(props: { event: MatchEvents.CardEvent, leftSided: boolean }) {
  let cardImageSrc = ""
  let cardText = ""

  switch (props.event.cardType) {
    case MatchEvents.CardType.YELLOW:
      cardImageSrc = "../../yellow.svg"
      cardText = "Yellow Card"
      break;
    case MatchEvents.CardType.SECOND_YELLOW:
      cardImageSrc = "../../second-yellow.svg"
      cardText = "Second Yellow Card"
      break;
    case MatchEvents.CardType.DIRECT_RED:
      cardImageSrc = "../../red.svg"
      cardText = "Direct Red Card"
      break;
  }

  return (
    <>
      <div className={`flex ${props.leftSided ? "flex-row" : "flex-row-reverse"} px-8 mb-2 items-center`}>
        <div className="">
          <span className="text-sm font-extrabold">{props.event.minute}'</span>
          <Image
            className="h-6 w-5"
            width="20"
            height="40"
            src={cardImageSrc}
            alt={cardText}
            title={cardText} />
        </div>
        <div className="px-5">
          <span className="font-extrabold">{props.event.cardedPlayer.name}</span>
        </div>
      </div>
    </>
  )
};

function GoalEventBox(props: { event: MatchEvents.GoalEvent, leftSided: boolean }) {
  const goalImageSrc = props.event.ownGoal ? "../../ball-red.svg" : "../../ball-white.svg";
  const goalText = props.event.ownGoal ? "Own Goal" : "Goal";

  return (
    <>
      <div className={`flex ${props.leftSided ? "flex-row" : "flex-row-reverse"} px-8 mb-2 items-center`}>
        <div className="">
          <span className="text-sm font-extrabold">{props.event.minute}'</span>
          <Image
            className="h-5 w-5"
            width="80"
            height="80"
            src={goalImageSrc}
            alt={goalText}
            title={goalText} />
        </div>
        <div className={`flex ${props.leftSided ? "flex-row" : "flex-row-reverse"} px-5`}>
          <div className="">
            <span className="font-extrabold">{props.event.scoringPlayer.name}</span>
          </div>
          <div className="">
            {props.event.assistingPlayer &&
              <span className="font-extralight px-2 text-sm text-gray">({props.event.assistingPlayer.name})</span>
            }
          </div>
        </div>
      </div>
    </>
  );
}

function SubstitutionEventBox(props: { event: MatchEvents.SubstitutionEvent, leftSided: boolean }) {
  return (
    <>
      <div className={`flex ${props.leftSided ? "flex-row" : "flex-row-reverse"} px-8 mb-2 items-center`}>
        <div className="">
          <span className="text-sm font-extrabold">{props.event.minute}'</span>
          <Image
            className="h-5 w-5"
            width="80"
            height="80"
            src="../../substitution.svg"
            alt="Substitution"
            title="Substitution" />
        </div>
        <div className={`flex ${props.leftSided ? "flex-row" : "flex-row-reverse"} px-5`}>
          <div className="">
            <span className="font-extrabold">{props.event.playerIn.name}</span>
          </div>
          <div className="">
            <span className="font-extralight px-2 text-sm text-gray">{props.event.playerOut.name}</span>
          </div>
        </div>
      </div>
    </>
  );
}

function PenaltyEventBox(props: { event: MatchEvents.PenaltyEvent, leftSided: boolean }) {
  const penaltyImageSrc = props.event.scored ? "../../ball-white.svg" : "../../ball-red.svg";
  const penaltyText = props.event.scored ? "Penalty Scored" : "Penalty Missed";

  return (
    <>
      <div className={`flex ${props.leftSided ? "flex-row" : "flex-row-reverse"} px-8 mb-2 items-center`}>
        <div className="">
          <span className="text-sm font-extrabold">{props.event.minute}'</span>
          <Image
            className="h-5 w-5"
            width="80"
            height="80"
            src={penaltyImageSrc}
            alt={penaltyText}
            title={penaltyText} />
        </div>
        <div className={`flex ${props.leftSided ? "flex-row" : "flex-row-reverse"} px-5`}>
          <div className="">
            <span className="font-extrabold">{props.event.shootingPlayer.name}</span>
          </div>
          <div className="">
            <span className="font-extralight px-2 text-sm text-gray">(Penalty)</span>
          </div>
        </div>
      </div>
    </>
  );
}
