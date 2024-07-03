import getConfig from "next/config";
import { MatchStatus } from "@/types/Match";
import Image from 'next/image'
import * as MatchEvents from "@/types/MatchEvents"
import { useEffect, useState } from "react";

const { publicRuntimeConfig } = getConfig();

export default function MatchEventsSummary(props: { matchId: string | undefined, homeTeamId: string | undefined }) {
  const [matchEvents, setMatchEvents] = useState<MatchEvents.MatchEvent[]>([]);

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
      });

  }, [props.matchId])

  return (
    <>
      <div className="mt-5 bg-rose-500">
        <span className="pl-8 font-extrabold">Summary</span>
      </div>
      <div className="">
        {matchEvents.map((e) => matchEventsRender({ event: e, homeTeamId: props.homeTeamId }))}
      </div>
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
  const currentScore = `${props.event.mainScore.homeGoals}:${props.event.mainScore.awayGoals}`;
  return (
    <>
      <div className="flex flex-row bg-rose-300 h-8 pt-2 shadow-sm shadow-black mb-2">
        <div className="basis-1/2">
          <span className="pl-10 float-left text-sm">{statusText}</span>
        </div>
        <div className="basis-1/2">
          <span className="pr-10 float-right text-sm">{currentScore}</span>
        </div>
      </div>
    </>
  )
};

function CommentaryEventBox(props: { event: MatchEvents.CommentaryEvent }) {
  return (
    <>
      <div className="flex flex-col bg-rose-200 p-8 mb-2">
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
      <div className={`flex ${props.leftSided ? "flex-row" : "flex-row-reverse"} bg-rose-200 px-8 mb-2 items-center`}>
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
      <div className={`flex ${props.leftSided ? "flex-row" : "flex-row-reverse"} bg-rose-200 px-8 mb-2 items-center`}>
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
              <span className="font-extralight px-2 text-sm text-gray-700">({props.event.assistingPlayer.name})</span>
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
      <div className={`flex ${props.leftSided ? "flex-row" : "flex-row-reverse"} bg-rose-200 px-8 mb-2 items-center`}>
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
            <span className="font-extralight px-2 text-sm text-gray-700">{props.event.playerOut.name}</span>
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
      <div className={`flex ${props.leftSided ? "flex-row" : "flex-row-reverse"} bg-rose-200 px-8 mb-2 items-center`}>
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
            <span className="font-extralight px-2 text-sm text-gray-700">(Penalty)</span>
          </div>
        </div>
      </div>
    </>
  );
}
