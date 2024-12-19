import Image from 'next/image';

export default function OwnGoalIcon(props: { ownGoalCounter?: number }) {
  const moreThanOneGoal = (props.ownGoalCounter !== undefined) && (props.ownGoalCounter > 1);
  return (
    <div className="flex items-center justify-center h-6 w-6 bg-black rounded-full border border-white">
      <Image className="h-4 w-4" width="0" height="0" src="../ball-red.svg" alt="Own goal or missed penalty" />
      <div className="absolute">
        {moreThanOneGoal &&
          <span className="relative bg-gray text-white font-bold rounded-full px-1 bottom-3 right-2">
            {props.ownGoalCounter}
          </span>
        }
      </div>
    </div>
  )
}
