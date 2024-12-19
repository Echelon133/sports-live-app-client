export default function InfoMessage(props: { message: string }) {
  return (
    <div className="flex py-40 justify-center">
      <span className="font-mono text-2xl font-extrabold text-c4">{props.message}</span>
    </div >
  )
}
