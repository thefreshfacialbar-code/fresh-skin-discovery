import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,_#f7efe7_0%,_#f2e8dd_100%)] px-4 py-8 text-stone-700 sm:px-6 lg:px-8">
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl items-center">
        <section className="w-full rounded-[2rem] border border-[#DAD6DB] bg-[#fcf8f2]/95 p-8 shadow-[0_24px_75px_rgba(144,138,155,0.14)] backdrop-blur sm:p-10 lg:p-16">
          <header className="mb-8 flex justify-center">
            <div className="flex h-[256px] w-[256px] items-center justify-center sm:h-[320px] sm:w-[320px] lg:h-[416px] lg:w-[416px]">
              <Image src="/ffb-logo.png" alt="Fresh Facial Bar & Lash Lounge logo" width={1664} height={1664} priority />
            </div>
          </header>

          <div className="mt-10 grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
            <div className="max-w-2xl">
              <p className="text-[0.8rem] font-semibold uppercase tracking-[0.4em] text-[#908A9B] sm:text-sm">
                The Skin Discovery Journey
              </p>
              <h1 className="mt-4 font-serif text-4xl leading-[1.05] text-stone-800 sm:text-5xl lg:text-6xl">
                Every complexion tells a story.
              </h1>

              <p className="mt-6 text-lg leading-8 text-stone-600 sm:text-xl">
                Your Skin Discovery Journey helps uncover what your skin is asking for, so your Skintender can craft a personalized skincare plan designed specifically for you.
              </p>

              <p className="mt-5 max-w-xl text-base leading-8 text-stone-600 sm:text-lg">
                “Freshly crafted for your skin, because no two complexions are alike.”
              </p>

              <div className="mt-8 flex flex-col items-start gap-3">
                <Link
                  href="/discovery"
                  className="inline-flex items-center justify-center rounded-full bg-[#908A9B] px-8 py-4 text-base font-semibold text-white shadow-[0_12px_30px_rgba(144,138,155,0.2)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#7d7688] sm:px-9 sm:py-4.5 sm:text-lg"
                >
                  Begin My Journey
                </Link>
                <p className="max-w-md text-base leading-7 italic text-stone-600 sm:text-lg">
                  Thoughtfully curated. Expertly guided. Uniquely yours.
                </p>
              </div>
            </div>

            <div className="rounded-[1.75rem] border-[1.5px] border-[#DAD6D8] bg-[#fffdf9] p-6 shadow-[0_18px_45px_rgba(144,138,155,0.08)] sm:p-8">
              <div className="text-sm font-semibold uppercase tracking-[0.3em] text-[#908A9B]">
                Your Journey Begins Here
              </div>
              <ul className="mt-5 space-y-3 text-base leading-7 text-stone-600">
                <li>• Personalized by your Skintender</li>
                <li>• Built around your skincare goals</li>
                <li>• No one-size-fits-all routines</li>
                <li>• <span className="font-semibold text-stone-700">Results in about 5 minutes</span></li>
              </ul>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
