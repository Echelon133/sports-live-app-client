import { Dispatch, SetStateAction } from "react"

export type MenuConfig = {
  currentlySelected: string,
  allOptions: string[]
}

export function createMenuConfig(options: string[]): MenuConfig {
  return {
    currentlySelected: options[0],
    allOptions: options
  }
}
export default function HorizontalMenu(props: {
  menuConfig: MenuConfig,
  setMenuConfig: Dispatch<SetStateAction<MenuConfig>>
}) {

  function pickOption(option: string) {
    props.setMenuConfig(prev => {
      return { ...prev, currentlySelected: option }
    })
  }

  return (
    <>
      <div className="flex text-black">
        <div className="basis-full">
          {props.menuConfig.allOptions.map(option => {
            const isSelected = option === props.menuConfig.currentlySelected;
            return <button
              className={`px-4 py-1 mx-1 ${isSelected ? "bg-c4" : "bg-gray-600 hover:bg-c3"} font-mono font-extrabold rounded-xl`}
              onClick={() => pickOption(option)}
              key={option}
            >{option}</button>
          })}
        </div>
      </div>
    </>
  )
}
