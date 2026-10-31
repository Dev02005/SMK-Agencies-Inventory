import type { Metadata } from "next";
import { Suspense } from "react";
import { ListSkeleton, SampleChip } from "@/components/ui/blocks";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { getExpenses, getToday } from "@/lib/data";
import { ExpensesList } from "./expenses-list";

export const metadata: Metadata = { title: "Expenses" };

export default function ExpensesPage() {
  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Expenses"
        subtitle="Every rupee spent, by head, with the bill photo"
        actions={
          <>
            <SampleChip />
            <ButtonLink href="/money/expenses/new">New expense</ButtonLink>
          </>
        }
      />
      <Suspense fallback={<ListSkeleton />}>
        <ExpensesData />
      </Suspense>
    </div>
  );
}

async function ExpensesData() {
  return <ExpensesList expenses={await getExpenses()} month={(await getToday()).slice(0, 7)} />;
}
