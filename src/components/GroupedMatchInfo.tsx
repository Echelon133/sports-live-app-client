import { useState } from 'react';
import Image from 'next/image'
import SingleMatchInfo from './SingleMatchInfo';
import { CompactMatchInfo } from '@/types/Match';
import { Competition } from '@/types/Competition';

interface IProps {
  competitionInfo: Competition,
  matches: CompactMatchInfo[],
}

export default function GroupedMatchInfo(props: IProps) {
  const [matchListVisible, setMatchListVisible] = useState<boolean>(true);
  const competitionLogoUrl = props.competitionInfo.logoUrl;

  function toggleMatchListVisibility() {
    setMatchListVisible(prev => !prev);
  }

  return (
    <>
      <div className="flex flex-row bg-rose-200 items-center justify-center">
        <div className="mt-2 basis-full">
          <div className="bg-rose-300 shadow-sm shadow-black">
            <div className="p-3 pl-10">
              {competitionLogoUrl ?
                <Image className="float-left mr-2" width="20" height="20" src={competitionLogoUrl} alt={props.competitionInfo.name} />
                :
                <Image className="float-left mr-2" width="20" height="20" src="placeholder-competition-logo.svg" alt={props.competitionInfo.name} />
              }
              <a className="font-extrabold hover:underline" href="#">{props.competitionInfo.name}</a>
              <span className="font-extralight text-sm text-gray-500 ml-2">({props.competitionInfo.season})</span>
              <button onClick={toggleMatchListVisibility} className="font-light text-sm flex float-right">
                {matchListVisible ?
                  <Image
                    className="float-left"
                    width="30"
                    height="30"
                    src="chevron-up.svg"
                    title="Hide all grouped"
                    alt="Hide all grouped" />
                  :
                  <Image
                    className="float-left"
                    width="30"
                    height="30"
                    src="chevron-down.svg"
                    title="Show all grouped"
                    alt="Show all grouped" />
                }
              </button>
            </div>
          </div>
          <div className={`${matchListVisible ? "" : "hidden"} `} >
            {props.matches.map(m => {
              return <SingleMatchInfo matchInfo={m} />
            })}
          </div>
        </div>
      </div >
    </>
  );
}
