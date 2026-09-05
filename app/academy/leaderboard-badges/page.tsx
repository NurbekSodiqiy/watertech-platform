import { Medal } from "lucide-react";
import { PageHeader } from "@/components/DocPageTemplate";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { getMockMeta } from "@/lib/site-config";

const leaderboard = [
  { rank: 1, name: "[Placeholder Name]", points: 1240 },
  { rank: 2, name: "[Placeholder Name]", points: 1105 },
  { rank: 3, name: "[Placeholder Name]", points: 980 },
  { rank: 4, name: "[Placeholder Name]", points: 860 },
];

const badges = ["First Deal", "Objection Master", "5-Star Feedback", "Fast Responder", "Top Closer", "Mentor"];

export default function LeaderboardBadgesPage() {
  const meta = getMockMeta("/academy/leaderboard-badges");
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <PageHeader
        path="/academy/leaderboard-badges"
        title="Leaderboard & Badges"
        description="Recognition for performance and milestones."
        meta={meta}
      />

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-soft">
        <table className="w-full min-w-[420px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-border bg-surface-alt/60">
              <th className="px-4 py-2.5 font-semibold text-primary-dark">Rank</th>
              <th className="px-4 py-2.5 font-semibold text-primary-dark">Name</th>
              <th className="px-4 py-2.5 font-semibold text-primary-dark">Points</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((row) => (
              <tr key={row.rank} className="border-b border-border last:border-0">
                <td className="px-4 py-2.5 text-text-secondary">#{row.rank}</td>
                <td className="px-4 py-2.5 text-primary-dark">{row.name}</td>
                <td className="px-4 py-2.5 text-text-secondary">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="mb-2 text-[15px] font-semibold text-primary-dark">Badges</h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {badges.map((b) => (
            <div key={b} className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-surface p-3 text-center shadow-softer">
              <Medal size={20} className="text-primary-light" />
              <span className="text-[11px] text-text-secondary">{b}</span>
            </div>
          ))}
        </div>
      </div>

      <FeedbackWidget />
    </div>
  );
}
