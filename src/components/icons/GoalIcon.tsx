import Image from 'next/image'

export default function GoalIcon(props: { goalCounter: number }) {
  return (
    <div className="flex items-center justify-center h-6 w-6 bg-black rounded-full border border-white">
      <Image className="h-4 w-4" width="0" height="0" src="../ball-white.svg" alt="goal" />
      <div className="absolute">
        {props.goalCounter > 1 &&
          <span className="relative bg-gray text-white font-bold rounded-full px-1 bottom-3 right-2">
            {props.goalCounter}
          </span>
        }
      </div>
    </div>
  )
}
