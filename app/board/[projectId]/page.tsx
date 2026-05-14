import KanbanBoard from "@/app/components/KanbanBoard";

export default async function BoardPage({ params }: { params: Promise<{ projectId: string }> }) {
  const resolvedParams = await params;
  return (
    <main>
      <KanbanBoard projectId={Number(resolvedParams.projectId)} />
    </main>
  );
}
