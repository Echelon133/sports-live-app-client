import { useEffect, useState } from 'react';
import Image from 'next/image'
import { CompactMatchInfo, MatchStatus, RedCardInfo, Score } from '@/types/Match';
import { CompetitionInfo } from '@/types/Competition';
import Link from 'next/link';
import { Socket } from 'socket.io-client';
import { GlobalEventSide, GlobalMatchEvent } from '@/types/GlobalMatchEvents';
import { MatchEventType } from '@/types/MatchEvents';

const HIGHLIGHT_TIMEOUT = 15000;

export default function GroupedMatchInfo(props: {
  competitionInfo: CompetitionInfo,
  matches: CompactMatchInfo[],
  globalUpdatesSocket?: Socket | undefined
}) {
  const [matchListVisible, setMatchListVisible] = useState<boolean>(true);
  const competitionLogoUrl = props.competitionInfo.logoUrl;

  function toggleMatchListVisibility() {
    setMatchListVisible(prev => !prev);
  }

  return (
    <>
      <div className="flex flex-row bg-c1 items-center justify-center">
        <div className="mt-2 basis-full">
          <div className="bg-c2 shadow-sm shadow-black">
            <div className="p-3 pl-10">
              <Image
                className="float-left mr-2"
                width="20"
                height="20"
                src={competitionLogoUrl ? competitionLogoUrl : "placeholder-competition-logo.svg"}
                alt={props.competitionInfo.name} />
              <Link href={`/competition/${props.competitionInfo.id}`}>
                <span className="font-extrabold hover:underline text-c4">{props.competitionInfo.name}</span>
              </Link>
              <span className="font-extralight text-sm text-c3 ml-2">({props.competitionInfo.season})</span>
              <button onClick={toggleMatchListVisibility} className="font-light text-sm flex float-right">
                {matchListVisible ?
                  <Image
                    className="float-left"
                    width="30"
                    height="30"
                    src="/chevron-up.svg"
                    title="Hide all grouped"
                    alt="Hide all grouped" />
                  :
                  <Image
                    className="float-left"
                    width="30"
                    height="30"
                    src="/chevron-down.svg"
                    title="Show all grouped"
                    alt="Show all grouped" />
                }
              </button>
            </div>
          </div>
          <div className={`${matchListVisible ? "" : "hidden"} `} >
            {props.matches.length === 0 &&
              <div className="flex flex-row h-14 shadow-sm shadow-gray items-center justify-center">
                <span className="font-extrabold text-xl text-c4">No matches</span>
              </div>
            }
            {props.matches.map(m => {
              return <Link href={`/match/${encodeURIComponent(m.id)}`}>
                <SingleMatchInfo matchInfo={m} globalUpdatesSocket={props.globalUpdatesSocket} />
              </Link>
            })}
          </div>
        </div>
      </div >
    </>
  );
}

type CompactUpdateableMatchInfo = {
  status: MatchStatus,
  fullTimeScore: Score,
  halfTimeScore: Score,
  redCards: RedCardInfo,
  highlight: {
    home: boolean,
    away: boolean
  },
  eventContext: {
    home: string,
    away: string
  }
}

