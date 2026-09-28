import React from "react";
import { Link } from "wouter";
import AuthGate from "./auth-gate";
import { CreateShell } from "./create-shell";

function BoardsHome() {
  return (
    <CreateShell activeTab="boards">
      <p className="text-[16px] text-[#6C6975] mt-0 mb-6">
        Open a live facilitator board for the Unilever seeded rooms, or go to a session page for a
        client-specific board.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/facilitate"
          className="block bg-white border border-[#E7E4DD] rounded-xl p-6 no-underline text-inherit hover:border-[#301CA0]"
        >
          <div className="text-[20px] font-semibold">Session 1 — Demand</div>
          <p className="text-[15px] text-[#6C6975] mb-0 mt-2">
            The Demand Spike facilitator board
          </p>
        </Link>
        <Link
          href="/facilitate?tab=mart"
          className="block bg-white border border-[#E7E4DD] rounded-xl p-6 no-underline text-inherit hover:border-[#301CA0]"
        >
          <div className="text-[20px] font-semibold">Session 2 — Field</div>
          <p className="text-[15px] text-[#6C6975] mb-0 mt-2">
            A Week in the Field facilitator board
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
