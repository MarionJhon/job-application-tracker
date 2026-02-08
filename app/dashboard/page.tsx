import KanbanBoard from "@/components/KanbanBoard";
import { getSession } from "@/lib/auth/auth";
import connectDB from "@/lib/db";
import { Board } from "@/lib/models";
import { Suspense } from "react";

const getBoard = async (userId: string) => {
  "use cache";
  await connectDB();

  const boardDoc = await Board.findOne({
    userId: userId,
    name: "Job Hunt",
  }).populate({
    path: "columns",
    populate: {
      path: "jobApplications",
    },
  });

  if (!boardDoc) return null;

  const board = JSON.parse(JSON.stringify(boardDoc));

  return board;
};

const DasboardWrapper = async () => {
  const session = await getSession();
  const board = await getBoard(session?.user.id ?? "");

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-black">{board.name}</h1>
          <p className="text-gray-600">Track your job application</p>
        </div>
        <KanbanBoard board={board} userId={session?.user.id as string} />
      </div>
    </div>
  );
};

const DashboardPage = async () => {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <DasboardWrapper />
    </Suspense>
  );
};

export default DashboardPage;
