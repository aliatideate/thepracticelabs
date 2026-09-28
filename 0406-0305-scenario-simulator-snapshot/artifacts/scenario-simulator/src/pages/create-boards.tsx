import React from "react";
import { Link } from "wouter";
import AuthGate from "./auth-gate";
import { CreateShell } from "./create-shell";

function BoardsHome() {
  return (
    <CreateShell activeTab="boards">
      <p className="text-[16px] text-[#6C6975] mt-0 mb-6">
        Open a live facilitator board for an exercise room. For a client-specific run, open that
        session from the Clients tab.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/facilitate"
          className="block bg-white border border-[#E7E4DD] rounded-xl p-6 no-underline text-inherit hover:border-[#301CA0]"
        >
          <div className="text-[20px] font-semibold">The Demand Spike</div>
          <p className="text-[15px] text-[#6C6975] mb-0 mt-2">
            Problem-framing facilitator board
          </p>
        </Link>
        <Link
          href="/facilitate?tab=mart"
          className="block bg-white border border-[#E7E4DD] rounded-xl p-6 no-underline text-inherit hover:border-[#301CA0]"
        >
          <div className="text-[20px] font-semibold">A Week in the Field</div>
          <p className="text-[15px] text-[#6C6975] mb-0 mt-2">
            Decision-making facilitator board
          </p>
        </Link>
      </div>
    </CreateShell>
  );
}

export default function CreateBoardsPage() {
  return (
    <AuthGate>
      <BoardsHome />
    </AuthGate>
  );
}
