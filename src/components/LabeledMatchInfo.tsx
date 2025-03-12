import { useState } from 'react';
import Image from 'next/image'
import { CompactMatchInfo } from '@/types/Match';
import Link from 'next/link';
import { Socket } from 'socket.io-client';
import SingleMatchInfo from './SingleMatchInfo';
import { KnockoutStage } from '@/types/Competition';

export default function LabeledMatchInfo(props: {
  label: string,
  matches: CompactMatchInfo[],
  globalUpdatesSocket?: Socket | undefined
}) {
  const [matchListVisible, setMatchListVisible] = useState<boolean>(true);

  function toggleMatchListVisibility() {
    setMatchListVisible(prev => !prev);
  }

  function formatLabel(label: string): string {
    if (!isNaN(parseInt(label))) {
      return `League Phase - Round ${label}`;
    } else {
      return `Knockout Phase - ${KnockoutStage.format(label)!}`;
    }
  }

  const formattedLabel = formatLabel(props.label);

  return (
    <>
      <div className="flex flex-row bg-c1 items-center justify-center">
        <div className="mt-2 basis-full">
          <div className="bg-c2 shadow-sm shadow-black">
            <div className="p-3 pl-10">
              <span className="font-extrabold hover:underline text-c4">{formattedLabel}</span>
              <button onClick={toggleMatchListVisibility} className="font-light text-sm flex float-right">
                {matchListVisible ?
                  <Image
                    className="p-1 rounded-md hover:bg-c1"
                    width="30"
                    height="30"
                    src="/chevron-up.svg"
                    title="Hide all grouped"
                    alt="Hide all grouped" />
                  :
                  <Image
                    className="p-1 rounded-md hover:bg-c1"
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
              return <Link key={m.id} href={`/match/${encodeURIComponent(m.id)}`}>
                <SingleMatchInfo key={m.id} matchInfo={m} globalUpdatesSocket={props.globalUpdatesSocket} />
              </Link>
            })}
          </div>
        </div>
      </div >
    </>
  );
}
