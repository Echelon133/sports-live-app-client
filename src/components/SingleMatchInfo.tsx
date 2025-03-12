import { GlobalEventSide, GlobalMatchEvent } from "@/types/GlobalMatchEvents";
import Image from 'next/image'
import { CompactMatchInfo, MatchResult, MatchStatus, RedCardInfo, Score } from "@/types/Match";
import { MatchEventType } from "@/types/MatchEvents";
import { useEffect, useState } from "react";
import { Socket } from "socket.io-client";
import MatchStatusBox from "./MatchStatusBox";

const HIGHLIGHT_TIMEOUT = 15000;

type CompactUpdateableMatchInfo = {
  status: MatchStatus,
  statusLastModifiedUTC: Date | null,
  fullTimeScore: Score,
  redCards: RedCardInfo,
  result: MatchResult,
  highlight: {
    home: boolean,
    away: boolean
  },
  eventContext: {
    home: string,
    away: string
  }
}

export default function SingleMatchInfo(props: {
  matchInfo: CompactMatchInfo,
  globalUpdatesSocket?: Socket | undefined
}) {
  // copy already known values as the initial state, which could be updated later 
  // in case there are any updates received via websocket
  const [updateableMatchInfo, setUpdateableMatchInfo] = useState<CompactUpdateableMatchInfo>(
    {
      status: props.matchInfo.status,
      statusLastModifiedUTC: props.matchInfo.statusLastModifiedUTC,
      fullTimeScore: props.matchInfo.scoreInfo,
      redCards: props.matchInfo.redCardInfo,
      result: props.matchInfo.result,
      highlight: { home: false, away: false },
      eventContext: { home: '', away: '' },
    }
  );

  const homeCrestUrl: string | undefined = props.matchInfo.homeTeam?.crestUrl;
  const awayCrestUrl: string | undefined = props.matchInfo.awayTeam?.crestUrl;
  const anyHighlight = updateableMatchInfo.highlight.home || updateableMatchInfo.highlight.away;
  const matchIsLive = MatchStatus.isLive(updateableMatchInfo.status);

  const homeTeamWon = updateableMatchInfo.result === MatchResult.HOME_WIN;
  const awayTeamWon = updateableMatchInfo.result === MatchResult.AWAY_WIN;

  function resetHighlightAfterTimeout(timeout: number) {
    setTimeout(() => {
      setUpdateableMatchInfo((prev) => {
        const updated = {
          ...prev,
          highlight: { home: false, away: false },
          eventContext: { home: '', away: '' },
        };
        return updated;
      })
    }, timeout);
  }

  function updateMatchStatus(targetStatus: MatchStatus, result: MatchResult) {
    setUpdateableMatchInfo((prev) => {
      const updated = {
        ...prev,
        status: targetStatus,
        statusLastModifiedUTC: new Date(),
        result: result,
        highlight: { home: true, away: true },
      };
      return updated;
    })

    // turn off the match highlight after a timeout
    resetHighlightAfterTimeout(HIGHLIGHT_TIMEOUT);
  }

  function incrementScoreline(homeTeamScored: boolean) {
    const [homeTeamGoalsDelta, awayTeamGoalsDelta] =
      homeTeamScored ? [1, 0] : [0, 1];

    setUpdateableMatchInfo((prev) => {
      const newFullScore: Score = {
        homeGoals: prev.fullTimeScore.homeGoals + homeTeamGoalsDelta,
        awayGoals: prev.fullTimeScore.awayGoals + awayTeamGoalsDelta,
      };

      const highlight = { home: homeTeamScored, away: !homeTeamScored };

      const eventContext = {
        home: homeTeamScored ? 'GOAL' : '',
        away: !homeTeamScored ? 'GOAL' : '',
      };

      const updated = {
        ...prev,
        fullTimeScore: newFullScore,
        highlight: highlight,
        eventContext: eventContext
      };
      return updated;
    });

    // turn off the match highlight after a timeout
    resetHighlightAfterTimeout(HIGHLIGHT_TIMEOUT);
  }

  function incrementRedCards(homeTeamRedCard: boolean) {
    const [homeTeamCardsDelta, awayTeamCardsDelta] =
      homeTeamRedCard ? [1, 0] : [0, 1];

    setUpdateableMatchInfo((prev) => {
      const newRedCards: RedCardInfo = {
        homeRedCards: prev.redCards.homeRedCards + homeTeamCardsDelta,
        awayRedCards: prev.redCards.awayRedCards + awayTeamCardsDelta,
      };

      const highlight = { home: homeTeamRedCard, away: !homeTeamRedCard };

      const eventContext = {
        home: homeTeamRedCard ? 'RED CARD' : '',
        away: !homeTeamRedCard ? 'RED CARD' : '',
      };

      const updated = {
        ...prev,
        redCards: newRedCards,
        highlight: highlight,
        eventContext: eventContext,
      };
      return updated;
    });

    // turn off the match highlight after a timeout
    resetHighlightAfterTimeout(HIGHLIGHT_TIMEOUT)
  }

  useEffect(() => {
    // if the status of the match is any of these, there won't be any updates
    // for this match, therefore there is no sense in subscribing to the websocket message feed
    const matchFinished =
      updateableMatchInfo.status === MatchStatus.FINISHED ||
      updateableMatchInfo.status === MatchStatus.POSTPONED ||
      updateableMatchInfo.status === MatchStatus.ABANDONED;

    if (props.globalUpdatesSocket === undefined || matchFinished) {
      return;
    }

    const socket = props.globalUpdatesSocket;

    socket.on('global-match-event', (matchEvent: GlobalMatchEvent) => {
      // process this event's contents only if the event pertains to the same
      // match as the one described by this component's state
      if (matchEvent.matchId === props.matchInfo.id) {
        switch (matchEvent.type) {
          case MatchEventType.STATUS:
            updateMatchStatus(matchEvent.targetStatus, matchEvent.result)
            break;
          case MatchEventType.GOAL:
            incrementScoreline(matchEvent.side === GlobalEventSide.HOME)
            break;
          case MatchEventType.CARD:
            incrementRedCards(matchEvent.side === GlobalEventSide.HOME)
            break;
        }
      }
    });

  }, [props.globalUpdatesSocket]);


  return (
    <div className={`${anyHighlight ? 'bg-highlight-a' : 'bg-c1 hover:bg-c0'} mb-1 flex flex-row items-center justify-center hover:cursor-pointer`}>
      <div className="basis-2/12 text-center">
        <MatchStatusBox
          currentStatus={updateableMatchInfo.status}
          startTimeUTC={props.matchInfo.startTimeUTC}
          statusLastModifiedUTC={updateableMatchInfo.statusLastModifiedUTC}
          matchIsLive={matchIsLive}
        />
        {!matchIsLive &&
          <span className="text-gray-600 text-xs">
            {formatFinishedMatchDate(props.matchInfo.startTimeUTC)}
          </span>
        }
      </div>
      <div className="basis-10/12 flex flex-col">
        <div className="flex pt-2 pb-1">
          <div className="basis-11/12">
            <Image
              className="float-left"
              width="20"
              height="20"
              src={homeCrestUrl ?? "placeholder-club-logo.svg"}
              alt="Home team's crest" />
            <span className={
              `font-mono ml-2 ${updateableMatchInfo.highlight.home ? 'text-highlight-b' : ''} ${homeTeamWon ? 'font-extrabold' : ''}`
            }>
              {props.matchInfo.homeTeam?.name}
            </span>
            <span className="ml-2">
              <RedCardBox redCardCount={updateableMatchInfo.redCards.homeRedCards} />
            </span>
            {updateableMatchInfo.eventContext.home !== '' &&
              <span title="Event context" className='animate-pulse float-right font-extrabold text-highlight-b mr-5'>
                {updateableMatchInfo.eventContext.home}
              </span>
            }
          </div>
          <div className="basis-1/12">
            <span title="Score at fulltime" className={`font-extrabold ${matchIsLive ? 'text-highlight-b' : 'text-c4'} `}>
              {updateableMatchInfo.fullTimeScore.homeGoals}
            </span>
          </div>
        </div>
        <div className="flex pb-2">
          <div className="basis-11/12">
            <Image
              className="float-left"
              width="20"
              height="20"
              src={awayCrestUrl ?? "placeholder-club-logo.svg"}
              alt="Away team crest" />
            <span className={
              `font-mono ml-2 ${updateableMatchInfo.highlight.away ? 'text-highlight-b' : ''} ${awayTeamWon ? 'font-extrabold' : ''}`
            }>
              {props.matchInfo.awayTeam?.name}
            </span>
            <span className="ml-2">
              <RedCardBox redCardCount={updateableMatchInfo.redCards.awayRedCards} />
            </span>
            {updateableMatchInfo.eventContext.away !== '' &&
              <span title="Event context" className='animate-pulse float-right font-extrabold text-highlight-b mr-5'>
                {updateableMatchInfo.eventContext.away}
              </span>
            }
          </div>
          <div className="basis-1/12">
            <span title="Score at fulltime" className={`font-extrabold ${matchIsLive ? 'text-highlight-b' : 'text-c4'} `}>
              {updateableMatchInfo.fullTimeScore.awayGoals}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function RedCardBox(props: { redCardCount: number }) {
  return (
    <>
      {props.redCardCount === 0 ?
        <></>
        :
        <div className="bg-red-600 w-3 h-4 inline-block text-center rounded-sm">
          <span className="text-sm">
            {props.redCardCount > 1 ? props.redCardCount.toString() : ""}
          </span>
        </div>
      }
    </>
  )
}

function formatFinishedMatchDate(d: Date): string {
  if (d === undefined) return ""
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }
  return d.toLocaleDateString(undefined, options);
}
