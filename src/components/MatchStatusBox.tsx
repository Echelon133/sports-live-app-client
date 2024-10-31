import { MatchStatus } from "@/types/Match"
import { useEffect, useRef, useState } from "react";

const MINUTE_IN_MILIS = 1000 * 60;

export default function MatchStatusBox(props: {
  currentStatus: MatchStatus,
  startTimeUTC: Date,
  statusLastModifiedUTC: Date | null,
  matchIsLive: boolean,
  textBig?: boolean
}) {

  function shouldDisplayClock(status: MatchStatus): boolean {
    // only show the clock when the ball is in open play (penalty shootout does not count)
    const clockEnable = [
      MatchStatus.FIRST_HALF, MatchStatus.SECOND_HALF, MatchStatus.EXTRA_TIME
    ];
    return clockEnable.includes(status);
  }

  return (
    <div className={`flex flex-col ${props.textBig ? "text-xl" : "text-sm"}`}>
      {shouldDisplayClock(props.currentStatus) ?
        <MatchClock
          currentStatus={props.currentStatus}
          startTimeUTC={props.startTimeUTC}
          statusLastModifiedUTC={props.statusLastModifiedUTC}
        />
        :
        <MatchStatusText
          currentStatus={props.currentStatus}
          startTimeUTC={props.startTimeUTC}
          matchIsLive={props.matchIsLive}
        />
      }
    </div>
  )
}

function MatchStatusText(props: {
  currentStatus: MatchStatus,
  startTimeUTC: Date,
  matchIsLive: boolean
}) {
  const [visibleStatus, setVisibleStatus] = useState<string>("");

  useEffect(() => {
    switch (props.currentStatus) {
      // in case the game is not started, print the hour when the match starts
      case MatchStatus.NOT_STARTED:
        setVisibleStatus(props.startTimeUTC.toTimeString().substring(0, 5));
        break;
      case MatchStatus.HALF_TIME:
      case MatchStatus.FINISHED:
      case MatchStatus.PENALTIES:
      case MatchStatus.POSTPONED:
      case MatchStatus.ABANDONED:
        setVisibleStatus(MatchStatus.format(props.currentStatus)!);
        break;
      // these are included for completeness, but they should not do anything, 
      // since if the status is set to these values, this component should not 
      // be rendered at all - the rendered component must be MatchClock
      case MatchStatus.FIRST_HALF:
      case MatchStatus.SECOND_HALF:
      case MatchStatus.EXTRA_TIME:
        break;
    }
  }, []);

  return (
    <>
      <span className={`${props.matchIsLive ? "text-highlight-b" : ""}`}>
        {visibleStatus}
      </span>
    </>
  )
}

function MatchClock(props: {
  currentStatus: MatchStatus,
  startTimeUTC: Date,
  statusLastModifiedUTC: Date | null,
}) {
  type ClockState = { minute: number, additionalMinute: number };
  const [clockState, setClockState] = useState<ClockState | undefined>(undefined);

  // internal clock of minutes, which gets incremented by 1 every minute by setInterval
  // set while initializing the clock
  const clockMinuteCounter = useRef<number>(1);

  function calculateClockState(currentMinute: number, saturateAt: number): ClockState {
    // After the minute reaches its saturation point, any additional minute needs to be
    // moved into additional time part.
    //
    // Saturation at 45 turns:
    //    - 46th minute into 45+1'
    //    - 49th minute into 45+4'
    //
    // Saturation at 90 turns:
    //    - 94th minute into 90+4'
    //    - 98th minute into 90+8'
    //
    // Saturation at 120 turns:
    //    - 123rd minute into 120+3'
    //    - 125th minute into 120+5'
    let saturatedMinutes;
    let additionalMinutes;
    if (currentMinute > saturateAt) {
      saturatedMinutes = saturateAt;
      additionalMinutes = (currentMinute % saturateAt);
    } else {
      saturatedMinutes = currentMinute;
      additionalMinutes = 0;
    }
    return { minute: saturatedMinutes, additionalMinute: additionalMinutes };
  }

  useEffect(() => {
    if (clockState !== undefined) {
      return;
    }
    initMatchClock();
  }, []);

  function initMatchClock() {
    type MatchClockSetting = { startAt: number, saturateAt: number };
    const clockSettings: Map<MatchStatus, MatchClockSetting> = new Map([
      [MatchStatus.FIRST_HALF, { startAt: 1, saturateAt: 45 }],
      [MatchStatus.SECOND_HALF, { startAt: 45, saturateAt: 90 }],
      [MatchStatus.EXTRA_TIME, { startAt: 90, saturateAt: 120 }]
    ]);

    // At this point statusLastModifiedUTC should NEVER be null, 
    // since this function is only called when the status is in
    // [FIRST_HALF, SECOND_HALF, EXTRA_TIME], which means that the backend
    // should have also set the last modification date of the status.
    // If this value is null, do not initialize the clock state,
    // which is going to display fallback "LIVE" message.
    if (props.statusLastModifiedUTC === null) {
      return;
    }

    // calculate the approximate match clock based on the difference between:
    //    * current date (i.e. now)
    //    * last modification of the match status
    //
    // because:
    //    * first half starts at 1'
    //    * second half starts at 45'
    //    * extra time starts at 90'
    // adding that start time to the calculated difference gives us the final
    // approximation of the match clock
    const nowMiliseconds = (new Date()).getTime();
    const statusLastModifiedMiliseconds = props.statusLastModifiedUTC.getTime();
    const minuteDiff = Math.floor(
      (nowMiliseconds - statusLastModifiedMiliseconds) / 1000 / 60
    );

    const { startAt, saturateAt } = clockSettings.get(props.currentStatus)!;
    const currentMinute = startAt + minuteDiff;

    // initialize the clock state
    clockMinuteCounter.current = currentMinute;
    setClockState(calculateClockState(clockMinuteCounter.current, saturateAt));

    // increment the minute counter by 1 every 60 seconds
    setInterval(
      () => {
        clockMinuteCounter.current += 1;
        setClockState(calculateClockState(clockMinuteCounter.current, saturateAt));
      },
      MINUTE_IN_MILIS
    )
  }

  return (
    <>
      {clockState === undefined ?
        <span className="text-highlight-b">LIVE</span>
        :
        <span className="text-highlight-b">
          {clockState.minute}
          {clockState.additionalMinute !== 0 &&
            <>+{clockState.additionalMinute}</>
          }
          <span className="animate-ping">'</span>
        </span>
      }
    </>
  )
}
