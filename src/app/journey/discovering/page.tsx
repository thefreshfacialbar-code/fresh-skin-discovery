import JourneyTransition from "@/components/JourneyTransition";

export default function DiscoveringTransitionPage() {
  return (
    <JourneyTransition
      stage="DISCOVERING"
      freshThought="No two complexions are alike."
      nextRoute="/journey/discovering/question"
    />
  );
}
