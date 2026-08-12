import JourneyTransition from "@/components/JourneyTransition";

export default function JourneyUnderstandingTransitionPage() {
  return (
    <JourneyTransition
      stage="UNDERSTANDING"
      freshThought="Healthy skin starts with understanding."
      nextRoute="/journey/understanding/question"
    />
  );
}
