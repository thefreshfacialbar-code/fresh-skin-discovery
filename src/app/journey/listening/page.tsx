import JourneyTransition from "@/components/JourneyTransition";

export default function ListeningTransitionPage() {
  return (
    <JourneyTransition
      stage="LISTENING"
      freshThought="Every journey begins somewhere."
      nextRoute="/journey/listening/question"
    />
  );
}
