import { Dispatch, RefObject, SetStateAction, useEffect, useRef, useState } from "react";

export default function useHideOnUserEvent(isInitiallyVisible: boolean): [
  // when the user clicks somewhere, things that are NOT at or below this ref are considered "outside"
  // and will set element's visibility to false
  ref: RefObject<HTMLDivElement>,
  isVisible: boolean,
  setIsVisible: Dispatch<SetStateAction<boolean>>
] {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState<boolean>(isInitiallyVisible);

  function hideIfClickedOutside(e: MouseEvent) {
    if (ref.current && !ref.current.contains((e.target as HTMLElement))) {
      setIsVisible(false);
    }
  }

  function hideIfClickedEscape(e: KeyboardEvent) {
    if (e.key === "Escape") {
      setIsVisible(false);
    }
  }

  useEffect(() => {
    document.addEventListener('click', hideIfClickedOutside, true);
    document.addEventListener('keydown', hideIfClickedEscape, true);
    return () => {
      document.removeEventListener('click', hideIfClickedOutside, true);
      document.removeEventListener('keydown', hideIfClickedEscape, true);
    };
  }, []);

  return [ref, isVisible, setIsVisible];
}