function SingleMatchInfo(props: {
  matchInfo: CompactMatchInfo,
  globalUpdatesSocket?: Socket | undefined
}) {
  // copy already known values as the initial state, which could be updated later 
  // in case there are any updates received via websocket
  const [updateableMatchInfo, setUpdateableMatchInfo] = useState<CompactUpdateableMatchInfo>(
    {
      status: props.matchInfo.status,
      fullTimeScore: props.matchInfo.scoreInfo,
      halfTimeScore: props.matchInfo.halfTimeScoreInfo,
      redCards: props.matchInfo.redCardInfo,
      highlight: { home: false, away: false },
      eventContext: { home: '', away: '' },
    }
  );

  const matchInfo: string = evaluateMatchInfo(
    updateableMatchInfo.status,
    props.matchInfo.startTimeUTC
  );
  const homeCrestUrl: string | undefined = props.matchInfo.homeTeam?.crestUrl;
  const awayCrestUrl: string | undefined = props.matchInfo.awayTeam?.crestUrl;
  const matchIsLive = MatchStatus.isLive(updateableMatchInfo.status);
  const anyHighlight = updateableMatchInfo.highlight.home || updateableMatchInfo.highlight.away;

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

  function updateMatchStatus(targetStatus: MatchStatus) {
    setUpdateableMatchInfo((prev) => {
      const updated = {
        ...prev,
        status: targetStatus,
      };
      return updated;
    })
  }

  function incrementScoreline(homeTeamScored: boolean) {
    const [homeTeamGoalsDelta, awayTeamGoalsDelta] =
      homeTeamScored ? [1, 0] : [0, 1];

    setUpdateableMatchInfo((prev) => {
      const newFullScore: Score = {
        homeGoals: prev.fullTimeScore.homeGoals + homeTeamGoalsDelta,
        awayGoals: prev.fullTimeScore.awayGoals + awayTeamGoalsDelta,
      };

      let halfTimeScore = prev.halfTimeScore;
      // increment halftime scoreline if the goal happened during
      // the first half
      if (prev.status === MatchStatus.FIRST_HALF) {
        halfTimeScore = newFullScore;
      }

      const highlight = { home: homeTeamScored, away: !homeTeamScored };

      const eventContext = {
        home: homeTeamScored ? 'GOAL' : '',
        away: !homeTeamScored ? 'GOAL' : '',
      };

      const updated = {
        ...prev,
        fullTimeScore: newFullScore,
        halfTimeScore: halfTimeScore,
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
            updateMatchStatus(matchEvent.targetStatus)
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
    <div className={`${anyHighlight ? 'bg-highlight-a' : 'bg-c1 hover:bg-c0'} mb-1 flex flex-row shadow-sm shadow-c0 items-center justify-center hover:cursor-pointer`}>
      <div className="basis-2/12 text-center">
        <div className="flex flex-col">
          <span className={`${matchIsLive ? "text-highlight-b" : ""} text-sm`}>{matchInfo}</span>
          {!matchIsLive &&
            <span className="text-gray text-xs">{formatFinishedMatchDate(props.matchInfo.startTimeUTC)}</span>
          }
        </div>
      </div>
      <div className="basis-10/12 flex flex-col">
        <div className="flex pt-2 pb-1">
          <div className="basis-10/12">
            <Image
              className="float-left"
              width="18"
              height="18"
              src={homeCrestUrl ? homeCrestUrl : "placeholder-club-logo.svg"}
              alt="Home team crest" />
            <span className={`font-mono ml-2 ${updateableMatchInfo.highlight.home ? 'text-highlight-b' : ''}`}>
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
          <div className="basis-2/12">
            <span title="Score at fulltime" className={`font-extrabold ${matchIsLive ? 'text-highlight-b' : 'text-c4'} `}>
              {updateableMatchInfo.fullTimeScore.homeGoals}
            </span>
            <span title="Score at halftime" className='font-extralight ml-5 text-gray'>
              {updateableMatchInfo.halfTimeScore.homeGoals}
            </span>
          </div>
        </div>
        <div className="flex pb-2">
          <div className="basis-10/12">
            <Image
              className="float-left"
              width="18"
              height="18"
              src={awayCrestUrl ? awayCrestUrl : "placeholder-club-logo.svg"}
              alt="Away team crest" />
            <span className={`font-mono ml-2 ${updateableMatchInfo.highlight.away ? 'text-highlight-b' : ''}`}>
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
          <div className="basis-2/12">
            <span title="Score at fulltime" className={`font-extrabold ${matchIsLive ? 'text-highlight-b' : 'text-c4'} `}>
              {updateableMatchInfo.fullTimeScore.awayGoals}
            </span>
            <span title="Score at halftime" className="ml-5 text-gray font-extralight">
              {updateableMatchInfo.halfTimeScore.awayGoals}
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
        <div className="bg-red w-3 h-5 inline-block text-center rounded-sm">
          <span className="text-sm">
            {props.redCardCount > 1 ? props.redCardCount.toString() : ""}
          </span>
        </div>
      }
    </>
  )
}

function evaluateMatchInfo(status: MatchStatus, startTimeUTC: Date): string {
  let matchInfo = "";
  switch (status) {
    case MatchStatus.NOT_STARTED:
      // convert UTC to local time
      matchInfo = startTimeUTC.toTimeString().substring(0, 5);
      break;
    case MatchStatus.FIRST_HALF:
    case MatchStatus.SECOND_HALF:
    case MatchStatus.EXTRA_TIME:
    case MatchStatus.PENALTIES:
      matchInfo = "Live";
      break;
    case MatchStatus.HALF_TIME:
      matchInfo = "HT";
      break;
    case MatchStatus.FINISHED:
      matchInfo = "Finished";
      break;
    case MatchStatus.POSTPONED:
      matchInfo = "Postponed";
      break;
    case MatchStatus.ABANDONED:
      matchInfo = "Abandoned";
      break;
  }
  return matchInfo;
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
