/** BILDSCHIRM „HEUTE“ – folgt im nächsten Schritt. */
export function TodayScreen({ onPlan }: { onPlan: () => void }) {
  return (
    <button type="button" className="btn" onClick={onPlan}>
      Planen
    </button>
  )
}
