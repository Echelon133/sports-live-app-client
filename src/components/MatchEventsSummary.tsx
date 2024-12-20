import { MatchStatus, Score } from "@/types/Match";
import * as MatchEvents from "@/types/MatchEvents";
import { Dispatch, SetStateAction, useEffect } from "react";
import getConfig from "next/config";
import CardIcon from "./icons/CardIcon";
import OwnGoalIcon from "./icons/OwnGoalIcon";
import GoalIcon from "./icons/GoalIcon";
import SubstitutionIcon from "./icons/SubstitutionIcon";
import InfoMessage from "./InfoMessage";

const { publicRuntimeConfig } = getConfig();

export default function MatchEventsSummary(props: {
  matchId: string | undefined,
  homeTeamId: string | undefined,
  matchEvents: MatchEvents.MatchEvent[],
  setMatchEvents: Dispatch<SetStateAction<MatchEvents.MatchEvent[]>>,
}) {

  // fetch already existing match events
  useEffect(() => {
    if (props.matchId === undefined) {
      return;
    }

    const eventsUrl = `${publicRuntimeConfig.MATCHES_BASE_URL}/${props.matchId}/events`;
    fetch(eventsUrl)
      .then((res) => res.json())
      .then((data) => {
        const matchEvents: MatchEvents.MatchEvent[] = data;
        props.setMatchEvents(matchEvents);
      });

  }, [props.matchId]);

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
      {((props.matchEvents !== undefined) && (props.homeTeamId !== undefined)) ?
        <>
          {props.matchEvents.length === 0 ?
            <div className="mt-8">
              <InfoMessage message="No events yet" />
            </div>
            :
            <MatchEventsSummaryContent
              key={props.matchId}
              matchEvents={props.matchEvents}
              homeTeamId={props.homeTeamId}
            />
          }
        </>
        :
        <MatchEventsSummaryContentSkeleton key={props.matchId + "skeleton"} />
      }
    </>
  )
}

function MatchEventsSummaryContent(props: {
  matchEvents: MatchEvents.MatchEvent[],
  homeTeamId: string | undefined
}) {
  return (
    <>
      <div className="">
        {props.matchEvents.map(
          (e) => matchEventsRender({ event: e, homeTeamId: props.homeTeamId })
        )}
      </div>
    </>
  )
}

function MatchEventsSummaryContentSkeleton() {
  return (
    <>
      {[...Array(3)].map((_e, i) => {
        return (
          <div key={i}>
            <div className="animate-pulse flex flex-row bg-c2 h-8 pt-2 shadow-sm shadow-black mb-2">
              <div className="basis-full"></div>
            </div>
            <div className="animate-pulse flex flex-col bg-c1 p-8 mb-2">
              <div className="basis-full"></div>
            </div>
            <div className="animate-pulse flex flex-col bg-c1 p-8 mb-2">
              <div className="basis-full"></div>
            </div>
            <div className="animate-pulse flex flex-col bg-c1 p-8 mb-2">
              <div className="basis-full"></div>
            </div>
          </div>
        )
      })}
    </>
  )
}

function isHomeTeamRelated(checkedTeamId: string, homeTeamId: string | undefined): boolean {
  return checkedTeamId === homeTeamId;
}

function matchEventsRender(matchEvent: {
  event: MatchEvents.MatchEvent,
  homeTeamId: string | undefined
}) {
  const eventId = matchEvent.event.id;
  const event = matchEvent.event.event;
  switch (event.type) {
    case MatchEvents.MatchEventType.STATUS:
      return <StatusEventBox key={eventId} event={event} />
    case MatchEvents.MatchEventType.COMMENTARY:
      return <CommentaryEventBox key={eventId} event={event} />
    case MatchEvents.MatchEventType.CARD:
      return <CardEventBox
        key={eventId}
        event={event}
        leftSided={isHomeTeamRelated(event.teamId, matchEvent.homeTeamId)}
      />
    case MatchEvents.MatchEventType.GOAL:
      return <GoalEventBox
        key={eventId}
        event={event}
        leftSided={isHomeTeamRelated(event.teamId, matchEvent.homeTeamId)}
      />
    case MatchEvents.MatchEventType.SUBSTITUTION:
      return <SubstitutionEventBox
        key={eventId}
        event={event}
        leftSided={isHomeTeamRelated(event.teamId, matchEvent.homeTeamId)}
      />
    case MatchEvents.MatchEventType.PENALTY:
      return <PenaltyEventBox
        key={eventId}
        event={event}
        leftSided={isHomeTeamRelated(event.teamId, matchEvent.homeTeamId)}
      />
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
  return (
    <>
      <div className={`flex ${props.leftSided ? "flex-row" : "flex-row-reverse"} px-8 mb-2 items-center`}>
        <div className="">
          <span className="text-sm font-extrabold">{props.event.minute}'</span>
          <CardIcon card={props.event.cardType} />
        </div>
        <div className="px-5">
          <span className="font-extrabold">{props.event.cardedPlayer.name}</span>
        </div>
      </div>
    </>
  )
};

function GoalEventBox(props: { event: MatchEvents.GoalEvent, leftSided: boolean }) {
  return (
    <>
      <div className={`flex ${props.leftSided ? "flex-row" : "flex-row-reverse"} px-8 mb-2 items-center`}>
        <div className="">
          <span className="text-sm font-extrabold">{props.event.minute}'</span>
          {props.event.ownGoal ?
            <OwnGoalIcon />
            :
            <GoalIcon />
          }
        </div>
        <div className={`flex ${props.leftSided ? "sm:flex-row" : "sm:flex-row-reverse"} flex-col px-5 items-center`}>
          <span className="font-extrabold">{props.event.scoringPlayer.name}</span>
          {props.event.assistingPlayer &&
            <span className="font-extralight px-2 text-sm text-gray">({props.event.assistingPlayer.name})</span>
          }
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
          <SubstitutionIcon />
        </div>
        <div className={`flex ${props.leftSided ? "sm:flex-row" : "sm:flex-row-reverse"} flex-col px-5 items-center`}>
          <span className="font-extrabold">{props.event.playerIn.name}</span>
          <span className="font-extralight px-2 text-sm text-gray">{props.event.playerOut.name}</span>
        </div>
      </div>
    </>
  );
}

function PenaltyEventBox(props: { event: MatchEvents.PenaltyEvent, leftSided: boolean }) {
  return (
    <>
      <div className={`flex ${props.leftSided ? "flex-row" : "flex-row-reverse"} px-8 mb-2 items-center`}>
        <div className="">
          <span className="text-sm font-extrabold">{props.event.minute}'</span>
          {props.event.scored ?
            <GoalIcon />
            :
            <OwnGoalIcon />
          }
        </div>
        <div className={`flex ${props.leftSided ? "sm:flex-row" : "sm:flex-row-reverse"} flex-col px-5 items-center`}>
          <span className="font-extrabold">{props.event.shootingPlayer.name}</span>
          <span className="font-extralight px-2 text-sm text-gray">(Penalty)</span>
        </div>
      </div>
    </>
  );
}
