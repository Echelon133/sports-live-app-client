import { CardType } from '@/types/MatchEvents';
import Image from 'next/image';

export default function CardIcon(props: { card: CardType }) {
  let cardImageSrc = "";

  switch (props.card) {
    case CardType.YELLOW:
      cardImageSrc = "/../yellow.svg"
      break;
    case CardType.SECOND_YELLOW:
      cardImageSrc = "/../second-yellow.svg"
      break;
    case CardType.DIRECT_RED:
      cardImageSrc = "/../red.svg"
      break;
  }

  return (
    <div className="flex items-center justify-center h-6 w-6 bg-black rounded-full border border-white">
      <Image className="h-3 w-2" width="0" height="0" src={cardImageSrc} alt="Card" />
    </div>
  )
}
