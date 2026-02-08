"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "../auth/auth";
import { Board, Column, JobApplication } from "../models";

interface JobApplictionData {
  company: string;
  position: string;
  columnId: string;
  boardId: string;
  location?: string;
  notes?: string;
  salary?: string;
  jobUrl?: string;
  tags?: string[];
  description?: string;
}

export const createJobApplication = async (data: JobApplictionData) => {
  const session = await getSession();

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  const {
    company,
    position,
    columnId,
    boardId,
    location,
    notes,
    salary,
    jobUrl,
    tags,
    description,
  } = data;

  if (!company || !position || !columnId || !boardId) {
    return { error: "Missing required fields" };
  }

  //verify board ownership
  const board = await Board.findOne({
    _id: boardId,
    userId: session.user.id,
  });

  if (!board) {
    return { error: "Board not found" };
  }

  //Verify column belongs to board
  const column = await Column.findOne({
    _id: columnId,
    boardId: boardId,
  });

  if (!column) {
    return { error: "Column not found" };
  }

  const maxOrder = (await JobApplication.findOne({ columnId })
    .sort({ order: -1 })
    .select("order")
    .lean()) as { order: number } | null;

  const jobApplication = await JobApplication.create({
    company,
    position,
    columnId,
    boardId,
    location,
    notes,
    salary,
    jobUrl,
    userId: session.user.id,
    tag: tags || [],
    description,
    status: "applied",
    order: maxOrder ? maxOrder.order + 1 : 0,
  });

  await Column.findByIdAndUpdate(columnId, {
    $push: { jobApplications: jobApplication._id },
  });

  revalidatePath("/dashboard");

  return { data: JSON.parse(JSON.stringify(jobApplication)) };
};

//update the job application
export const updateJobApplication = async (
  id: string,
  update: {
    company?: string;
    position?: string;
    location?: string;
    notes?: string;
    salary?: string;
    jobUrl?: string;
    order?: number;
    columnId?: string;
    tag?: string[];
    description?: string;
  }
) => {
  //get the current user session
  const session = await getSession();
  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  //fetch the job application using the provided id
  const jobApplication = await JobApplication.findById(id);
  if (!jobApplication) {
    return { error: "Job application not found" };
  }

  //check if the logged-in user own the job application
  if (jobApplication.userId !== session.user.id) {
    return { error: "Unauthorized" };
  }

  const { columnId, order, ...otherUpdates } = update;

  const updateToApply: Partial<{
    company: string;
    position: string;
    location: string;
    notes: string;
    salary: string;
    jobUrl: string;
    order: number;
    columnId: string;
    tag: string[];
    description: string;
  }> = otherUpdates;

  //convert the current column id and new column id
  const currentColumnId = jobApplication.columnId.toString();
  const newColumnId = columnId?.toString();

  const isMovingToDifferentColumn =
    newColumnId && newColumnId !== currentColumnId;

  if (isMovingToDifferentColumn) {
    //remove the job application id from the old columns list of job application
    await Column.findByIdAndUpdate(currentColumnId, {
      $pull: { jobApplication: id },
    });

    //find the job application in the target column, execept the one we're moving
    const jobsInTargetColumn = await JobApplication.find({
      columnId: newColumnId,
      _id: { $ne: id },
    })
      .sort({ order: 1 })
      .lean();

    let newOrderValue: number;

    if (order !== undefined && order !== null) {
      newOrderValue = order * 100; //calculate the order value ex: order 0 = 0, order 1 = 100, order 2 = 200

      const jobsThatNeedToShift = jobsInTargetColumn.slice(order); //get all jobs from position where inserted onward
      //loop each job that needs to move down and increase the job order by 100
      for (const job of jobsThatNeedToShift) {
        await JobApplication.findByIdAndUpdate(job._id, {
          $set: { order: job.order + 100 },
        });
      }
    } else {
      if (jobsInTargetColumn.length > 0) {
        const lastJobOrder =
          jobsInTargetColumn[jobsInTargetColumn.length - 1].order || 0; //get the order value of the last job in the coulumn
        newOrderValue = lastJobOrder + 100;
      } else {
        newOrderValue = 0;
      }
    }

    //add the new column id and calculated order value to update
    updateToApply.columnId = newColumnId;
    updateToApply.order = newOrderValue;

    //add the job application id to the new column list
    await Column.findByIdAndUpdate(newColumnId, {
      $push: { jobApplications: id },
    });
  } else if (order !== undefined && order !== null) {
    //get all other jobs in the current column, sorted by order
    const otherJobInColumn = await JobApplication.find({
      columnId: currentColumnId,
      _id: { $ne: id },
    })
      .sort({ order: 1 })
      .lean();

    //get the current order of the job we're moving,
    //and find where this job currently sits. Return the index of the first job
    const currentJobOrder = jobApplication.order || 0;
    const currentPositionIndex = otherJobInColumn.findIndex(
      (job) => job.order > currentJobOrder
    );

    //If no job has a higher order (-1), the job is at the end. Otherwise, use the found index.
    const oldPositionIndex =
      currentPositionIndex === -1
        ? otherJobInColumn.length
        : currentPositionIndex;

    const newOrderValue = order * 100;

    //check if we're moving up(to an earlier position)
    if (order < oldPositionIndex) {
      const jobsToShiftDown = otherJobInColumn.slice(order, oldPositionIndex);

      for (const job of jobsToShiftDown) {
        await JobApplication.findByIdAndUpdate(job._id, {
          $set: { order: job.order + 100 },
        });
      }
      //check if we're moving down(to a later position)
    } else if (order > oldPositionIndex) {
      const jobsToShiftUp = otherJobInColumn.slice(oldPositionIndex, order);

      for (const job of jobsToShiftUp) {
        const newOrder = Math.max(0, job.order - 100);
        await JobApplication.findByIdAndUpdate(job._id, {
          $set: { order: newOrder },
        });
      }
    }

    //add the new order value to our update object
    updateToApply.order = newOrderValue;
  }

  //applies all the update, new: true means return the updated document
  const updated = await JobApplication.findByIdAndUpdate(id, updateToApply, {
    new: true,
  });

  revalidatePath("/dashboard");

  return { data: JSON.parse(JSON.stringify(updated)) };
};

export async function deleteJobApplication(id: string) {
  const session = await getSession();

  if (!session) {
    return { error: "Unauthorized" };
  }

  const jobApplication = await JobApplication.findById(id);

  if (!jobApplication) {
    return { error: "Job Application not found" };
  }

  if (jobApplication.userId !== session.user.id) {
    return { error: "Unauthorized" };
  }

  await Column.findByIdAndUpdate(jobApplication.columnId, {
    $pull: { jobApplication: id },
  });

  await JobApplication.deleteOne({ _id: id });

  revalidatePath("/dashboard");

  return { success: true };
}
