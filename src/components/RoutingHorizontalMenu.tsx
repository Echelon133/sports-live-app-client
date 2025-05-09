import Link from "next/link";

export type RoutingMenuConfig = {
  currentlySelected: string,
  allOptions: Map<string, RoutingMenuOption>
};

export type RoutingMenuOption = { name: string, displayedName: string, path: string };

export function createMenuConfig(currentlySelected: string, options: RoutingMenuOption[]): RoutingMenuConfig {
  return {
    currentlySelected: currentlySelected,
    allOptions: new Map(options.map(i => [i.name, i])),
  }
}
export default function RoutingHorizontalMenu(props: {
  menuConfig: RoutingMenuConfig,
}) {

  return (
    <>
      <div className="flex flex-row text-black">
        {Array.from(props.menuConfig.allOptions).map(option => {
          const name = option[0];
          const displayedName = option[1].displayedName;
          const isSelected = name === props.menuConfig.currentlySelected;
          return (
            <Link key={option[1].name} href={option[1].path}>
              <div className={`px-4 py-1 mx-1 ${isSelected ? "bg-c4" : "bg-gray-600 hover:bg-c3"} font-mono font-extrabold rounded-xl`} key={name} >
                {displayedName}
              </div>
            </Link>
          )
        })}
      </div>
    </>
  )
}
